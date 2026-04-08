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
    .replace(/[^\x20-\xFF]/g, ' ');

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

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildProformaPreviewHtml = (payload: ProformaPreviewPayload): string => {
  const taxAmount = (payload.pricing.subtotal * payload.pricing.taxPercent) / 100;
  const serviceRows = payload.services
    .map(
      (service) => `
      <tr>
        <td>${service.quantity || 0}</td>
        <td>${escapeHtml(service.label || 'Servicio')}</td>
        <td>${escapeHtml(service.unit || '-')}</td>
        <td>${escapeHtml(service.method || '-')}</td>
        <td>${escapeHtml(service.rangeOffered || '-')}</td>
        <td>${formatMoney(service.unitPrice)}</td>
        <td>${formatMoney(service.discountAmount)}</td>
        <td>${formatMoney(service.subtotal)}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 28px;
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
      line-height: 1.35;
    }
    h1 { margin: 0; font-size: 42px; }
    h2 { margin: 0; font-size: 18px; }
    .ref { margin-top: 8px; font-weight: 700; font-size: 21px; }
    .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
    .card { border: 1px solid #111; padding: 10px 12px; }
    .card h3 { margin: 0 0 8px; font-size: 16px; }
    .card p { margin: 3px 0; font-size: 14px; }
    .section { margin-top: 16px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 10px; }
    th, td {
      border-bottom: 1px solid #111;
      padding: 6px;
      text-align: left;
      vertical-align: top;
      white-space: normal;
      word-break: break-word;
      overflow-wrap: anywhere;
      font-size: 14px;
    }
    th { font-weight: 700; }
    th.nowrap { white-space: nowrap; }
    .totals { margin-top: 20px; width: 300px; }
    .totals h3 { margin: 0 0 8px; font-size: 22px; }
    .totals .row { display: flex; justify-content: space-between; font-size: 18px; margin: 2px 0; }
    .totals .total { border-top: 1px solid #111; margin-top: 8px; padding-top: 6px; font-size: 34px; font-weight: 700; display: flex; justify-content: space-between; }
    .break { break-before: page; page-break-before: always; }
    .legal h2 { margin-bottom: 10px; }
    .legal h4 { margin: 14px 0 6px; font-size: 14px; }
    .legal p, .legal li { font-size: 12px; margin: 4px 0; }
    ul { margin: 8px 0 0 18px; padding: 0; }
  </style>
</head>
<body>
  <h2>Resumen de proforma</h2>
  <div class="ref">Referencia: ${escapeHtml(payload.reference || '-')}</div>

  <div class="cards">
    <div class="card">
      <h3>Datos del cliente</h3>
      <p>Razon social: ${escapeHtml(payload.client.businessName || '-')}</p>
      <p>RUC: ${escapeHtml(payload.client.taxId || '-')}</p>
      <p>Nombre de contacto: ${escapeHtml(payload.client.contactName || '-')}</p>
      <p>Direccion: ${escapeHtml(payload.client.address || '-')}</p>
      <p>Correo: ${escapeHtml(payload.client.email || '-')}</p>
      <p>Telefono: ${escapeHtml(payload.client.phone || '-')}</p>
      <p>Celular: ${escapeHtml(payload.client.mobile || payload.client.phone || '-')}</p>
    </div>
    <div class="card">
      <h3>Datos de proforma</h3>
      <p><b>Referencia:</b> ${escapeHtml(payload.reference || '-')}</p>
      <p>Fecha de emision: ${escapeHtml(payload.issuedAtLabel || '-')}</p>
      <p>Validez de oferta: ${escapeHtml(String(payload.validDays ?? '-'))} dias</p>
      <p>Valida hasta: ${escapeHtml(payload.validUntilLabel || '-')}</p>
      <p>Matrices: ${escapeHtml(payload.matrixLabels.length ? payload.matrixLabels.join(', ') : '-')}</p>
    </div>
  </div>

  <div class="section">
    <h2>Detalle de costos por analisis</h2>
    <table>
      <thead>
        <tr>
          <th class="nowrap" style="width:8%">Cant.</th>
          <th style="width:20%">Parametro</th>
          <th style="width:10%">Unidad</th>
          <th style="width:18%">Metodo</th>
          <th style="width:14%">Rango</th>
          <th style="width:11%">C. unit.</th>
          <th style="width:8%">Desc.</th>
          <th class="nowrap" style="width:11%">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${serviceRows || '<tr><td colspan="8">Sin servicios</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="totals">
    <h3>Costos estimados</h3>
    <div class="row"><span>Subtotal:</span><span>${formatMoney(payload.pricing.subtotal)}</span></div>
    <div class="row"><span>IVA (${payload.pricing.taxPercent}%):</span><span>${formatMoney(taxAmount)}</span></div>
    <div class="total"><span>Total:</span><span>${formatMoney(payload.pricing.total)}</span></div>
  </div>

  <div class="break legal">
    <h2>Condiciones de la proforma</h2>
    <h4>Leyenda de acreditacion:</h4>
    <p>* Parametro acreditado</p>
    <p>(*) Parametro no acreditado</p>
    <p>0 Parametro subcontratado no acreditado</p>
    <p>** Parametro subcontratado acreditado (fuera del alcance de acreditacion)</p>

    <h4>Forma de Pago:</h4>
    <p>50% anticipo y 50% contra entrega de informes. Pagos por transferencia bancaria.</p>

    <h4>Tiempo de Entrega de Resultados:</h4>
    <p>8 dias laborables para parametros acreditados y 15 dias para subcontratados, contados desde la entrega del informe digital.</p>

    <h4>Notas:</h4>
    <ul>
      <li>Cronogramas de ejecucion definidos de mutuo acuerdo. Cambios de fecha pueden generar costos adicionales.</li>
      <li>Suspensiones en sitio programado podran facturar costo de STAND BY.</li>
      <li>Los tiempos estimados buscan una ejecucion profesional y eficiente.</li>
      <li>La informacion recibida para ejecucion se considera confidencial y de uso interno del laboratorio.</li>
      <li>En caso de requerir evaluaciones adicionales, se informaran costos complementarios antes de ejecutar.</li>
    </ul>
  </div>
</body>
</html>`;
};

const tryRenderPdfWithPuppeteerInFunction = async (
  payload: ProformaPreviewPayload
): Promise<Buffer | null> => {
  try {
    const dynamicImport = new Function(
      'moduleName',
      'return import(moduleName)'
    ) as (moduleName: string) => Promise<any>;
    const puppeteerModule = await dynamicImport('puppeteer');
    const puppeteer = puppeteerModule?.default ?? puppeteerModule;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(buildProformaPreviewHtml(payload), {
      waitUntil: 'networkidle0'
    });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });
    await browser.close();

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('Error rendering PDF with puppeteer in Cloud Function:', error);
    return null;
  }
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

  page1.drawText('Datos del cliente', leftBlockX + 12, blocksTopY - 20, 11, 'F2');
  const clientRows: string[] = [
    `Razón social: ${payload.client.businessName || '-'}`,
    `RUC: ${payload.client.taxId || '-'}`,
    `Nombre de contacto: ${payload.client.contactName || '-'}`,
    `Dirección: ${payload.client.address || '-'}`,
    `Correo: ${payload.client.email || '-'}`,
    `Teléfono: ${payload.client.phone || '-'}`,
    `Celular: ${payload.client.mobile || payload.client.phone || '-'}`
  ];
  clientRows.forEach((row, index) => {
    page1.drawText(truncate(row, 49), leftBlockX + 12, blocksTopY - 38 - index * 14, 9.5);
  });

  page1.drawText('Datos de proforma', rightBlockX + 12, blocksTopY - 20, 11, 'F2');
  const matrixText = payload.matrixLabels.length ? payload.matrixLabels.join(', ') : '-';
  const metadataRows = [
    `Referencia: ${payload.reference || '-'}`,
    `Fecha de emisión: ${payload.issuedAtLabel || '-'}`,
    `Validez de oferta: ${payload.validDays ?? '-'} días`,
    `Válida hasta: ${payload.validUntilLabel || '-'}`,
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
  page1.drawText('Detalle de costos por análisis', marginX + 12, tableTop - 20, 15, 'F2');

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
    'Método',
    'Rango',
    'C. unit.',
    'Desc.',
    'Subtotal'
  ];
  headers.forEach((header, index) => {
    page1.drawText(header, colX[index] + 3, headerY, 9.2, 'F2');
  });

  const tableLeft = marginX + 8;
  const tableRight = marginX + contentWidth - 8;
  const tableTopBorderY = headerY + 10;
  const rowHeight = 24;
  const dataRows = payload.services.length > 0 ? payload.services : [];
  const maxRows = Math.max(1, Math.min(8, dataRows.length || 1));
  const renderedRows = dataRows.slice(0, maxRows);
  const tableBottomY = headerY - 7 - rowHeight * maxRows;

  // Outer border (4 sides)
  page1.drawLine(tableLeft, tableTopBorderY, tableRight, tableTopBorderY);
  page1.drawLine(tableLeft, tableTopBorderY, tableLeft, tableBottomY);
  page1.drawLine(tableRight, tableTopBorderY, tableRight, tableBottomY);
  page1.drawLine(tableLeft, tableBottomY, tableRight, tableBottomY);

  // Header separator
  page1.drawLine(tableLeft, headerY - 7, tableRight, headerY - 7);

  // Inner vertical lines only up to table bottom
  for (let i = 1; i < colX.length; i += 1) {
    page1.drawLine(colX[i], tableTopBorderY, colX[i], tableBottomY);
  }

  let currentRowTop = headerY - 7;
  renderedRows.forEach((service) => {
    const rowTextY = currentRowTop - 14;
    page1.drawText(String(service.quantity || 0), colX[0] + 3, rowTextY, 9.2);
    const parameterLines = wrapText(service.label || 'Servicio', 22, 2);
    parameterLines.forEach((line, index) => {
      page1.drawText(line, colX[1] + 3, rowTextY - index * 10, 9.2);
    });
    page1.drawText(truncate(service.unit || '-', 8), colX[2] + 3, rowTextY, 9.2);
    page1.drawText(truncate(service.method || '-', 17), colX[3] + 3, rowTextY, 9.2);
    page1.drawText(truncate(service.rangeOffered || '-', 13), colX[4] + 3, rowTextY, 9.2);
    page1.drawText(formatMoney(service.unitPrice), colX[5] + 3, rowTextY, 9.2);
    page1.drawText(formatMoney(service.discountAmount), colX[6] + 3, rowTextY, 9.2);
    page1.drawText(formatMoney(service.subtotal), colX[7] + 3, rowTextY, 9.2);
    currentRowTop -= rowHeight;
    page1.drawLine(tableLeft, currentRowTop, tableRight, currentRowTop);
  });

  if (dataRows.length > maxRows) {
    page1.drawText(
      `Y ${dataRows.length - maxRows} servicios más`,
      colX[1] + 3,
      tableBottomY - 12,
      9
    );
  }

  const totalsBoxX = marginX + 12;
  const totalsBoxY = tableBottomY - 112;
  const totalsBoxW = 230;
  const totalsBoxH = 96;
  page1.drawText('Costos estimados', totalsBoxX + 10, totalsBoxY + totalsBoxH - 22, 11.5, 'F2');
  page1.drawText('Subtotal:', totalsBoxX + 10, totalsBoxY + totalsBoxH - 44, 10);
  page1.drawText(formatMoney(payload.pricing.subtotal), totalsBoxX + 132, totalsBoxY + totalsBoxH - 44, 10);
  page1.drawText(`IVA (${payload.pricing.taxPercent}%):`, totalsBoxX + 10, totalsBoxY + totalsBoxH - 64, 10);
  page1.drawText(
    formatMoney((payload.pricing.subtotal * payload.pricing.taxPercent) / 100),
    totalsBoxX + 132,
    totalsBoxY + totalsBoxH - 64,
    10
  );
  page1.drawLine(totalsBoxX + 10, totalsBoxY + totalsBoxH - 76, totalsBoxX + totalsBoxW - 10, totalsBoxY + totalsBoxH - 76);
  page1.drawText('Total:', totalsBoxX + 10, totalsBoxY + totalsBoxH - 94, 17, 'F2');
  page1.drawText(formatMoney(payload.pricing.total), totalsBoxX + 132, totalsBoxY + totalsBoxH - 94, 17, 'F2');

  const page2 = createOps();
  const page2TitleY = pageHeight - 34;
  page2.drawText('Condiciones de la proforma', marginX, page2TitleY, 20, 'F2');
  page2.drawText(`Referencia: ${payload.reference || '-'}`, marginX, page2TitleY - 24, 12, 'F2');

  let legalY = page2TitleY - 56;
  page2.drawText('Leyenda de acreditación:', marginX, legalY, 11, 'F2');
  legalY -= 14;
  [
    '* Parámetro acreditado',
    '(*) Parámetro no acreditado',
    '0 Parámetro subcontratado no acreditado',
    '** Parámetro subcontratado acreditado (fuera del alcance de acreditación)'
  ].forEach((line) => {
    page2.drawText(line, marginX + 8, legalY, 10);
    legalY -= 13;
  });

  legalY -= 4;
  page2.drawText('Forma de pago:', marginX, legalY, 11, 'F2');
  wrapText(
    '50% anticipo y 50% contra entrega de informes. Pagos por transferencia bancaria.',
    90,
    2
  ).forEach((line, index) => {
    page2.drawText(line, marginX + 92, legalY - index * 12, 10);
  });

  legalY -= 30;
  page2.drawText('Tiempo de entrega de resultados:', marginX, legalY, 11, 'F2');
  wrapText(
    '8 días laborables para parámetros acreditados y 15 días para subcontratados, contados desde la entrega del informe digital.',
    78,
    3
  ).forEach((line, index) => {
    page2.drawText(line, marginX + 176, legalY - index * 12, 10);
  });

  legalY -= 46;
  page2.drawText('Notas:', marginX, legalY, 11, 'F2');
  const notesLines = [
    '- Cronogramas de ejecución definidos de mutuo acuerdo. Cambios de fecha pueden generar costos adicionales.',
    '- Suspensiones en sitio programado podrán facturar costo de STAND BY.',
    '- Los tiempos estimados buscan una ejecución profesional y eficiente.',
    '- La información recibida para ejecución se considera confidencial y de uso interno del laboratorio.',
    '- En caso de requerir evaluaciones adicionales, se informarán costos complementarios antes de ejecutar.'
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
    `<< /Length ${Buffer.byteLength(textOpsPage1, 'latin1')} >>\nstream\n${textOpsPage1}\nendstream`,
    `<< /Length ${Buffer.byteLength(textOpsPage2, 'latin1')} >>\nstream\n${textOpsPage2}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  objects.forEach((obj, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
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

  const buffer =
    (await tryRenderPdfWithPuppeteerInFunction(params.payload)) ??
    buildPreviewPdfBuffer(params.payload);

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
