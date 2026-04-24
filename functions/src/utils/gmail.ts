const DEFAULT_MAIL_FROM = 'no-reply@chavez-solutions.local';

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
      grant_type: 'refresh_token'
    })
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

export const sendWithGmailApi = async (params: {
  to: string;
  subject: string;
  text: string;
  attachment?: {
    filename: string;
    contentBase64: string;
    mimeType: string;
  };
}) => {
  const fromEmail = process.env.MAIL_FROM || DEFAULT_MAIL_FROM;
  const accessToken = await getGmailAccessToken();

  const boundary = `mail_boundary_${Date.now()}`;

  const mimeHeader = [
    `From: Chavez Solutions <${fromEmail}>`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0'
  ];

  const mimeBody =
    params.attachment === undefined
      ? [
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        params.text
      ]
      : [
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
        '',
        params.attachment.contentBase64,
        '',
        `--${boundary}--`
      ];

  const mimeMessage = [...mimeHeader, ...mimeBody].join('\r\n');
  const raw = toBase64Url(mimeMessage);

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw })
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`gmail-send-failed (${response.status}): ${body || 'no-body'}`);
  }
};
