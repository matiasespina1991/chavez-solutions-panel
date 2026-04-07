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
  value.length > max ? value.slice(0, max) : value;

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
  return lines.slice(0, maxLines);
};

const buildPreviewPdfBuffer = (payload: ProformaPreviewPayload): Buffer => {
  const pageWidth = 612; // letter
  const pageHeight = 792;
  const marginX = 42;
  const contentWidth = pageWidth - marginX * 2;

  const createOps = () => {
    const ops: string[] = [];
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
    return { ops, drawText, drawRect, drawLine };
  };

  const page1 = createOps();
  const titleY = pageHeight - 34;
  page1.drawText('Resumen de proforma', marginX, titleY, 21, 'F2');
  page1.drawText(`Referencia: ${payload.reference || '-'}`, marginX, titleY - 26, 13, 'F2');

  const blocksTopY = pageHeight - 72;
  const blockHeight = 124;
  const blockGap = 12;
  const blockWidth = (contentWidth - blockGap) / 2;
  const leftBlockX = marginX;
  const rightBlockX = marginX + blockWidth + blockGap;
  const blockY = blocksTopY - blockHeight;

  page1.drawRect(leftBlockX, blockY, blockWidth, blockHeight);
  page1.drawRect(rightBlockX, blockY, blockWidth, blockHeight);

  page1.drawText('Datos Del Cliente', leftBlockX + 12, blocksTopY - 20, 11, 'F2');
  const clientRows: string[] = [
    `Razon Social: ${payload.client.businessName || '-'}`,
    `RUC: ${payload.client.taxId || '-'}`,
    `Nombre De Contacto: ${payload.client.contactName || '-'}`,
    `Direccion: ${payload.client.address || '-'}`,
    `Correo: ${payload.client.email || '-'}`,
    `Telefono: ${payload.client.phone || '-'}`,
    `Celular: ${payload.client.mobile || payload.client.phone || '-'}`
  ];
  clientRows.forEach((row, index) => {
    page1.drawText(truncate(row, 49), leftBlockX + 12, blocksTopY - 38 - index * 14, 9.5);
  });

  page1.drawText('Datos De Proforma', rightBlockX + 12, blocksTopY - 20, 11, 'F2');
  const matrixText = payload.matrixLabels.length ? payload.matrixLabels.join(', ') : '-';
  const metadataRows = [
    `Referencia: ${payload.reference || '-'}`,
    `Fecha De Emision: ${payload.issuedAtLabel || '-'}`,
    `Validez De Oferta: ${payload.validDays ?? '-'} dias`,
    `Valida Hasta: ${payload.validUntilLabel || '-'}`,
    `Matrices: ${truncate(matrixText, 36)}`
  ];
  metadataRows.forEach((row, index) => {
    page1.drawText(
      row,
      rightBlockX + 12,
      blocksTopY - 38 - index * 18,
      10,
      index === 0 ? 'F2' : 'F1'
    );
  });

  const tableTop = blockY - 14;
  const tableHeight = 188;
  const tableY = tableTop - tableHeight;
  page1.drawText('Detalle de costos por analisis', marginX + 12, tableTop - 20, 15, 'F2');

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
    page1.drawText(header, colX[index] + 3, headerY, 9.2, 'F2');
  });

  page1.drawLine(marginX + 8, headerY - 7, marginX + contentWidth - 8, headerY - 7);
  for (let i = 1; i < colX.length - 2; i += 1) {
    page1.drawLine(colX[i], tableY + 12, colX[i], headerY + 10);
  }

  const tableRowStep = 24;
  const tableStartY = headerY - 19;
  const tableEndY = tableY + 56;
  const maxRows = Math.max(1, Math.floor((tableStartY - tableEndY) / tableRowStep));
  let rowY = tableStartY;

  payload.services.slice(0, maxRows).forEach((service) => {
    page1.drawText(String(service.quantity || 0), colX[0] + 3, rowY, 9.2);
    const parameterLines = wrapText(service.label || 'Servicio', 22, 2);
    parameterLines.forEach((line, index) => {
      page1.drawText(line, colX[1] + 3, rowY - index * 10, 9.2);
    });
    page1.drawText(truncate(service.unit || '-', 8), colX[2] + 3, rowY, 9.2);
    page1.drawText(truncate(service.method || '-', 17), colX[3] + 3, rowY, 9.2);
    page1.drawText(truncate(service.rangeOffered || '-', 13), colX[4] + 3, rowY, 9.2);
    page1.drawText(formatMoney(service.unitPrice), colX[5] + 3, rowY, 9.2);
    page1.drawText(formatMoney(service.discountAmount), colX[6] + 3, rowY, 9.2);
    page1.drawText(formatMoney(service.subtotal), colX[7] + 3, rowY, 9.2);
    page1.drawLine(marginX + 8, rowY - 5, marginX + contentWidth - 8, rowY - 5);
    rowY -= tableRowStep;
  });

  if (payload.services.length > maxRows) {
    page1.drawText(`Y ${payload.services.length - maxRows} servicios mas`, colX[1] + 3, rowY, 9);
  }

  const totalsBoxX = marginX + 12;
  const totalsBoxY = tableY - 114;
  const totalsBoxW = 230;
  const totalsBoxH = 96;
  page1.drawText('Costos estimados', totalsBoxX + 10, totalsBoxY + totalsBoxH - 22, 12.5, 'F2');
  page1.drawText('Subtotal:', totalsBoxX + 10, totalsBoxY + totalsBoxH - 44, 11);
  page1.drawText(formatMoney(payload.pricing.subtotal), totalsBoxX + 132, totalsBoxY + totalsBoxH - 44, 11);
  page1.drawText(`IVA (${payload.pricing.taxPercent}%):`, totalsBoxX + 10, totalsBoxY + totalsBoxH - 64, 11);
  page1.drawText(
    formatMoney((payload.pricing.subtotal * payload.pricing.taxPercent) / 100),
    totalsBoxX + 132,
    totalsBoxY + totalsBoxH - 64,
    11
  );
  page1.drawLine(totalsBoxX + 10, totalsBoxY + totalsBoxH - 76, totalsBoxX + totalsBoxW - 10, totalsBoxY + totalsBoxH - 76);
  page1.drawText('Total:', totalsBoxX + 10, totalsBoxY + totalsBoxH - 94, 17, 'F2');
  page1.drawText(formatMoney(payload.pricing.total), totalsBoxX + 132, totalsBoxY + totalsBoxH - 94, 17, 'F2');

  const page2 = createOps();
  const page2TitleY = pageHeight - 34;
  page2.drawText('Condiciones de la proforma', marginX, page2TitleY, 20, 'F2');
  page2.drawText(`Referencia: ${payload.reference || '-'}`, marginX, page2TitleY - 24, 12, 'F2');

  let legalY = page2TitleY - 56;
  page2.drawText('Leyenda de acreditacion:', marginX, legalY, 11, 'F2');
  legalY -= 14;
  [
    '* Parametro acreditado',
    '(*) Parametro no acreditado',
    '0 Parametro subcontratado no acreditado',
    '** Parametro subcontratado acreditado (fuera del alcance de acreditacion)'
  ].forEach((line) => {
    page2.drawText(line, marginX + 8, legalY, 10);
    legalY -= 13;
  });

  legalY -= 4;
  page2.drawText('Forma de Pago:', marginX, legalY, 11, 'F2');
  wrapText(
    '50% anticipo y 50% contra entrega de informes. Pagos por transferencia bancaria.',
    90,
    2
  ).forEach((line, index) => {
    page2.drawText(line, marginX + 92, legalY - index * 12, 10);
  });

  legalY -= 30;
  page2.drawText('Tiempo de Entrega de Resultados:', marginX, legalY, 11, 'F2');
  wrapText(
    '8 dias laborables para parametros acreditados y 15 dias para subcontratados, contados desde la entrega del informe digital.',
    78,
    3
  ).forEach((line, index) => {
    page2.drawText(line, marginX + 176, legalY - index * 12, 10);
  });

  legalY -= 46;
  page2.drawText('Notas:', marginX, legalY, 11, 'F2');
  const notesLines = [
    '- Cronogramas de ejecucion definidos de mutuo acuerdo. Cambios de fecha pueden generar costos adicionales.',
    '- Suspensiones en sitio programado podran facturar costo de STAND BY.',
    '- Los tiempos estimados buscan una ejecucion profesional y eficiente.',
    '- La informacion recibida para ejecucion se considera confidencial y de uso interno del laboratorio.',
    '- En caso de requerir evaluaciones adicionales, se informaran costos complementarios antes de ejecutar.'
  ];
  notesLines.forEach((line) => {
    const wrapped = wrapText(line, 104, 2);
    wrapped.forEach((w, index) => {
      page2.drawText(w, marginX + 8, legalY - 14 - index * 11, 9.8);
    });
    legalY -= wrapped.length * 11 + 10;
  });

  const textOpsPage1 = page1.ops.join('\n');
  const textOpsPage2 = page2.ops.join('\n');

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 7 0 R /F2 8 0 R >> >> >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 7 0 R /F2 8 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(textOpsPage1, 'utf8')} >>\nstream\n${textOpsPage1}\nendstream`,
    `<< /Length ${Buffer.byteLength(textOpsPage2, 'utf8')} >>\nstream\n${textOpsPage2}\nendstream`,
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
