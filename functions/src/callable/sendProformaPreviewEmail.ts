import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import {
  generateAndStoreProformaPreviewPdf,
  ProformaPreviewPayload,
  sanitizeProformaPreviewPayload
} from '../utils/proformaPreviewPdf.js';
import { sendWithGmailApi } from '../utils/gmail.js';

interface SendProformaPreviewEmailRequest {
  to?: string;
  subject?: string;
  text?: string;
  payload?: ProformaPreviewPayload;
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const sendProformaPreviewEmail = onCall(async (req) => {
  if (!req.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const data = (req.data || {}) as SendProformaPreviewEmailRequest;
  const recipient = String(data.to || '').trim();

  if (!recipient || !isValidEmail(recipient)) {
    throw new HttpsError('invalid-argument', 'A valid recipient email is required.');
  }

  if (!data.payload) {
    throw new HttpsError('invalid-argument', 'payload is required.');
  }

  const payload = sanitizeProformaPreviewPayload(data.payload);
  const pdf = await generateAndStoreProformaPreviewPdf({
    uid: req.auth.uid,
    payload
  });

  const file = admin.storage().bucket().file(pdf.storagePath);
  const [buffer] = await file.download();

  const subject =
    String(data.subject || '').trim() || `Proforma ${payload.reference || 'sin referencia'}`;
  const text =
    String(data.text || '').trim() ||
    `Adjunto encontrarás la proforma ${payload.reference || ''}.`;

  await sendWithGmailApi({
    to: recipient,
    subject,
    text,
    attachment: {
      filename: pdf.fileName,
      contentBase64: buffer.toString('base64'),
      mimeType: 'application/pdf'
    }
  });

  return {
    sent: true,
    to: recipient,
    storagePath: pdf.storagePath,
    downloadURL: pdf.downloadURL,
    fileName: pdf.fileName
  };
});
