import { WORK_ORDER_STATUS_LABEL_MAP } from '@/lib/status-labels';
import type { WorkOrderListRow as WorkOrderRow } from '@/types/domain';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildPrintDocumentHtml = (
  title: string,
  bodyHtml: string
) => `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 24px; }
      h1 { margin: 0 0 6px 0; font-size: 28px; }
      .sub { margin: 0 0 16px 0; color: #555; font-size: 14px; }
      .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
      .card { border: 1px solid #d4d4d8; border-radius: 8px; padding: 12px; }
      .card h3 { margin: 0 0 8px 0; font-size: 16px; }
      .line { margin: 4px 0; font-size: 14px; }
      .section { border: 1px solid #d4d4d8; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
      .section h3 { margin: 0 0 8px 0; font-size: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border-top: 1px solid #e4e4e7; padding: 8px; text-align: left; vertical-align: top; }
      thead th { border-top: none; background: #f4f4f5; color: #3f3f46; }
      .right { text-align: right; }
      ul { margin: 0; padding-left: 16px; }
      li { margin: 4px 0; font-size: 14px; }
      @media print { body { padding: 14mm; } }
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`;

const openPrintWindow = (html: string) => {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 200);
  return true;
};

const downloadHtml = (fileName: string, html: string) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getSummaryBodyHtml = (selectedRow: WorkOrderRow) =>
  `<h1>Resumen de orden de trabajo</h1>
       <p class="sub">N° OT: ${escapeHtml(selectedRow.workOrderNumber)}</p>
       <div class="cards">
         <div class="card">
           <h3>Datos generales</h3>
           <p class="line"><strong>N° OT:</strong> ${escapeHtml(selectedRow.workOrderNumber)}</p>
           <p class="line"><strong>Referencia origen:</strong> ${escapeHtml(selectedRow.sourceReference)}</p>
           <p class="line"><strong>Estado:</strong> ${escapeHtml(WORK_ORDER_STATUS_LABEL_MAP[selectedRow.status])}</p>
           <p class="line"><strong>Última actualización:</strong> ${escapeHtml(selectedRow.updatedAtLabel)}</p>
         </div>
         <div class="card">
           <h3>Cliente</h3>
           <p class="line"><strong>Razón social:</strong> ${escapeHtml(selectedRow.client.businessName || '—')}</p>
           <p class="line"><strong>RUC:</strong> ${escapeHtml(selectedRow.client.taxId || '—')}</p>
           <p class="line"><strong>Contacto:</strong> ${escapeHtml(selectedRow.client.contactName || '—')}</p>
         </div>
       </div>
       <div class="section">
         <h3>Servicios (${selectedRow.serviceItems.length})</h3>
         ${
           selectedRow.serviceItems.length
             ? `<ul>${selectedRow.serviceItems
                 .map(
                   (service) =>
                     `<li>${escapeHtml(service.parameterLabel)} (x${service.quantity})</li>`
                 )
                 .join('')}</ul>`
             : '<p class="line">No hay servicios seleccionados.</p>'
         }
       </div>`;

export const downloadWorkOrderSummary = (selectedRow: WorkOrderRow) => {
  const html = buildPrintDocumentHtml(
    `Orden de trabajo ${selectedRow.workOrderNumber}`,
    getSummaryBodyHtml(selectedRow)
  );

  downloadHtml(`orden-trabajo-${selectedRow.workOrderNumber}.html`, html);
};

export const printWorkOrderSummary = (selectedRow: WorkOrderRow) => {
  const html = buildPrintDocumentHtml(
    `Orden de trabajo ${selectedRow.workOrderNumber}`,
    getSummaryBodyHtml(selectedRow)
  );
  return openPrintWindow(html);
};
