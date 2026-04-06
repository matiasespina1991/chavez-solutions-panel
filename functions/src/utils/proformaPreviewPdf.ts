import admin from 'firebase-admin';
import { ensureTokenDownloadURL } from './storage.js';

interface ProformaPreviewClient {
  businessName: string;
  taxId: string;
  contactName: string;
  address: string;
  city: string;
  email: string;
  phone: string;
  mobile?: string;
}

interface ProformaPreviewServiceLine {
  label: string;
  unit: string;
  method: string;
  rangeOffered: string;
  quantity: number;
  unitPrice: number | null;
  discountAmount: number | null;
  subtotal: number | null;
}

export interface ProformaPreviewPayload {
  reference: string;
  matrixLabels: string[];
  validDays: number | null;
  issuedAtLabel: string;
  validUntilLabel: string;
  client: ProformaPreviewClient;
  services: ProformaPreviewServiceLine[];
  pricing: {
    subtotal: number;
    taxPercent: number;
    total: number;
  };
}

const sanitizeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return 0;
};

export const sanitizeProformaPreviewPayload = (
  payload: Partial<ProformaPreviewPayload> | undefined
): ProformaPreviewPayload => {
  const next = payload ?? {};

  return {
    reference: String(next.reference || '').trim(),
    matrixLabels: Array.isArray(next.matrixLabels)
      ? next.matrixLabels
          .map((entry) => String(entry || '').trim())
          .filter((entry) => entry.length > 0)
      : [],
    validDays:
      typeof next.validDays === 'number' && Number.isFinite(next.validDays)
        ? next.validDays
        : null,
    issuedAtLabel: String(next.issuedAtLabel || '').trim(),
    validUntilLabel: String(next.validUntilLabel || '').trim(),
    client: {
      businessName: String(next.client?.businessName || '').trim(),
      taxId: String(next.client?.taxId || '').trim(),
      contactName: String(next.client?.contactName || '').trim(),
      address: String(next.client?.address || '').trim(),
      city: String(next.client?.city || '').trim(),
      email: String(next.client?.email || '').trim(),
      phone: String(next.client?.phone || '').trim(),
      mobile: String(next.client?.mobile || '').trim()
    },
    services: Array.isArray(next.services)
      ? next.services.slice(0, 30).map((service) => ({
          label: String(service.label || '').trim(),
          unit: String(service.unit || '').trim(),
          method: String(service.method || '').trim(),
          rangeOffered: String(service.rangeOffered || '').trim(),
          quantity: Math.max(0, Math.floor(sanitizeNumber(service.quantity))),
          unitPrice:
            typeof service.unitPrice === 'number' && Number.isFinite(service.unitPrice)
              ? service.unitPrice
              : null,
          discountAmount:
            typeof service.discountAmount === 'number' &&
            Number.isFinite(service.discountAmount)
              ? service.discountAmount
              : null,
          subtotal:
            typeof service.subtotal === 'number' && Number.isFinite(service.subtotal)
              ? service.subtotal
              : null
        }))
      : [],
    pricing: {
      subtotal: sanitizeNumber(next.pricing?.subtotal),
      taxPercent: sanitizeNumber(next.pricing?.taxPercent),
      total: sanitizeNumber(next.pricing?.total)
    }
  };
};

const escapePdfText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ');

const toPdfSafeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ');

const formatMoney = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return `$${value.toFixed(2)}`;
};

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1)}...` : value;

const wrapText = (text: string, maxCharsPerLine: number, maxLines: number) => {
  const words = toPdfSafeText(text).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ['-'];

  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length > maxLines) return lines.slice(0, maxLines);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = truncate(lines[maxLines - 1], maxCharsPerLine - 1) + '...';
  }
  return lines;
};

const buildPreviewPdfBuffer = (payload: ProformaPreviewPayload): Buffer => {
  const ops: string[] = [];
  const pageWidth = 612; // letter
  const pageHeight = 792;
  const marginX = 42;
  const contentWidth = pageWidth - marginX * 2;

  const drawText = (
    text: string,
    x: number,
    y: number,
    size = 11,
    font: 'F1' | 'F2' = 'F1'
  ) => {
    ops.push('BT');
    ops.push(`/${font} ${size} Tf`);
    ops.push(`${x} ${y} Td`);
    ops.push(`(${escapePdfText(toPdfSafeText(text))}) Tj`);
    ops.push('ET');
  };

  const drawRect = (x: number, y: number, w: number, h: number) => {
    ops.push(`${x} ${y} ${w} ${h} re S`);
  };

  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    ops.push(`${x1} ${y1} m ${x2} ${y2} l S`);
  };

  const titleY = pageHeight - 34;
  drawText('Resumen de proforma', marginX, titleY, 21, 'F2');
  drawText(`Referencia: ${payload.reference || '-'}`, marginX, titleY - 26, 13, 'F2');
  const blocksTopY = pageHeight - 72;
  const blockHeight = 124;
  const blockGap = 12;
  const blockWidth = (contentWidth - blockGap) / 2;
  const leftBlockX = marginX;
  const rightBlockX = marginX + blockWidth + blockGap;
  const blockY = blocksTopY - blockHeight;

  drawRect(leftBlockX, blockY, blockWidth, blockHeight);
  drawRect(rightBlockX, blockY, blockWidth, blockHeight);

  drawText('DATOS DEL CLIENTE', leftBlockX + 12, blocksTopY - 20, 11, 'F2');
  const clientRows: string[] = [
    `RAZON SOCIAL: ${payload.client.businessName || '-'}`,
    `RUC: ${payload.client.taxId || '-'}`,
    `NOMBRE DE CONTACTO: ${payload.client.contactName || '-'}`,
    `DIRECCION: ${payload.client.address || '-'}`,
    `CORREO: ${payload.client.email || '-'}`,
    `TELEFONO: ${payload.client.phone || '-'}`,
    `CELULAR: ${payload.client.mobile || payload.client.phone || '-'}`
  ];
  clientRows.forEach((row, index) => {
    drawText(truncate(row, 49), leftBlockX + 12, blocksTopY - 38 - index * 14, 9.5);
  });

  drawText('DATOS DE PROFORMA', rightBlockX + 12, blocksTopY - 20, 11, 'F2');
  const matrixText = payload.matrixLabels.length ? payload.matrixLabels.join(', ') : '-';
  const metadataRows = [
    `REFERENCIA: ${payload.reference || '-'}`,
    `FECHA DE EMISION: ${payload.issuedAtLabel || '-'}`,
    `VALIDEZ DE OFERTA: ${payload.validDays ?? '-'} dias`,
    `VALIDA HASTA: ${payload.validUntilLabel || '-'}`,
    `MATRICES: ${truncate(matrixText, 36)}`
  ];
  metadataRows.forEach((row, index) => {
    drawText(row, rightBlockX + 12, blocksTopY - 38 - index * 18, 10, index === 0 ? 'F2' : 'F1');
  });

  const tableTop = blockY - 14;
  const tableHeight = 226;
  const tableY = tableTop - tableHeight;
  drawRect(marginX, tableY, contentWidth, tableHeight);
  drawText('Detalle de costos por analisis', marginX + 12, tableTop - 20, 15, 'F2');

  const colStart = marginX + 10;
  const colWidths = [42, 108, 52, 102, 72, 56, 48, 48];
  const colX: number[] = [colStart];
  colWidths.forEach((width, index) => {
    colX[index + 1] = colX[index] + width;
  });
  const headerY = tableTop - 40;

  const headers = [
    'Cant.',
    'Parametro',
    'Unidad',
    'Metodo',
    'Rango',
    'C. unit.',
    'Desc.',
    'Subtotal'
  ];
  headers.forEach((header, index) => {
    drawText(header, colX[index] + 3, headerY, 9.2, 'F2');
  });

  drawLine(marginX + 8, headerY - 7, marginX + contentWidth - 8, headerY - 7);
  colX.forEach((x) => {
    drawLine(x, tableY + 12, x, headerY + 10);
  });
  drawLine(marginX + contentWidth - 8, tableY + 12, marginX + contentWidth - 8, headerY + 10);

  const tableRowStep = 16;
  const tableStartY = headerY - 19;
  const tableEndY = tableY + 50;
  const maxRows = Math.max(1, Math.floor((tableStartY - tableEndY) / tableRowStep));
  let rowY = tableStartY;

  payload.services.slice(0, maxRows).forEach((service) => {
    drawText(String(service.quantity || 0), colX[0] + 3, rowY, 9.2);
    drawText(truncate(service.label || 'Servicio', 22), colX[1] + 3, rowY, 9.2);
    drawText(truncate(service.unit || '-', 8), colX[2] + 3, rowY, 9.2);
    drawText(truncate(service.method || '-', 17), colX[3] + 3, rowY, 9.2);
    drawText(truncate(service.rangeOffered || '-', 13), colX[4] + 3, rowY, 9.2);
    drawText(formatMoney(service.unitPrice), colX[5] + 3, rowY, 9.2);
    drawText(formatMoney(service.discountAmount), colX[6] + 3, rowY, 9.2);
    drawText(formatMoney(service.subtotal), colX[7] + 3, rowY, 9.2);
    drawLine(marginX + 8, rowY - 5, marginX + contentWidth - 8, rowY - 5);
    rowY -= tableRowStep;
  });

  if (payload.services.length > maxRows) {
    drawText(
      `... y ${payload.services.length - maxRows} servicios mas`,
      colX[1] + 3,
      rowY,
      9
    );
  }

  const totalsY = tableY + 30;
  drawText('Subtotal', marginX + contentWidth - 182, totalsY + 16, 10, 'F2');
  drawText(formatMoney(payload.pricing.subtotal), marginX + contentWidth - 70, totalsY + 16, 10);
  drawText(`IVA ${payload.pricing.taxPercent}%`, marginX + contentWidth - 182, totalsY, 10, 'F2');
  drawText(
    formatMoney((payload.pricing.subtotal * payload.pricing.taxPercent) / 100),
    marginX + contentWidth - 70,
    totalsY,
    10
  );
  drawText('Total', marginX + contentWidth - 182, totalsY - 18, 11.5, 'F2');
  drawText(formatMoney(payload.pricing.total), marginX + contentWidth - 70, totalsY - 18, 11.5, 'F2');

  let legalY = tableY - 16;
  drawText('Leyenda de acreditacion:', marginX, legalY, 10, 'F2');
  legalY -= 12;
  [
    '* Parametro acreditado',
    '(*) Parametro no acreditado',
    '0 Parametro subcontratado no acreditado',
    '** Parametro subcontratado acreditado (fuera del alcance de acreditacion)'
  ].forEach((line) => {
    drawText(line, marginX + 6, legalY, 8.7);
    legalY -= 10;
  });

  legalY -= 4;
  drawText('Forma de Pago:', marginX, legalY, 10, 'F2');
  drawText(
    '50% anticipo y 50% contra entrega de informes. Pagos por transferencia bancaria.',
    marginX + 70,
    legalY,
    8.6
  );

  legalY -= 14;
  drawText('Tiempo de Entrega de Resultados:', marginX, legalY, 10, 'F2');
  wrapText(
    '8 dias laborables para parametros acreditados y 15 dias para subcontratados, contados desde la entrega del informe digital.',
    97,
    2
  ).forEach((line, index) => {
    drawText(line, marginX + 142, legalY - index * 10, 8.4);
  });

  legalY -= 26;
  drawText('Notas:', marginX, legalY, 10, 'F2');
  const notesLines = [
    '- Cronogramas de ejecucion definidos de mutuo acuerdo. Cambios de fecha pueden generar costos adicionales.',
    '- Suspensiones en sitio programado podran facturar costo de STAND BY.',
    '- Los tiempos estimados buscan una ejecucion profesional y eficiente.',
    '- La informacion recibida para ejecucion se considera confidencial y de uso interno del laboratorio.',
    '- En caso de requerir evaluaciones adicionales, se informaran costos complementarios antes de ejecutar.'
  ];
  notesLines.forEach((line) => {
    wrapText(line, 104, 2).forEach((wrapped, index) => {
      drawText(wrapped, marginX + 6, legalY - 12 - index * 9, 8.2);
    });
    legalY -= 22;
  });

  const textOps = ops.join('\n');

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(textOps, 'utf8')} >>\nstream\n${textOps}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  objects.forEach((obj, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
};

export const generateAndStoreProformaPreviewPdf = async (params: {
  uid: string;
  payload: ProformaPreviewPayload;
}): Promise<{ storagePath: string; downloadURL: string; fileName: string }> => {
  const safeReference = (params.payload.reference || 'sin-referencia')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .slice(0, 60);
  const fileName = `proforma-preview-${safeReference}.pdf`;
  const storagePath = `generated/proforma-previews/${params.uid}/${Date.now()}-${fileName}`;

  const buffer = buildPreviewPdfBuffer(params.payload);

  const bucket = admin.storage().bucket();
  await bucket.file(storagePath).save(buffer, {
    resumable: false,
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'private, max-age=0, no-transform'
    }
  });

  const downloadURL = await ensureTokenDownloadURL(storagePath);
  return { storagePath, downloadURL, fileName };
};
