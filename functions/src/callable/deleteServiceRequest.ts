import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';

const db = admin.firestore();

interface DeleteServiceRequestPayload {
  sourceRequestId?: string;
}

export const deleteServiceRequest = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const data = (req.data || {}) as DeleteServiceRequestPayload;
  const sourceRequestId = data.sourceRequestId?.trim();

  if (!sourceRequestId) {
    throw new HttpsError('invalid-argument', 'sourceRequestId is required.');
  }

  const sourceRef = db.collection('service_requests').doc(sourceRequestId);
  const deletedRef = db
    .collection('deleted_service_requests')
    .doc(sourceRequestId);

  await db.runTransaction(async (tx) => {
    const sourceSnap = await tx.get(sourceRef);

    if (!sourceSnap.exists) {
      throw new HttpsError('not-found', 'Service request not found.');
    }

    const sourceData = sourceSnap.data() ?? {};

    tx.set(deletedRef, {
      ...sourceData,
      originalRequestId: sourceRequestId,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: {
        uid: req.auth?.uid ?? null,
        email: req.auth?.token?.email ?? null,
      },
    });

    tx.delete(sourceRef);
  });

  return {
    deletedRequestId: sourceRequestId,
  };
});
