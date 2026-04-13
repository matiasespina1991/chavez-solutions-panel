import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';

const db = admin.firestore();
const ALLOWED_MATRICES = new Set(['water', 'soil', 'noise', 'gases']);

const normalizeMatrixArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();

  value.forEach((entry) => {
    if (typeof entry !== 'string') return;
    const normalized = entry.trim().toLowerCase();
    if (!normalized || !ALLOWED_MATRICES.has(normalized)) return;
    unique.add(normalized);
  });

  return Array.from(unique);
};

const buildTempWorkOrderNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `OT-TMP-${year}-${random}`;
};

interface CreateWorkOrderRequest {
  sourceRequestId?: string;
}

type ServiceRequestApprovalStatus = 'pending' | 'approved' | 'rejected';

interface ServiceRequestApprovalData {
  status?: ServiceRequestApprovalStatus;
}

type ServiceRequestStatus =
  | 'draft'
  | 'submitted'
  | 'converted_to_work_order'
  | 'work_order_paused'
  | 'work_order_completed'
  | 'cancelled';

const NON_EMITTABLE_STATUSES: ServiceRequestStatus[] = [
  'draft',
  'converted_to_work_order',
  'work_order_paused',
  'work_order_completed',
  'cancelled',
];

interface ServiceRequestData {
  isWorkOrder?: boolean;
  status?: ServiceRequestStatus;
  matrix?: string[];
  reference?: string;
  notes?: string;
  client?: unknown;
  samples?: unknown;
  analyses?: unknown;
  pricing?: unknown;
  linkedWorkOrderId?: string | null;
  approval?: ServiceRequestApprovalData | null;
}

export const createWorkOrder = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const data = (req.data || {}) as CreateWorkOrderRequest;
  const sourceRequestId = data.sourceRequestId?.trim();

  if (!sourceRequestId) {
    throw new HttpsError('invalid-argument', 'sourceRequestId is required.');
  }

  const sourceRequestRef = db
    .collection('requests')
    .doc(sourceRequestId);

  const result = await db.runTransaction(async (tx) => {
    const sourceSnap = await tx.get(sourceRequestRef);

    if (!sourceSnap.exists) {
      throw new HttpsError('not-found', 'Service request not found.');
    }

    const source = sourceSnap.data() as ServiceRequestData;

    if (source.linkedWorkOrderId) {
      const existingWoSnap = await tx.get(
        db.collection('work_orders').doc(source.linkedWorkOrderId)
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
        'This service request is not eligible to generate a work order.'
      );
    }

    if (source.approval?.status !== 'approved') {
      throw new HttpsError(
        'failed-precondition',
        'Service request must be approved before generating a work order.'
      );
    }

    const workOrderRef = db.collection('work_orders').doc();
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
      analyses: null,
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
