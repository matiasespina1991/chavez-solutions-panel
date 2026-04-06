import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import admin from 'firebase-admin';
import {
  generateAndStoreProformaPdf,
  ServiceRequestPdfSource,
} from '../utils/proformaPdf.js';
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

      const source = requestSnap.data() as Omit<ServiceRequestPdfSource, 'id'>;
      const pdf = await generateAndStoreProformaPdf({
        id: requestSnap.id,
        ...source,
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
