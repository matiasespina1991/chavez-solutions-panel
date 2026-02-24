'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useAuthSession } from '@/contexts/auth-session';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuthSession();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = pathname.startsWith('/auth');
  const [showLoader, setShowLoader] = useState(true);
  const [isLoaderFading, setIsLoaderFading] = useState(false);

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

  useEffect(() => {
    if (isAuthRoute) {
      setShowLoader(false);
      setIsLoaderFading(false);
      return;
    }

    if (!authReady || !user) {
      setShowLoader(true);
      setIsLoaderFading(false);
      return;
    }

    setShowLoader(true);
    setIsLoaderFading(false);

    const startFadeTimeout = setTimeout(() => {
      setIsLoaderFading(true);
    }, 2000);

    const hideLoaderTimeout = setTimeout(() => {
      setShowLoader(false);
    }, 3000);

    return () => {
      clearTimeout(startFadeTimeout);
      clearTimeout(hideLoaderTimeout);
    };
  }, [authReady, isAuthRoute, user]);

  if (isAuthRoute) {
    return children;
  }

  if (showLoader || !authReady || !user) {
    return (
      <div
        className={`text-muted-foreground flex h-[97vh] min-h-[60vh] flex-col items-center justify-center gap-1 text-sm transition-opacity duration-500 ${
          authReady && user && isLoaderFading ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <motion.div
          className='mb-1 ml-1 opacity-90'
          animate={{
            scaleX: [1, 1, 1.1, 0.93, 1, 1],
            scaleY: [1, 1, 0.95, 1.08, 1, 1]
          }}
          transition={{
            duration: 2,
            ease: 'easeInOut',
            repeat: Number.POSITIVE_INFINITY
          }}
        >
          <Image
            src='/assets/branding/logos/chavez_solutions/world-logo.png'
            alt='Chavez Solutions'
            width={160}
            height={64}
            className='h-auto max-h-10 w-auto'
            priority
          />
        </motion.div>
        {/* <svg
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
        </svg> */}
        Iniciando Panel...
      </div>
    );
  }

  return children;
}
