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
  table: string;
  label: string;
  unit: string;
  method: string;
  rangeOffered: string;
  quantity: number;
  unitPrice: number | null;
  discountAmount: number | null;
  subtotal: number | null;
}

interface ProformaPreviewServiceGroup {
  name: string;
  items: ProformaPreviewServiceLine[];
}

export interface ProformaPreviewPayload {
  reference: string;
  matrixLabels: string[];
  validDays: number | null;
  issuedAtLabel: string;
  validUntilLabel: string;
  client: ProformaPreviewClient;
  services: ProformaPreviewServiceLine[];
  serviceGroups?: ProformaPreviewServiceGroup[];
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
      mobile: String(next.client?.mobile || '').trim(),
    },
    services: Array.isArray(next.services)
      ? next.services.slice(0, 30).map((service) => ({
          table: String(service.table || '').trim(),
          label: String(service.label || '').trim(),
          unit: String(service.unit || '').trim(),
          method: String(service.method || '').trim(),
          rangeOffered: String(service.rangeOffered || '').trim(),
          quantity: Math.max(0, Math.floor(sanitizeNumber(service.quantity))),
          unitPrice:
            typeof service.unitPrice === 'number' &&
            Number.isFinite(service.unitPrice)
              ? service.unitPrice
              : null,
          discountAmount:
            typeof service.discountAmount === 'number' &&
            Number.isFinite(service.discountAmount)
              ? service.discountAmount
              : null,
          subtotal:
            typeof service.subtotal === 'number' &&
            Number.isFinite(service.subtotal)
              ? service.subtotal
              : null,
        }))
      : [],
    serviceGroups: Array.isArray(next.serviceGroups)
      ? next.serviceGroups.slice(0, 20).map((group) => ({
          name: String(group?.name || '').trim(),
          items: Array.isArray(group?.items)
            ? group.items.slice(0, 30).map((service) => ({
                table: String(service.table || '').trim(),
                label: String(service.label || '').trim(),
                unit: String(service.unit || '').trim(),
                method: String(service.method || '').trim(),
                rangeOffered: String(service.rangeOffered || '').trim(),
                quantity: Math.max(
                  0,
                  Math.floor(sanitizeNumber(service.quantity))
                ),
                unitPrice:
                  typeof service.unitPrice === 'number' &&
                  Number.isFinite(service.unitPrice)
                    ? service.unitPrice
                    : null,
                discountAmount:
                  typeof service.discountAmount === 'number' &&
                  Number.isFinite(service.discountAmount)
                    ? service.discountAmount
                    : null,
                subtotal:
                  typeof service.subtotal === 'number' &&
                  Number.isFinite(service.subtotal)
                    ? service.subtotal
                    : null,
              }))
            : [],
        }))
      : [],
    pricing: {
      subtotal: sanitizeNumber(next.pricing?.subtotal),
      taxPercent: sanitizeNumber(next.pricing?.taxPercent),
      total: sanitizeNumber(next.pricing?.total),
    },
  };
};

const formatMoney = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return `$${value.toFixed(2)}`;
};

const formatMoneyCompact = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  const normalized = Math.round(value * 100) / 100;
  if (Number.isInteger(normalized)) return `$${normalized.toFixed(0)}`;
  return `$${normalized.toFixed(2)}`;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildProformaPreviewHtml = (payload: ProformaPreviewPayload): string => {
  const taxAmount =
    (payload.pricing.subtotal * payload.pricing.taxPercent) / 100;
  const hasGroups =
    Array.isArray(payload.serviceGroups) &&
    payload.serviceGroups.some(
      (group) => Array.isArray(group.items) && group.items.length > 0
    );

  const normalizedGroups = hasGroups
    ? (payload.serviceGroups ?? []).filter(
        (group) => Array.isArray(group.items) && group.items.length > 0
      )
    : payload.services.length > 0
      ? [{ name: 'Servicios', items: payload.services }]
      : [];

  const serviceRows = normalizedGroups
    .map((group, groupIndex) => {
      const rows = group.items
        .map(
          (service) => `
      <tr>
        <td>${escapeHtml(service.label || 'Servicio')}</td>
        <td>${escapeHtml(service.unit || '-')}</td>
        <td>${escapeHtml(service.rangeOffered || '-')}</td>
        <td>${escapeHtml(service.method || '-')}</td>
        <td>${service.quantity || 0}</td>
        <td>${formatMoneyCompact(service.unitPrice)}</td>
        <td>-${formatMoneyCompact(service.discountAmount)}</td>
        <td>${formatMoneyCompact(service.subtotal)}</td>
      </tr>`
        )
        .join('');

      const groupSubtotal = group.items.reduce((acc, service) => {
        if (
          typeof service.subtotal === 'number' &&
          Number.isFinite(service.subtotal)
        ) {
          return acc + service.subtotal;
        }
        if (
          typeof service.unitPrice === 'number' &&
          Number.isFinite(service.unitPrice)
        ) {
          return (
            acc +
            Math.max(
              0,
              service.unitPrice * (service.quantity || 0) -
                (service.discountAmount ?? 0)
            )
          );
        }
        return acc;
      }, 0);

      return `${rows}
      <tr class="group-subtotal">
        <td colspan="4">Subtotal ${escapeHtml(group.name || `Combo ${groupIndex + 1}`)}</td>
        <td colspan="3"></td>
        <td>${formatMoneyCompact(groupSubtotal)}</td>
      </tr>`;
    })
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
      line-height: 1.3;
    }
    h1 { margin: 0; font-size: 42px; }
    h2 { margin: 0; font-size: 16px; }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .title { margin: 0; font-size: 22px; font-weight: 700; line-height: 1.1; }
    .ref { margin-top: 4px; font-weight: 600; font-size: 10px; }
    .brand-logo {
      max-height: 3rem;
      width: auto;
      object-fit: contain;
    }
    .cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 16px;
      border-top: 1px solid #111;
      border-bottom: 1px solid #111;
      padding: 10px 0;
    }
    .card { border: 0; padding: 0 12px; }
    .card.client-card { padding-left: 0; }
    .card h3 { margin: 0 0 6px; font-size: 12px; }
    .card p { margin: 2px 0; font-size: 11px; }
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
      font-size: 11px;
    }
    th { font-weight: 700; }
    th.nowrap { white-space: nowrap; }
    tr.group-subtotal td {
      background: #edf2f7;
      font-weight: 700;
    }
    .totals { margin-top: 20px; width: 300px; }
    .totals h3 { margin: 0 0 6px; font-size: 13px; }
    .totals .row { display: flex; justify-content: space-between; font-size: 13px; margin: 2px 0; }
    .totals .total { border-top: 1px solid #111; margin-top: 6px; padding-top: 5px; font-size: 17px; font-weight: 700; display: flex; justify-content: space-between; }
    .break { break-before: page; page-break-before: always; }
    .legal h2 { margin-bottom: 10px; font-size: 13px; }
    .legal h4 { margin: 14px 0 6px; font-size: 14px; }
    .legal p, .legal li { font-size: 12px; margin: 4px 0; }
    ul { margin: 8px 0 0 18px; padding: 0; }
  </style>
</head>
<body>
  <div class="doc-header">
    <div>
      <h1 class="title">Proforma</h1>
      <div class="ref">Referencia: ${escapeHtml(payload.reference || '-')}</div>
    </div>
    <img
      class="brand-logo"
      src="https://firebasestorage.googleapis.com/v0/b/escriba-app-302f5.appspot.com/o/system%2Fassets%2Fimages%2Flogos%2Fchavez%20logo.png?alt=media&token=38de24ec-2cdf-4494-87a5-c8e24aa0765b"
      alt="Chavez Solutions"
    />
  </div>

  <div class="cards">
    <div class="card client-card">
      <h3>Datos del cliente</h3>
      <p><b>Razon social:</b> ${escapeHtml(payload.client.businessName || '-')}</p>
      <p><b>RUC:</b> ${escapeHtml(payload.client.taxId || '-')}</p>
      <p><b>Nombre de contacto:</b> ${escapeHtml(payload.client.contactName || '-')}</p>
      <p><b>Direccion:</b> ${escapeHtml(payload.client.address || '-')}</p>
      <p><b>Correo:</b> ${escapeHtml(payload.client.email || '-')}</p>
      <p><b>Telefono:</b> ${escapeHtml(payload.client.phone || '-')}</p>
      <p><b>Celular:</b> ${escapeHtml(payload.client.mobile || payload.client.phone || '-')}</p>
    </div>
    <div class="card">
      <h3>Datos de proforma</h3>
      <p><b>Referencia:</b> ${escapeHtml(payload.reference || '-')}</p>
      <p><b>Fecha de emision:</b> ${escapeHtml(payload.issuedAtLabel || '-')}</p>
      <p><b>Validez de oferta:</b> ${escapeHtml(String(payload.validDays ?? '-'))} dias</p>
      <p><b>Valida hasta:</b> ${escapeHtml(payload.validUntilLabel || '-')}</p>
    </div>
  </div>

  <div class="section">
    <h2>Detalle de costos por analisis</h2>
    <table>
      <thead>
        <tr>
          <th style="width:22%">Parámetros</th>
          <th style="width:11%">Unidades</th>
          <th style="width:16%">Rango ofertado</th>
          <th style="width:19%">Método de ensayo o técnica</th>
          <th class="nowrap" style="width:8%">Cantidad</th>
          <th style="width:9%">Precio</th>
          <th style="width:7%">Desc.</th>
          <th class="nowrap" style="width:8%">Subtotal</th>
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
): Promise<Buffer> => {
  const dynamicImport = new Function(
    'moduleName',
    'return import(moduleName)'
  ) as (moduleName: string) => Promise<any>;
  const chromiumModule = await dynamicImport('@sparticuz/chromium');
  const puppeteerCoreModule = await dynamicImport('puppeteer-core');
  const chromium = chromiumModule?.default ?? chromiumModule;
  const puppeteer = puppeteerCoreModule?.default ?? puppeteerCoreModule;

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(buildProformaPreviewHtml(payload), {
      waitUntil: 'networkidle0',
    });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
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

  const buffer = await tryRenderPdfWithPuppeteerInFunction(params.payload);

  const bucket = admin.storage().bucket();
  await bucket.file(storagePath).save(buffer, {
    resumable: false,
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'private, max-age=0, no-transform',
      contentDisposition: `attachment; filename="${fileName}"`,
    },
  });

  const downloadURL = await ensureTokenDownloadURL(storagePath);
  return { storagePath, downloadURL, fileName };
};
