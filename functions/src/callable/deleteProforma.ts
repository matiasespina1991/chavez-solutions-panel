import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore.js';

const db = admin.firestore();

interface DeleteProformaPayload {
  requestId?: string;
}

export const deleteProforma = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const data = (req.data || {}) as DeleteProformaPayload;
  const requestId = data.requestId?.trim();

  if (!requestId) {
    throw new HttpsError('invalid-argument', 'requestId is required.');
  }

  const sourceRef = db.collection(FIRESTORE_COLLECTIONS.REQUESTS).doc(requestId);
  const deletedRef = db.collection(FIRESTORE_COLLECTIONS.DELETED_REQUESTS).doc(requestId);

  await db.runTransaction(async (tx) => {
    const sourceSnap = await tx.get(sourceRef);

    if (!sourceSnap.exists) {
      throw new HttpsError('not-found', 'Proforma not found.');
    }

    const sourceData = sourceSnap.data() ?? {};

    const linkedWorkOrderId =
      typeof sourceData.linkedWorkOrderId === 'string'
        ? sourceData.linkedWorkOrderId.trim()
        : '';

    let workOrderRef: FirebaseFirestore.DocumentReference | null = null;

    if (linkedWorkOrderId) {
      workOrderRef = db.collection(FIRESTORE_COLLECTIONS.WORK_ORDERS).doc(linkedWorkOrderId);
      const workOrderSnap = await tx.get(workOrderRef);
      if (!workOrderSnap.exists) {
        workOrderRef = null;
      }
    }

    if (!workOrderRef) {
      const workOrderBySourceQuery = db
        .collection(FIRESTORE_COLLECTIONS.WORK_ORDERS)
        .where('sourceRequestId', '==', requestId)
        .limit(1);
      const workOrderBySourceSnap = await tx.get(workOrderBySourceQuery);
      if (!workOrderBySourceSnap.empty) {
        workOrderRef = workOrderBySourceSnap.docs[0].ref;
      }
    }

    if (workOrderRef) {
      tx.set(
        workOrderRef,
        {
          status: 'cancelled',
          cancellationReason: 'request_deleted_by_admin',
          notes: 'Proforma eliminada por administrador',
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }

    tx.set(deletedRef, {
      ...sourceData,
      originalRequestId: requestId,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: {
        uid: req.auth?.uid ?? null,
        email: req.auth?.token?.email ?? null
      }
    });

    tx.delete(sourceRef);
  });

  return {
    deletedRequestId: requestId
  };
});
