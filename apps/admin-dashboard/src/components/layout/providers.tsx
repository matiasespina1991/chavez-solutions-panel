'use client';
import React from 'react';
import { ActiveThemeProvider } from '../active-theme';
import { AuthSessionProvider } from '@/contexts/auth-session';
import AuthGate from '@/components/layout/auth-gate';

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  return (
    <ActiveThemeProvider initialTheme={activeThemeValue}>
      <AuthSessionProvider>
        <AuthGate>{children}</AuthGate>
      </AuthSessionProvider>
    </ActiveThemeProvider>
  );
}
