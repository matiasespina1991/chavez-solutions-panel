import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';

const db = admin.firestore();

interface RejectServiceRequestRequest {
  sourceRequestId?: string;
  feedback?: string;
}

type ServiceRequestStatus =
  | 'draft'
  | 'submitted'
  | 'converted_to_work_order'
  | 'work_order_paused'
  | 'work_order_completed'
  | 'cancelled';

interface ServiceRequestData {
  status?: ServiceRequestStatus;
  linkedWorkOrderId?: string | null;
}

interface RejectServiceRequestResponse {
  sourceRequestId: string;
  approvalStatus: 'rejected';
}

const NON_REJECTABLE_STATUSES: ServiceRequestStatus[] = [
  'converted_to_work_order',
  'work_order_paused',
  'work_order_completed',
  'cancelled',
];

export const rejectServiceRequest = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const data = (req.data || {}) as RejectServiceRequestRequest;
  const sourceRequestId = data.sourceRequestId?.trim();
  const feedback =
    typeof data.feedback === 'string' ? data.feedback.trim() : '';

  if (!sourceRequestId) {
    throw new HttpsError('invalid-argument', 'sourceRequestId is required.');
  }

  if (!feedback) {
    throw new HttpsError(
      'invalid-argument',
      'feedback is required to reject a service request.'
    );
  }

  const sourceRef = db.collection('requests').doc(sourceRequestId);

  const result = await db.runTransaction<RejectServiceRequestResponse>(
    async (tx) => {
      const sourceSnap = await tx.get(sourceRef);

      if (!sourceSnap.exists) {
        throw new HttpsError('not-found', 'Service request not found.');
      }

      const source = sourceSnap.data() as ServiceRequestData;

      if (
        source.linkedWorkOrderId ||
        (source.status !== undefined &&
          NON_REJECTABLE_STATUSES.includes(source.status))
      ) {
        throw new HttpsError(
          'failed-precondition',
          'This service request cannot be rejected in its current status.'
        );
      }

      if (source.status !== 'submitted') {
        throw new HttpsError(
          'failed-precondition',
          'Only submitted service requests can be rejected.'
        );
      }

      tx.update(sourceRef, {
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
                : null,
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        sourceRequestId,
        approvalStatus: 'rejected',
      };
    }
  );

  return result;
});
