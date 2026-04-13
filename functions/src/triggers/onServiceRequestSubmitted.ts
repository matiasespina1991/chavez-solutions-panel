import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import admin from 'firebase-admin';

const db = admin.firestore();
const MAIL_OUTBOX_COLLECTION = 'mail_outbox';

interface ServiceRequestClient {
  businessName?: string | null;
  email?: string | null;
}

interface ServiceRequestData {
  status?: string;
  reference?: string;
  matrix?: string[];
  pricing?: {
    total?: number | null;
  } | null;
  client?: ServiceRequestClient | null;
}

const MATRIX_LABELS: Record<string, string> = {
  water: 'Agua',
  soil: 'Suelo',
  noise: 'Ruido',
  gases: 'Gases',
};
const ALLOWED_MATRICES = new Set(Object.keys(MATRIX_LABELS));

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

const toMatrixLabel = (matrix: string[]) =>
  matrix.length
    ? matrix
        .map((entry) => MATRIX_LABELS[entry] ?? entry)
        .join(', ')
    : '—';

export const onServiceRequestSubmitted = onDocumentWritten(
  {
    document: 'requests/{requestId}',
    region: 'europe-west3',
    retry: false,
    maxInstances: 10,
  },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;

    const beforeData = event.data?.before?.exists
      ? (event.data.before.data() as ServiceRequestData)
      : null;
    const afterData = after.data() as ServiceRequestData;

    const afterStatus = afterData.status;
    const beforeStatus = beforeData?.status;
    if (afterStatus !== 'submitted') return;
    if (beforeStatus === 'submitted') return;

    const recipient = (afterData.client?.email || '').trim();
    if (!recipient) {
      console.warn('[onServiceRequestSubmitted] missing recipient email', {
        requestId: after.id,
      });
      return;
    }

    const outboxId = `proforma_submitted_${after.id}`;
    const outboxRef = db.collection(MAIL_OUTBOX_COLLECTION).doc(outboxId);

    try {
      const matrix = normalizeMatrixArray(afterData.matrix);
      await outboxRef.create({
        type: 'proforma_submitted',
        status: 'pending',
        sourceRequestId: after.id,
        to: recipient,
        subject: `Proforma ${afterData.reference || after.id}`,
        payload: {
          reference: afterData.reference || '',
          matrix,
          matrixLabel: toMatrixLabel(matrix),
          clientBusinessName: afterData.client?.businessName || '',
          total: Number(afterData.pricing?.total || 0),
        },
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      // Idempotency: document already exists for this event.
      const alreadyExists =
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: number }).code === 6;

      if (alreadyExists) return;
      throw error;
    }
  }
);
