'use client';

import { useEffect, useRef, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Metadata } from 'next';
import Link from 'next/link';
import { useAuthSession } from '@/contexts/auth-session';
import { toast } from 'sonner';
import { useStorageAssetSrc } from '@/hooks/use-storage-asset-src';
import { useTheme } from 'next-themes';

export const metadata: Metadata = {
  title: 'Authentication',
  description: 'Authentication forms built using the components.'
};

export default function SignInViewPage({ stars }: { stars: number }) {
  const { signInWithGoogle, authReady, authError, clearAuthError } =
    useAuthSession();
  const [signingIn, setSigningIn] = useState(false);
  const { setTheme } = useTheme();
  const previousThemeRef = useRef<string | null>(null);
  const { src: coverSrc, hasSource: hasCoverSrc } = useStorageAssetSrc(
    { storagePath: 'system/assets/sign-in-screen/cover-image.webp' },
    { preferDirect: false }
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!previousThemeRef.current) {
      previousThemeRef.current =
        window.localStorage.getItem('theme') ?? 'system';
    }
    setTheme('light');
    return () => {
      if (previousThemeRef.current) {
        setTheme(previousThemeRef.current);
      }
    };
  }, [setTheme]);

  useEffect(() => {
    if (!authError) return;
    toast.error(authError);
    clearAuthError();
  }, [authError, clearAuthError]);

  const handleGoogleSignIn = async () => {
    try {
      setSigningIn(true);
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className='relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <Link
        href='/examples/authentication'
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'absolute top-4 right-4 hidden md:top-8 md:right-8'
        )}
      >
        Login
      </Link>
      <div className='bg-muted relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r'>
        <div className='absolute inset-0 bg-zinc-900' />

        <div
          className='absolute inset-0 bg-cover bg-right'
          style={{
            backgroundImage:
              'url("/assets/decoration/sign-in-screen/laboratorio-ambiental.jpg")'
          }}
        />
        <div
          className='absolute inset-0 bg-cover bg-size-[21rem] bg-center bg-no-repeat'
          style={{
            backgroundImage:
              'url("/assets/branding/logos/chavez_solutions/intro-chavezsolutionslab.png")'
          }}
        />
        {/* <div className='relative z-20 mt-auto'>
          <blockquote className='space-y-2'>
            <p className='text-lg'>
              &ldquo;This starter template has saved me countless hours of work
              and helped me deliver projects to my clients faster than ever
              before.&rdquo;
            </p>
            <footer className='text-sm'>Random Dude</footer>
          </blockquote>
        </div> */}
      </div>
      <div className='relative flex h-full items-center justify-center p-4 lg:p-8'>
        {/* <div className='text-foreground absolute top-6 right-6 flex items-center gap-2 text-lg font-semibold'>
          <img
            src='/assets/branding/logos/cueva.png'
            alt='Cueva logo'
            className='h-5 w-5'
          />
          <span>Laura Butallo Web</span>
          <span className='text-muted-foreground'>·</span>
          <span>Dashboard</span>
        </div> */}
        <div className='flex w-full max-w-md flex-col items-center justify-center space-y-6'>
          <div className='text-center text-lg font-bold'>Hola de nuevo 👋</div>
          <div className='flex w-full flex-col items-center space-y-4'>
            <Button
              type='button'
              variant='outline'
              className='flex h-11 w-full max-w-[16rem] cursor-pointer items-center justify-center gap-3 rounded-full border border-[#747775] text-[15px] font-semibold'
              onClick={handleGoogleSignIn}
              disabled={!authReady || signingIn}
            >
              <img
                src='/assets/branding/logos/google_g_logo.svg'
                alt='Google'
                className='h-4 w-4'
              />
              {signingIn ? 'Ingresando…' : 'Iniciar sesión con Google'}
            </Button>
          </div>

          <p className='text-muted-foreground px-8 text-center text-xs'>
            Al hacer clic en continuar, aceptas nuestros{' '}
            <Link
              href='/terms'
              className='hover:text-primary underline underline-offset-4'
            >
              Términos de Servicio
            </Link>{' '}
            y la{' '}
            <Link
              href='/privacy'
              className='hover:text-primary underline underline-offset-4'
            >
              Política de Privacidad
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
