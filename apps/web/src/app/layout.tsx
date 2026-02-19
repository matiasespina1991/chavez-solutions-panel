// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import Header from './components/Header';
import ThemeRegistry from './ThemeRegistry';
import { isMobile } from 'react-device-detect';

import { Box, Typography } from '@mui/material';
import dynamic from 'next/dynamic';
const CSAnimatedCursor = dynamic(() => import('./CSAnimatedCursor'), {
  ssr: false,
});
const AnalyticsTracker = dynamic(
  () => import('../components/analytics/analytics-tracker'),
  { ssr: false }
);
const isDevBranch =
  process.env.NEXT_PUBLIC_DEPLOY_ENV === 'dev' ||
  process.env.NODE_ENV === 'development';

const SITE_URL =
  'https://laura-butallo-web-backend--laura-butallo-web.us-central1.hosted.app/';
const OG_IMAGE =
  'https://firebasestorage.googleapis.com/v0/b/laura-butallo-web.firebasestorage.app/o/system%2Fseo%2Fog_image.jpg?alt=media&token=633936e5-c2f4-46b8-9d27-435aa845849a'; //
const SITE_NAME = 'Laura Butallo';
const DESCRIPTION =
  'Laura Butallo a.k.a Aura is an Argentinean digital artist, dedicated to the creation of abstract 3D ecosystems. She fuses colours, textures and shapes to create dreamlike and fluid worlds, where there is no human presence. Aura is also a DJ and multimedia designer. Currently she is also experimenting with artificial intelligence to push the limits of her worlds and magical caves.';

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} | Home`,
    template: `${SITE_NAME} | %s`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Laura Butallo' }],
  openGraph: {
    title: SITE_NAME,
    description: DESCRIPTION,
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_US',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: DESCRIPTION,
    images: [OG_IMAGE],
    creator: '@your_twitter_handle', // Replace with actual Twitter handle if available
  },
  metadataBase: new URL(SITE_URL),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    // apple: '/apple-touch-icon.png',
    // other: [
    //   { rel: 'icon', url: '/favicon-32x32.png', sizes: '32x32' },
    //   { rel: 'icon', url: '/favicon-16x16.png', sizes: '16x16' },
    // ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Prevent FOUC (Flash of Unstyled Content) for dark mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedMode = localStorage.getItem('themeMode');
                if (savedMode === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
        {/* Explicit meta tags for crawlers that might not use Next metadata API */}
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:title" content={SITE_NAME} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:alt" content={SITE_NAME} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_NAME} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />

        <meta name="theme-color" content="#ededed" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />

        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" /> */}
      </head>

      <body>
        {!isMobile && <CSAnimatedCursor />}
        <ThemeRegistry>
          <Header />
          {!isDevBranch && <AnalyticsTracker />}
          <Box mt="64px">{children}</Box>
        </ThemeRegistry>
      </body>
    </html>
  );
}
