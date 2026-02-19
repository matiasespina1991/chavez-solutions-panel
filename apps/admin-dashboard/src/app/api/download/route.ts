import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = new Set([
  'firebasestorage.googleapis.com',
  'storage.googleapis.com'
]);

function sanitizeFilename(value: string) {
  const sanitized = value
    .replace(/[/\\?%*:|"<>]/g, '_')
    .trim()
    .slice(0, 180);
  return sanitized || 'download';
}

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get('url');
  const requestedName = request.nextUrl.searchParams.get('name') || 'download';

  if (!sourceUrl) {
    return NextResponse.json(
      { error: 'Missing "url" query param.' },
      { status: 400 }
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid source URL.' }, { status: 400 });
  }

  if (parsedUrl.protocol !== 'https:') {
    return NextResponse.json(
      { error: 'Only HTTPS source URLs are allowed.' },
      { status: 400 }
    );
  }

  if (!ALLOWED_HOSTS.has(parsedUrl.hostname)) {
    return NextResponse.json(
      { error: 'Source host is not allowed.' },
      { status: 400 }
    );
  }

  const upstream = await fetch(parsedUrl.toString(), {
    method: 'GET',
    cache: 'no-store',
    redirect: 'follow'
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: 'Failed to fetch source file.' },
      { status: upstream.status || 502 }
    );
  }

  const filename = sanitizeFilename(requestedName);
  const headers = new Headers();
  headers.set(
    'Content-Type',
    upstream.headers.get('content-type') || 'application/octet-stream'
  );
  headers.set(
    'Content-Disposition',
    `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  headers.set('Cache-Control', 'no-store');

  const contentLength = upstream.headers.get('content-length');
  if (contentLength) {
    headers.set('Content-Length', contentLength);
  }

  return new Response(upstream.body, {
    status: 200,
    headers
  });
}
