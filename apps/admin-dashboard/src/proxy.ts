import { NextResponse, type NextRequest } from 'next/server';

export default function proxy(_request: NextRequest) {
  // TODO: plug Firebase Auth checks here to block unauthenticated dashboard access.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'
  ]
};
