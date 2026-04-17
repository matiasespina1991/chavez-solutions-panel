import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore.js';

const db = admin.firestore();

interface ApproveProformaRequest {
  requestId?: string;
  feedback?: string;
}

type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'converted_to_work_order'
  | 'work_order_paused'
  | 'work_order_completed'
  | 'cancelled';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface ProformaRequestData {
  status?: RequestStatus;
  linkedWorkOrderId?: string | null;
  approval?: {
    status?: ApprovalStatus;
  } | null;
}

interface ApproveProformaResponse {
  requestId: string;
  approvalStatus: 'approved';
  alreadyApproved: boolean;
}

const NON_APPROVABLE_STATUSES: RequestStatus[] = [
  'converted_to_work_order',
  'work_order_paused',
  'work_order_completed',
  'cancelled'
];

export const approveProforma = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const data = (req.data || {}) as ApproveProformaRequest;
  const requestId = data.requestId?.trim();
  const feedback =
    typeof data.feedback === 'string' ? data.feedback.trim() : undefined;

  if (!requestId) {
    throw new HttpsError('invalid-argument', 'requestId is required.');
  }

  const requestRef = db.collection(FIRESTORE_COLLECTIONS.REQUESTS).doc(requestId);

  const result = await db.runTransaction<ApproveProformaResponse>(async (tx) => {
    const requestSnap = await tx.get(requestRef);

    if (!requestSnap.exists) {
      throw new HttpsError('not-found', 'Request not found.');
    }

    const requestData = requestSnap.data() as ProformaRequestData;

    if (
      requestData.linkedWorkOrderId ||
      (requestData.status !== undefined &&
        NON_APPROVABLE_STATUSES.includes(requestData.status))
    ) {
      throw new HttpsError(
        'failed-precondition',
        'This proforma cannot be approved in its current status.'
      );
    }

    if (requestData.status === 'draft') {
      throw new HttpsError(
        'failed-precondition',
        'Draft proformas cannot be approved.'
      );
    }

    if (requestData.approval?.status === 'approved') {
      return {
        requestId,
        approvalStatus: 'approved',
        alreadyApproved: true
      };
    }

    tx.update(requestRef, {
      status: 'submitted',
      approval: {
        status: 'approved',
        ...(feedback ? { feedback } : {}),
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        approvedBy: {
          uid: req.auth?.uid ?? null,
          email:
            typeof req.auth?.token?.email === 'string'
              ? req.auth.token.email
              : null
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      requestId,
      approvalStatus: 'approved',
      alreadyApproved: false
    };
  });

  return result;
});
