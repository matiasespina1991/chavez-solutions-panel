'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
  type UserCredential
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

type PlanTier = 'starter' | 'pro' | 'enterprise';

export interface DemoOrganization {
  id: string;
  name: string;
  description: string;
  plan: PlanTier;
  imageUrl?: string;
  members: number;
  storageUsedGb: number;
}

export interface DemoUser {
  id: string;
  fullName: string;
  emailAddresses: Array<{ emailAddress: string }>;
  imageUrl?: string;
  role: 'admin' | 'editor' | 'viewer';
}

interface AuthSessionContextValue {
  user: DemoUser | null;
  organizations: DemoOrganization[];
  activeOrgId: string;
  activeOrganization: DemoOrganization;
  selectOrganization: (id: string) => void;
  authReady: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<UserCredential>;
  signOut: () => Promise<void>;
}

const googleProvider = new GoogleAuthProvider();

const demoOrganizations: DemoOrganization[] = [
  {
    id: 'org_creative_house',
    name: 'Creative House',
    description: 'Portfolio operations and editorial workflow',
    plan: 'pro',
    imageUrl: undefined,
    members: 12,
    storageUsedGb: 187
  },
  {
    id: 'org_lab',
    name: 'Lab Experiments',
    description: 'Experimental shoots and prototypes',
    plan: 'starter',
    imageUrl: undefined,
    members: 4,
    storageUsedGb: 52
  },
  {
    id: 'org_archive',
    name: 'Archive Atelier',
    description: 'Historical catalog and press outreach',
    plan: 'enterprise',
    imageUrl: undefined,
    members: 18,
    storageUsedGb: 402
  }
];

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

type AuthorizedUser = {
  email: string;
  role?: DemoUser['role'];
};

function mapFirebaseUser(user: User, role: DemoUser['role']): DemoUser {
  const email = user.email ?? '';
  return {
    id: user.uid,
    fullName: user.displayName ?? email ?? 'Admin',
    emailAddresses: [{ emailAddress: email }],
    imageUrl: user.photoURL ?? undefined,
    role
  };
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeOrgId, setActiveOrgId] = useState(demoOrganizations[0].id);
  const [firebaseUser, setFirebaseUser] = useState<DemoUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!active) return;
      setAuthReady(false);

      if (!user) {
        setFirebaseUser(null);
        setAuthReady(true);
        return;
      }

      const checkAuthorized = async () => {
        try {
          const snap = await getDoc(doc(db, 'config', 'default'));
          const data = snap.data() as {
            authorizedUsers?: AuthorizedUser[];
          };
          const authorizedUsers = data?.authorizedUsers ?? [];
          const email = (user.email ?? '').toLowerCase();
          const match = authorizedUsers.find(
            (entry) => entry.email?.toLowerCase() === email
          );

          if (!match) {
            setAuthError(
              'No estas autorizado para ingresar al dashboard.'
            );
            await firebaseSignOut(auth);
            if (!active) return;
            setFirebaseUser(null);
            setAuthReady(true);
            return;
          }

          const role = match.role ?? 'viewer';
          setFirebaseUser(mapFirebaseUser(user, role));
          setAuthError(null);
          setAuthReady(true);
        } catch (error) {
          console.error('[Auth] authorization check failed', error);
          setAuthError('No se pudo validar tu acceso. Intenta de nuevo.');
          await firebaseSignOut(auth);
          if (!active) return;
          setFirebaseUser(null);
          setAuthReady(true);
        }
      };

      void checkAuthorized();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => {
    const activeOrganization =
      demoOrganizations.find((org) => org.id === activeOrgId) ??
      demoOrganizations[0];

    return {
      user: firebaseUser,
      organizations: demoOrganizations,
      activeOrgId,
      activeOrganization,
      selectOrganization: setActiveOrgId,
      authReady,
      authError,
      clearAuthError: () => setAuthError(null),
      signInWithGoogle: () => signInWithPopup(auth, googleProvider),
      signOut: () => firebaseSignOut(auth)
    };
  }, [activeOrgId, authReady, firebaseUser]);

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error('useAuthSession must be used within AuthSessionProvider');
  }
  return ctx;
}
