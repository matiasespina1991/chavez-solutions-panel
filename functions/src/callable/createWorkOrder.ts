import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore.js';
import type { RequestDocumentData, RequestStatus } from '../types/requests.js';
import { normalizeMatrixArray } from '../utils/request-normalizers.js';
import { requirePermission } from '../guards/require-permission.js';

const db = admin.firestore();

const buildTempWorkOrderNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `OT-TMP-${year}-${random}`;
};

interface CreateWorkOrderRequest {
  sourceRequestId?: string;
}

const NON_EMITTABLE_STATUSES: RequestStatus[] = [
  'draft',
  'converted_to_work_order',
  'work_order_paused',
  'work_order_completed',
  'cancelled',
];

export const createWorkOrder = onCall(async (req) => {
  await requirePermission(req, 'work_orders.execute');

  const data = (req.data || {}) as CreateWorkOrderRequest;
  const sourceRequestId = data.sourceRequestId?.trim();

  if (!sourceRequestId) {
    throw new HttpsError('invalid-argument', 'sourceRequestId is required.', {
      reason: 'REQUEST_ID_REQUIRED'
    });
  }

  const sourceRequestRef = db
    .collection(FIRESTORE_COLLECTIONS.REQUESTS)
    .doc(sourceRequestId);

  const result = await db.runTransaction(async (tx) => {
    const sourceSnap = await tx.get(sourceRequestRef);

    if (!sourceSnap.exists) {
      throw new HttpsError('not-found', 'Service request not found.', {
        reason: 'REQUEST_NOT_FOUND'
      });
    }

    const source = sourceSnap.data() as RequestDocumentData;

    if (source.linkedWorkOrderId) {
      const existingWoSnap = await tx.get(
        db.collection(FIRESTORE_COLLECTIONS.WORK_ORDERS).doc(source.linkedWorkOrderId)
      );
      const existingNumber = existingWoSnap.exists
        ? (existingWoSnap.data()?.workOrderNumber as string | undefined)
        : undefined;

      return {
        workOrderId: source.linkedWorkOrderId,
        workOrderNumber: existingNumber || 'OT-EXISTING',
        alreadyExists: true,
      };
    }

    if (
      source.status !== undefined &&
      NON_EMITTABLE_STATUSES.includes(source.status)
    ) {
      throw new HttpsError(
        'failed-precondition',
        'This service request is not eligible to generate a work order.',
        { reason: 'REQUEST_NOT_EMITTABLE' }
      );
    }

    if (source.approval?.status !== 'approved') {
      throw new HttpsError(
        'failed-precondition',
        'Service request must be approved before generating a work order.',
        { reason: 'REQUEST_NOT_APPROVED' }
      );
    }

    const workOrderRef = db.collection(FIRESTORE_COLLECTIONS.WORK_ORDERS).doc();
    const workOrderNumber = buildTempWorkOrderNumber();

    tx.set(workOrderRef, {
      workOrderNumber,
      status: 'issued',
      sourceRequestId,
      sourceReference: source.reference ?? null,
      matrix: normalizeMatrixArray(source.matrix),
      notes: source.notes ?? '',
      client: source.client ?? null,
      samples: null,
      services: source.services ?? null,
      pricing: source.pricing ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      issuedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.update(sourceRequestRef, {
      isWorkOrder: true,
      status: 'converted_to_work_order',
      linkedWorkOrderId: workOrderRef.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      workOrderId: workOrderRef.id,
      workOrderNumber,
      alreadyExists: false,
    };
  });

  return {
    workOrderId: result.workOrderId,
    workOrderNumber: result.workOrderNumber,
  };
});
