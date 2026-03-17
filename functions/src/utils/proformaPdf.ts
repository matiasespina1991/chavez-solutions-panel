import admin from 'firebase-admin';
import { ensureTokenDownloadURL } from './storage.js';

interface ProformaPdfPayload {
  requestId: string;
  reference: string;
  clientName: string;
  matrix: string;
  total: number;
}

const escapePdfText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const buildSimplePdfBuffer = (payload: ProformaPdfPayload): Buffer => {
  const lines = [
    'CHAVEZ SOLUTIONS - PROFORMA',
    `Solicitud: ${payload.requestId}`,
    `Referencia: ${payload.reference || '-'}`,
    `Cliente: ${payload.clientName || '-'}`,
    `Matriz: ${payload.matrix || '-'}`,
    `Total estimado: $${payload.total.toFixed(2)}`,
    '',
    'Documento PDF simple (placeholder).',
  ];

  const textOps = [
    'BT',
    '/F1 12 Tf',
    '50 780 Td',
    ...lines.flatMap((line, index) =>
      index === 0
        ? [`(${escapePdfText(line)}) Tj`]
        : ['0 -18 Td', `(${escapePdfText(line)}) Tj`]
    ),
    'ET',
  ].join('\n');

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(textOps, 'utf8')} >>\nstream\n${textOps}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
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

export interface ServiceRequestPdfSource {
  id: string;
  reference?: string | null;
  matrix?: string | null;
  pricing?: {
    total?: number | null;
  } | null;
  client?: {
    businessName?: string | null;
  } | null;
}

export const generateAndStoreProformaPdf = async (
  source: ServiceRequestPdfSource
): Promise<{ storagePath: string; downloadURL: string; fileName: string }> => {
  const fileName = `proforma-${source.reference || source.id}.pdf`;
  const storagePath = `generated/proformas/${source.id}.pdf`;

  const buffer = buildSimplePdfBuffer({
    requestId: source.id,
    reference: source.reference || source.id,
    clientName: source.client?.businessName || '',
    matrix: source.matrix || '',
    total: Number(source.pricing?.total || 0),
  });

  const bucket = admin.storage().bucket();
  await bucket.file(storagePath).save(buffer, {
    resumable: false,
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'private, max-age=0, no-transform',
    },
  });

  const downloadURL = await ensureTokenDownloadURL(storagePath);

  return { storagePath, downloadURL, fileName };
};
