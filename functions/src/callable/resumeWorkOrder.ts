import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore.js';
import type { LinkedWorkOrderRequestData } from '../types/requests.js';
import { requirePermission } from '../guards/require-permission.js';

const db = admin.firestore();

interface ResumeWorkOrderRequest {
  sourceRequestId?: string;
  notes?: string;
}

interface WorkOrderData {
  workOrderNumber?: string;
}

export const resumeWorkOrder = onCall(async (req) => {
  await requirePermission(req, 'work_orders.pause_resume');

  const data = (req.data || {}) as ResumeWorkOrderRequest;
  const sourceRequestId = data.sourceRequestId?.trim();
  const notes = typeof data.notes === 'string' ? data.notes : undefined;

  if (!sourceRequestId) {
    throw new HttpsError('invalid-argument', 'sourceRequestId is required.');
  }

  const sourceRequestRef = db
    .collection(FIRESTORE_COLLECTIONS.REQUESTS)
    .doc(sourceRequestId);

  const result = await db.runTransaction(async (tx) => {
    const sourceSnap = await tx.get(sourceRequestRef);

    if (!sourceSnap.exists) {
      throw new HttpsError('not-found', 'Service request not found.');
    }

    const source = sourceSnap.data() as LinkedWorkOrderRequestData;

    if (!source.linkedWorkOrderId) {
      throw new HttpsError(
        'failed-precondition',
        'This request has no linked work order to resume.'
      );
    }

    const workOrderRef = db
      .collection(FIRESTORE_COLLECTIONS.WORK_ORDERS)
      .doc(source.linkedWorkOrderId);
    const workOrderSnap = await tx.get(workOrderRef);

    if (!workOrderSnap.exists) {
      throw new HttpsError('not-found', 'Linked work order not found.');
    }

    const workOrder = workOrderSnap.data() as WorkOrderData;

    tx.update(workOrderRef, {
      status: 'issued',
      ...(notes !== undefined ? { notes } : {}),
      resumedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.update(sourceRequestRef, {
      isWorkOrder: true,
      status: 'converted_to_work_order',
      ...(notes !== undefined ? { notes } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      workOrderId: source.linkedWorkOrderId,
      workOrderNumber: workOrder.workOrderNumber ?? source.linkedWorkOrderId,
      status: 'issued',
    };
  });

  return result;
});
