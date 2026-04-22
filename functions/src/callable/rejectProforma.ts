import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore.js';
import type {
  ProformaRequestData,
  RequestStatus
} from '../types/requests.js';
import { requirePermission } from '../guards/require-permission.js';

const db = admin.firestore();

interface RejectProformaRequest {
  requestId?: string;
  feedback?: string;
}

interface RejectProformaResponse {
  requestId: string;
  approvalStatus: 'rejected';
}

const NON_REJECTABLE_STATUSES: RequestStatus[] = [
  'converted_to_work_order',
  'work_order_paused',
  'work_order_completed',
  'cancelled'
];

export const rejectProforma = onCall(async (req) => {
  await requirePermission(req, 'requests.reject');

  const data = (req.data || {}) as RejectProformaRequest;
  const requestId = data.requestId?.trim();
  const feedback =
    typeof data.feedback === 'string' ? data.feedback.trim() : '';

  if (!requestId) {
    throw new HttpsError('invalid-argument', 'requestId is required.', {
      reason: 'REQUEST_ID_REQUIRED'
    });
  }

  if (!feedback) {
    throw new HttpsError(
      'invalid-argument',
      'feedback is required to reject a proforma.',
      { reason: 'REJECT_FEEDBACK_REQUIRED' }
    );
  }

  const requestRef = db.collection(FIRESTORE_COLLECTIONS.REQUESTS).doc(requestId);

  const result = await db.runTransaction<RejectProformaResponse>(async (tx) => {
    const requestSnap = await tx.get(requestRef);

    if (!requestSnap.exists) {
      throw new HttpsError('not-found', 'Request not found.', {
        reason: 'REQUEST_NOT_FOUND'
      });
    }

    const requestData = requestSnap.data() as ProformaRequestData;

    if (
      requestData.linkedWorkOrderId ||
      (requestData.status !== undefined &&
        NON_REJECTABLE_STATUSES.includes(requestData.status))
    ) {
      throw new HttpsError(
        'failed-precondition',
        'This proforma cannot be rejected in its current status.',
        { reason: 'REQUEST_NOT_REJECTABLE_STATUS' }
      );
    }

    if (requestData.status !== 'submitted') {
      throw new HttpsError(
        'failed-precondition',
        'Only submitted proformas can be rejected.',
        { reason: 'REQUEST_ONLY_SUBMITTED_REJECTABLE' }
      );
    }

    tx.update(requestRef, {
      status: 'draft',
      approval: {
        status: 'rejected',
        feedback,
        rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
        rejectedBy: {
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
      approvalStatus: 'rejected'
    };
  });

  return result;
});
