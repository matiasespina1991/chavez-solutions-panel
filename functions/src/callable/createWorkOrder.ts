import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';

const db = admin.firestore();

const buildTempWorkOrderNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `OT-TMP-${year}-${random}`;
};

interface CreateWorkOrderRequest {
  sourceRequestId?: string;
  forceEmit?: boolean;
}

interface ServiceRequestData {
  isWorkOrder?: boolean;
  matrix?: 'water' | 'soil';
  reference?: string;
  notes?: string;
  client?: unknown;
  samples?: unknown;
  analyses?: unknown;
  pricing?: unknown;
  linkedWorkOrderId?: string | null;
}

export const createWorkOrder = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const data = (req.data || {}) as CreateWorkOrderRequest;
  const sourceRequestId = data.sourceRequestId?.trim();
  const forceEmit = Boolean(data.forceEmit);

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

    if (!source.isWorkOrder && !forceEmit) {
      throw new HttpsError(
        'failed-precondition',
        'This service request is not eligible to generate a work order.'
      );
    }

    if (source.linkedWorkOrderId) {
      const existingWoSnap = await tx.get(db.collection('work_orders').doc(source.linkedWorkOrderId));
      const existingNumber = existingWoSnap.exists
        ? (existingWoSnap.data()?.workOrderNumber as string | undefined)
        : undefined;

      return {
        workOrderId: source.linkedWorkOrderId,
        workOrderNumber: existingNumber || 'OT-EXISTING',
        alreadyExists: true
      };
    }

    const workOrderRef = db.collection('work_orders').doc();
    const workOrderNumber = buildTempWorkOrderNumber();

    tx.set(workOrderRef, {
      workOrderNumber,
      status: 'issued',
      sourceRequestId,
      sourceReference: source.reference ?? null,
      matrix: source.matrix ?? null,
      notes: source.notes ?? '',
      client: source.client ?? null,
      samples: source.samples ?? null,
      analyses: source.analyses ?? null,
      pricing: source.pricing ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      issuedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    tx.update(sourceRequestRef, {
      isWorkOrder: true,
      status: 'converted_to_work_order',
      linkedWorkOrderId: workOrderRef.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      workOrderId: workOrderRef.id,
      workOrderNumber,
      alreadyExists: false
    };
  });

  return {
    workOrderId: result.workOrderId,
    workOrderNumber: result.workOrderNumber
  };
});
