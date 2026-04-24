import Providers from '@/components/layout/providers';
import { Toaster } from '@/components/ui/sonner';
import { fontVariables } from '@/lib/font';
import ThemeProvider from '@/components/layout/ThemeToggle/theme-provider';
import { cn } from '@/lib/utils';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import NextTopLoader from 'nextjs-toploader';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import './globals.css';
import './theme.css';

const META_THEME_COLORS = {
  light: '#ffffff',
  dark: '#09090b'
};

export const metadata: Metadata = {
  title: 'Chavez Solutions Web Admin Dashboard',
  description: 'Panel de administración para Chavez Solutions Web'
};

export const viewport: Viewport = {
  themeColor: META_THEME_COLORS.light
};

export default async function RootLayout({
  children
}: {
  readonly children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const activeThemeValue = cookieStore.get('active_theme')?.value;
  const isAutoTheme = activeThemeValue?.startsWith('auto');
  const initialThemeValue = isAutoTheme
    ? activeThemeValue === 'auto-blue'
      ? 'blue'
      : activeThemeValue === 'auto-gray'
        ? 'gray'
        : 'default'
    : (activeThemeValue ?? 'default');
  const isScaled = initialThemeValue?.endsWith('-scaled');

  return (
    <html suppressHydrationWarning lang='en'>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || ((!('theme' in localStorage) || localStorage.theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.querySelector('meta[name="theme-color"]').setAttribute('content', '${META_THEME_COLORS.dark}')
                }
              } catch (_) {}
            `
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={cn(
          'bg-background overflow-hidden overscroll-none font-sans antialiased',
          initialThemeValue ? `theme-${initialThemeValue}` : 'theme-default',
          isScaled ? 'theme-scaled' : '',
          fontVariables
        )}
      >
        <NextTopLoader color='var(--primary)' showSpinner={false} />
        <NuqsAdapter>
          <ThemeProvider
            enableSystem
            disableTransitionOnChange
            enableColorScheme
            attribute='class'
            defaultTheme='system'
          >
            <Providers activeThemeValue={activeThemeValue!}>
              <Toaster />
              {children}
            </Providers>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
