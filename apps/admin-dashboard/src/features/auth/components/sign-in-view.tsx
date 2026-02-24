'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Metadata } from 'next';
import { useAuthSession } from '@/contexts/auth-session';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { IconEye, IconEyeOff, IconLock } from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Authentication',
  description: 'Authentication forms built using the components.'
};

const LAST_VALID_SIGNIN_EMAIL_KEY = 'auth:last-valid-signin-email';

const isValidEmail = (value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export default function SignInViewPage({ stars: _stars }: { stars: number }) {
  const {
    signInWithEmailPassword,
    authReady,
    authError,
    clearAuthError,
    user
  } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const { setTheme } = useTheme();
  const previousThemeRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (user) return;

    const savedEmail = window.localStorage.getItem(LAST_VALID_SIGNIN_EMAIL_KEY);
    if (!savedEmail) return;
    setEmail(savedEmail);
  }, [user]);

  const handleEmailSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password.trim()) {
      toast.error('Ingresa tu correo y contraseña para continuar.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      toast.error('Ingresa un correo electrónico válido.');
      return;
    }

    try {
      setSigningIn(true);
      await signInWithEmailPassword(normalizedEmail, password);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          LAST_VALID_SIGNIN_EMAIL_KEY,
          normalizedEmail
        );
      }
      toast.success('Ingreso correcto. Redirigiendo al panel...');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className='relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
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
        <div className='w-full max-w-md space-y-3'>
          <div className='space-y-3'>
            <div className='bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full'>
              <IconLock className='h-5 w-5' />
            </div>
            <h1 className='text-2xl font-semibold'>
              Acceso al panel de control de Chavez Solutions
            </h1>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              Ingrese sus credenciales corporativas para continuar. El acceso
              está restringido al personal autorizado.
            </p>
          </div>
          <div>
            <form className='space-y-4' onSubmit={handleEmailSignIn}>
              <div className='space-y-2'>
                <Label htmlFor='email'>Correo electrónico</Label>
                <Input
                  id='email'
                  type='email'
                  autoComplete='email'
                  placeholder='nombre@chavezsolutions.com'
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={!authReady || signingIn}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='password'>Contraseña</Label>
                <div className='relative'>
                  <Input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    autoComplete='current-password'
                    className='pr-10'
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={!authReady || signingIn}
                  />
                  <button
                    type='button'
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                    title={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                    className='text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center transition-colors'
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={!authReady || signingIn}
                  >
                    {showPassword ? (
                      <IconEyeOff className='h-4 w-4' />
                    ) : (
                      <IconEye className='h-4 w-4' />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type='submit'
                className='h-11 w-full cursor-pointer bg-black text-white hover:bg-black/90 disabled:bg-black disabled:text-white'
                disabled={!authReady || signingIn}
              >
                {signingIn ? 'Validando acceso…' : 'Iniciar sesión'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
