import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import {
  generateAndStoreProformaPdf,
  ServiceRequestPdfSource,
} from '../utils/proformaPdf.js';

const db = admin.firestore();

interface GenerateProformaPdfRequest {
  sourceRequestId?: string;
}

export const generateProformaPdf = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const data = (req.data || {}) as GenerateProformaPdfRequest;
  const sourceRequestId = data.sourceRequestId?.trim();

  if (!sourceRequestId) {
    throw new HttpsError('invalid-argument', 'sourceRequestId is required.');
  }

  const sourceSnap = await db.collection('service_requests').doc(sourceRequestId).get();
  if (!sourceSnap.exists) {
    throw new HttpsError('not-found', 'Service request not found.');
  }

  const source = sourceSnap.data() as Omit<ServiceRequestPdfSource, 'id'>;
  const pdf = await generateAndStoreProformaPdf({
    id: sourceSnap.id,
    ...source,
  });

  return {
    sourceRequestId: sourceSnap.id,
    storagePath: pdf.storagePath,
    downloadURL: pdf.downloadURL,
    fileName: pdf.fileName,
  };
});
