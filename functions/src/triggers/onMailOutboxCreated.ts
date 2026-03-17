import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import admin from 'firebase-admin';
import {
  generateAndStoreProformaPdf,
  ServiceRequestPdfSource,
} from '../utils/proformaPdf.js';

const db = admin.firestore();
const MAIL_OUTBOX_COLLECTION = 'mail_outbox';
const DEFAULT_MAIL_FROM = 'no-reply@chavez-solutions.local';

interface MailOutboxData {
  type?: string;
  status?: string;
  sourceRequestId?: string;
  to?: string;
  subject?: string;
  attempts?: number;
}

const toBase64Url = (value: string) =>
  Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const getGmailAccessToken = async () => {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN are required.'
    );
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `gmail-token-request-failed (${response.status}): ${body || 'no-body'}`
    );
  }

  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error('gmail-access-token-missing');
  }

  return json.access_token;
};

const sendWithGmailApi = async (params: {
  to: string;
  subject: string;
  text: string;
  attachment: {
    filename: string;
    contentBase64: string;
    mimeType: string;
  };
}) => {
  const fromEmail = process.env.MAIL_FROM || DEFAULT_MAIL_FROM;
  const accessToken = await getGmailAccessToken();

  const boundary = `mail_boundary_${Date.now()}`;
  const attachmentBoundary = `attachment_boundary_${Date.now()}`;

  const mimeMessage = [
    `From: Chavez Solutions <${fromEmail}>`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    params.text,
    '',
    `--${boundary}`,
    `Content-Type: ${params.attachment.mimeType}; name="${params.attachment.filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${params.attachment.filename}"`,
    `Content-ID: <${attachmentBoundary}>`,
    '',
    params.attachment.contentBase64,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const raw = toBase64Url(mimeMessage);

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `gmail-send-failed (${response.status}): ${body || 'no-body'}`
    );
  }
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
