import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  generateAndStoreProformaPreviewPdf,
  ProformaPreviewPayload,
  sanitizeProformaPreviewPayload
} from '../utils/proformaPreviewPdf.js';

interface GenerateProformaPreviewPdfRequest {
  payload?: ProformaPreviewPayload;
}

export const generateProformaPreviewPdf = onCall(
  {
    memory: '4GiB',
    cpu: 2
  },
  async (req) => {
  if (!req.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const data = (req.data || {}) as GenerateProformaPreviewPdfRequest;
  const payload = data.payload;

  if (!payload) {
    throw new HttpsError('invalid-argument', 'payload is required.');
  }

  const sanitizedPayload = sanitizeProformaPreviewPayload(payload);

  const pdf = await generateAndStoreProformaPreviewPdf({
    uid: req.auth.uid,
    payload: sanitizedPayload
  });

  return {
    storagePath: pdf.storagePath,
    downloadURL: pdf.downloadURL,
    fileName: pdf.fileName
  };
  }
);
