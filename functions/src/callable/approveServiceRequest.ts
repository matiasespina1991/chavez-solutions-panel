import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';

const db = admin.firestore();

interface ApproveServiceRequestRequest {
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

type ServiceRequestApprovalStatus = 'pending' | 'approved' | 'rejected';

interface ServiceRequestData {
  status?: ServiceRequestStatus;
  linkedWorkOrderId?: string | null;
  approval?: {
    status?: ServiceRequestApprovalStatus;
  } | null;
}

interface ApproveServiceRequestResponse {
  sourceRequestId: string;
  approvalStatus: 'approved';
  alreadyApproved: boolean;
}

const NON_APPROVABLE_STATUSES: ServiceRequestStatus[] = [
  'converted_to_work_order',
  'work_order_paused',
  'work_order_completed',
  'cancelled',
];

export const approveServiceRequest = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const data = (req.data || {}) as ApproveServiceRequestRequest;
  const sourceRequestId = data.sourceRequestId?.trim();
  const feedback =
    typeof data.feedback === 'string' ? data.feedback.trim() : undefined;

  if (!sourceRequestId) {
    throw new HttpsError('invalid-argument', 'sourceRequestId is required.');
  }

  const sourceRef = db.collection('requests').doc(sourceRequestId);

  const result = await db.runTransaction<ApproveServiceRequestResponse>(
    async (tx) => {
      const sourceSnap = await tx.get(sourceRef);

      if (!sourceSnap.exists) {
        throw new HttpsError('not-found', 'Service request not found.');
      }

      const source = sourceSnap.data() as ServiceRequestData;

      if (
        source.linkedWorkOrderId ||
        (source.status !== undefined &&
          NON_APPROVABLE_STATUSES.includes(source.status))
      ) {
        throw new HttpsError(
          'failed-precondition',
          'This service request cannot be approved in its current status.'
        );
      }

      if (source.status === 'draft') {
        throw new HttpsError(
          'failed-precondition',
          'Draft service requests cannot be approved.'
        );
      }

      if (source.approval?.status === 'approved') {
        return {
          sourceRequestId,
          approvalStatus: 'approved',
          alreadyApproved: true,
        };
      }

      tx.update(sourceRef, {
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
                : null,
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        sourceRequestId,
        approvalStatus: 'approved',
        alreadyApproved: false,
      };
    }
  );

  return result;
});
