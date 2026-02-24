import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';

const db = admin.firestore();

interface ResumeWorkOrderRequest {
  sourceRequestId?: string;
}

interface ServiceRequestData {
  linkedWorkOrderId?: string | null;
  isWorkOrder?: boolean;
}

interface WorkOrderData {
  workOrderNumber?: string;
}

export const resumeWorkOrder = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const data = (req.data || {}) as ResumeWorkOrderRequest;
  const sourceRequestId = data.sourceRequestId?.trim();

  if (!sourceRequestId) {
    throw new HttpsError('invalid-argument', 'sourceRequestId is required.');
  }

  const sourceRequestRef = db.collection('service_requests').doc(sourceRequestId);

  const result = await db.runTransaction(async (tx) => {
    const sourceSnap = await tx.get(sourceRequestRef);

    if (!sourceSnap.exists) {
      throw new HttpsError('not-found', 'Service request not found.');
    }

    const source = sourceSnap.data() as ServiceRequestData;

    if (!source.linkedWorkOrderId) {
      throw new HttpsError(
        'failed-precondition',
        'This request has no linked work order to resume.'
      );
    }

    const workOrderRef = db.collection('work_orders').doc(source.linkedWorkOrderId);
    const workOrderSnap = await tx.get(workOrderRef);

    if (!workOrderSnap.exists) {
      throw new HttpsError('not-found', 'Linked work order not found.');
    }

    const workOrder = workOrderSnap.data() as WorkOrderData;

    tx.update(workOrderRef, {
      status: 'issued',
      resumedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.update(sourceRequestRef, {
      isWorkOrder: true,
      status: 'converted_to_work_order',
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
