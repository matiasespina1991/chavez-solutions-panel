import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore.js';

const db = admin.firestore();

interface SaveWorkOrderLabAnalysisRequest {
  workOrderId?: string;
  analyses?: Array<{
    parameterLabelEs?: string;
    resultValue?: string;
    unit?: string;
    method?: string;
  }>;
  notes?: string;
}

interface WorkOrderData {
  status?: string;
  workOrderNumber?: string;
}

const sanitizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

export const saveWorkOrderLabAnalysis = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const data = (req.data || {}) as SaveWorkOrderLabAnalysisRequest;
  const workOrderId = sanitizeText(data.workOrderId);
  const notes = sanitizeText(data.notes);

  if (!workOrderId) {
    throw new HttpsError('invalid-argument', 'workOrderId is required.');
  }

  const incomingAnalyses = Array.isArray(data.analyses) ? data.analyses : [];

  const normalizedAnalyses = incomingAnalyses
    .map((entry) => ({
      parameterLabelEs: sanitizeText(entry?.parameterLabelEs),
      resultValue: sanitizeText(entry?.resultValue),
      unit: sanitizeText(entry?.unit),
      method: sanitizeText(entry?.method),
    }))
    .filter((entry) => entry.parameterLabelEs && entry.resultValue);

  if (normalizedAnalyses.length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'At least one analysis with parameter and result is required.'
    );
  }

  const workOrderRef = db.collection(FIRESTORE_COLLECTIONS.WORK_ORDERS).doc(workOrderId);

  const result = await db.runTransaction(async (tx) => {
    const workOrderSnap = await tx.get(workOrderRef);

    if (!workOrderSnap.exists) {
      throw new HttpsError('not-found', 'Work order not found.');
    }

    const workOrder = workOrderSnap.data() as WorkOrderData;

    if (workOrder.status === 'cancelled') {
      throw new HttpsError(
        'failed-precondition',
        'Cannot save lab analysis for a cancelled work order.'
      );
    }

    const capturedAt = new Date().toISOString();

    tx.update(workOrderRef, {
      analyses: {
        applyMode: 'all_samples',
        items: normalizedAnalyses.map((entry, index) => ({
          parameterId: `lab-${index + 1}`,
          parameterLabelEs: entry.parameterLabelEs,
          unit: entry.unit,
          method: entry.method,
          rangeOffered: '',
          isAccredited: false,
          turnaround: 'standard',
          unitPrice: 0,
          appliesToSampleCodes: null,
          resultValue: entry.resultValue,
          capturedAt,
        })),
      },
      labAnalysis: {
        status: 'recorded',
        notes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: {
          uid: req.auth?.uid ?? null,
          email:
            typeof req.auth?.token?.email === 'string'
              ? req.auth.token.email
              : null,
        },
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      workOrderId,
      workOrderNumber: workOrder.workOrderNumber ?? workOrderId,
      savedCount: normalizedAnalyses.length,
      status: 'recorded' as const,
    };
  });

  return result;
});
