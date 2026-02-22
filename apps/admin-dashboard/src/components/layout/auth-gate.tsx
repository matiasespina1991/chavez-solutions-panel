'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthSession } from '@/contexts/auth-session';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuthSession();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = pathname.startsWith('/auth');

  useEffect(() => {
    if (!authReady) {
      return;
    }
    if (isAuthRoute && user) {
      router.replace('/dashboard/configurator');
      return;
    }
    if (!isAuthRoute && !user) {
      router.replace('/auth/sign-in');
    }
  }, [authReady, isAuthRoute, router, user]);

  if (isAuthRoute) {
    return children;
  }

  if (!authReady || !user) {
    return (
      <div className='text-muted-foreground flex h-[95vh] min-h-[60vh] flex-col items-center justify-center gap-1 text-sm'>
        <svg
          className='text-muted-foreground mb-2 h-6 w-6 animate-spin'
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
        >
          <circle
            className='opacity-25'
            cx='12'
            cy='12'
            r='10'
            stroke='currentColor'
            strokeWidth='4'
          ></circle>
          <path
            className='opacity-75'
            fill='currentColor'
            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
          ></path>
        </svg>
        Inicializando...
      </div>
    );
  }

  return children;
}
