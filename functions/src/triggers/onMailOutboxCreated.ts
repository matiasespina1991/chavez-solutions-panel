import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import admin from 'firebase-admin';
import {
  generateAndStoreProformaPreviewPdf,
  ProformaPreviewPayload
} from '../utils/proformaPreviewPdf.js';
import { sendWithGmailApi } from '../utils/gmail.js';

const db = admin.firestore();
const MAIL_OUTBOX_COLLECTION = 'mail_outbox';

interface MailOutboxData {
  type?: string;
  status?: string;
  sourceRequestId?: string;
  to?: string;
  subject?: string;
  attempts?: number;
}

interface ServiceRequestSource {
  reference?: string | null;
  matrix?: string[] | null;
  createdAt?: admin.firestore.Timestamp | Date | null;
  client?: {
    businessName?: string | null;
    taxId?: string | null;
    contactName?: string | null;
    address?: string | null;
    city?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  services?: Array<{
    parameterLabel?: string | null;
    unit?: string | null;
    method?: string | null;
    rangeMin?: string | null;
    rangeMax?: string | null;
    quantity?: number | null;
    unitPrice?: number | null;
    discountAmount?: number | null;
  }> | null;
  pricing?: {
    subtotal?: number | null;
    taxPercent?: number | null;
    total?: number | null;
    validDays?: number | null;
  } | null;
}

const MATRIX_LABELS: Record<string, string> = {
  water: 'Agua',
  soil: 'Suelo',
  noise: 'Ruido',
  gases: 'Gases'
};

const formatDate = (date: Date): string => {
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    const maybeDate = (value as { toDate?: () => Date }).toDate?.();
    if (maybeDate instanceof Date && !Number.isNaN(maybeDate.getTime())) {
      return maybeDate;
    }
  }
  return null;
};

const toPreviewPayload = (
  requestId: string,
  source: ServiceRequestSource
): ProformaPreviewPayload => {
  const createdAt = toDate(source.createdAt) ?? new Date();
  const validDays = Number(source.pricing?.validDays ?? 30);
  const normalizedValidDays = Number.isFinite(validDays) && validDays > 0 ? validDays : 30;
  const validUntil = new Date(createdAt);
  validUntil.setDate(validUntil.getDate() + normalizedValidDays);

  const services = Array.isArray(source.services) ? source.services : [];

  return {
    reference: source.reference || requestId,
    matrixLabels: Array.isArray(source.matrix)
      ? source.matrix
          .map((value) => {
            const key = String(value || '').trim().toLowerCase();
            return MATRIX_LABELS[key] ?? String(value || '').trim();
          })
          .filter((value) => value.length > 0)
      : [],
    validDays: normalizedValidDays,
    issuedAtLabel: formatDate(createdAt),
    validUntilLabel: formatDate(validUntil),
    client: {
      businessName: source.client?.businessName || '',
      taxId: source.client?.taxId || '',
      contactName: source.client?.contactName || '',
      address: source.client?.address || '',
      city: source.client?.city || '',
      email: source.client?.email || '',
      phone: source.client?.phone || '',
      mobile: source.client?.phone || ''
    },
    services: services.map((service) => {
      const quantity = Number(service.quantity ?? 0);
      const safeQuantity =
        Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 0;
      const unitPrice =
        typeof service.unitPrice === 'number' && Number.isFinite(service.unitPrice)
          ? service.unitPrice
          : null;
      const discountAmount =
        typeof service.discountAmount === 'number' &&
        Number.isFinite(service.discountAmount)
          ? service.discountAmount
          : null;
      const subtotal =
        unitPrice === null
          ? null
          : Math.max(0, safeQuantity * unitPrice - (discountAmount ?? 0));

      return {
        label: service.parameterLabel || 'Servicio',
        unit: service.unit || '',
        method: service.method || '',
        rangeOffered: `${service.rangeMin || '—'} a ${service.rangeMax || '—'}`,
        quantity: safeQuantity,
        unitPrice,
        discountAmount,
        subtotal
      };
    }),
    pricing: {
      subtotal:
        typeof source.pricing?.subtotal === 'number' &&
        Number.isFinite(source.pricing.subtotal)
          ? source.pricing.subtotal
          : 0,
      taxPercent:
        typeof source.pricing?.taxPercent === 'number' &&
        Number.isFinite(source.pricing.taxPercent)
          ? source.pricing.taxPercent
          : 15,
      total:
        typeof source.pricing?.total === 'number' && Number.isFinite(source.pricing.total)
          ? source.pricing.total
          : 0
    }
  };
};

export const onMailOutboxCreated = onDocumentCreated(
  {
    document: `${MAIL_OUTBOX_COLLECTION}/{mailId}`,
    region: 'europe-west3',
    retry: false,
    maxInstances: 10,
  },
  async (event) => {
    const snap = event.data;
    if (!snap?.exists) return;

    const mailId = snap.id;
    const outbox = snap.data() as MailOutboxData;
    const outboxRef = db.collection(MAIL_OUTBOX_COLLECTION).doc(mailId);

    if (outbox.status && outbox.status !== 'pending') return;
    if (outbox.type !== 'proforma_submitted') return;
    if (!outbox.sourceRequestId || !outbox.to) {
      await outboxRef.set(
        {
          status: 'failed',
          lastError: 'missing-required-fields',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return;
    }

    await outboxRef.set(
      {
        status: 'processing',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    try {
      const requestSnap = await db
        .collection('service_requests')
        .doc(outbox.sourceRequestId)
        .get();
      if (!requestSnap.exists) {
        throw new Error('source-request-not-found');
      }

      const source = requestSnap.data() as ServiceRequestSource;
      const pdf = await generateAndStoreProformaPreviewPdf({
        uid: 'mail-outbox',
        payload: toPreviewPayload(requestSnap.id, source)
      });

      const file = admin.storage().bucket().file(pdf.storagePath);
      const [buffer] = await file.download();

      await sendWithGmailApi({
        to: outbox.to,
        subject: outbox.subject || `Proforma ${requestSnap.id}`,
        text: `Adjunto encontrarás la proforma ${source.reference || requestSnap.id}.`,
        attachment: {
          filename: pdf.fileName,
          contentBase64: buffer.toString('base64'),
          mimeType: 'application/pdf',
        },
      });

      await outboxRef.set(
        {
          status: 'sent',
          attempts: Number(outbox.attempts || 0) + 1,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          storagePath: pdf.storagePath,
          downloadURL: pdf.downloadURL,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'mail-send-failed';

      await outboxRef.set(
        {
          status: 'failed',
          attempts: Number(outbox.attempts || 0) + 1,
          lastError: message,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      throw error;
    }
  }
);
