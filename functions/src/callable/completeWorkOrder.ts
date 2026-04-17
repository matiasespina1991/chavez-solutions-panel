import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore.js';

const db = admin.firestore();

interface CompleteWorkOrderRequest {
  workOrderId?: string;
  sourceRequestId?: string;
}

interface WorkOrderData {
  sourceRequestId?: string;
  workOrderNumber?: string;
  labAnalysis?: {
    status?: string;
  } | null;
  analyses?: {
    items?: unknown[];
  } | null;
}

export const completeWorkOrder = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const data = (req.data || {}) as CompleteWorkOrderRequest;
  const workOrderId = data.workOrderId?.trim();
  const sourceRequestIdInput = data.sourceRequestId?.trim();

  if (!workOrderId && !sourceRequestIdInput) {
    throw new HttpsError(
      'invalid-argument',
      'workOrderId or sourceRequestId is required.'
    );
  }

  const result = await db.runTransaction(async (tx) => {
    let workOrderRef: FirebaseFirestore.DocumentReference;

    if (workOrderId) {
      workOrderRef = db.collection(FIRESTORE_COLLECTIONS.WORK_ORDERS).doc(workOrderId);
    } else {
      const workOrderQuery = db
        .collection(FIRESTORE_COLLECTIONS.WORK_ORDERS)
        .where('sourceRequestId', '==', sourceRequestIdInput)
        .limit(1);
      const workOrderQuerySnap = await tx.get(workOrderQuery);

      if (workOrderQuerySnap.empty) {
        throw new HttpsError(
          'not-found',
          'No work order found for the provided sourceRequestId.'
        );
      }

      workOrderRef = workOrderQuerySnap.docs[0].ref;
    }

    const workOrderSnap = await tx.get(workOrderRef);
    if (!workOrderSnap.exists) {
      throw new HttpsError('not-found', 'Work order not found.');
    }

    const workOrderData = workOrderSnap.data() as WorkOrderData;

    const labAnalysisStatus =
      typeof workOrderData.labAnalysis === 'object' &&
      workOrderData.labAnalysis !== null
        ? String(workOrderData.labAnalysis.status ?? '').toLowerCase()
        : '';

    const analysesCount =
      typeof workOrderData.analyses === 'object' &&
      workOrderData.analyses !== null &&
      Array.isArray(workOrderData.analyses.items)
        ? workOrderData.analyses.items.length
        : 0;

    const hasRecordedLabAnalysis =
      labAnalysisStatus === 'recorded' || analysesCount > 0;

    if (!hasRecordedLabAnalysis) {
      throw new HttpsError(
        'failed-precondition',
        'Lab analysis must be recorded before completing a work order.'
      );
    }

    const sourceRequestId =
      sourceRequestIdInput ||
      String(workOrderData.sourceRequestId ?? '').trim();

    if (!sourceRequestId) {
      throw new HttpsError(
        'failed-precondition',
        'The work order has no sourceRequestId to update.'
      );
    }

    const sourceRequestRef = db
      .collection(FIRESTORE_COLLECTIONS.REQUESTS)
      .doc(sourceRequestId);
    const sourceRequestSnap = await tx.get(sourceRequestRef);

    if (!sourceRequestSnap.exists) {
      throw new HttpsError('not-found', 'Source service request not found.');
    }

    tx.update(workOrderRef, {
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.update(sourceRequestRef, {
      status: 'work_order_completed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      workOrderId: workOrderRef.id,
      workOrderNumber: workOrderData.workOrderNumber ?? workOrderRef.id,
      sourceRequestId,
      status: 'completed' as const,
    };
  });

  return result;
});
