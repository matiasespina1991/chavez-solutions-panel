import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore.js';

type AppUserRole =
  | 'admin'
  | 'order-supervisor'
  | 'logistics'
  | 'technician'
  | 'analyst'
  | 'editor'
  | 'viewer';

const PERMISSION_ROLE_MAP = {
  'requests.approve': ['admin', 'order-supervisor'],
  'requests.reject': ['admin', 'order-supervisor'],
  'requests.delete': ['admin', 'order-supervisor'],
  'work_orders.execute': ['admin', 'order-supervisor'],
  'work_orders.pause_resume': [
    'admin',
    'order-supervisor',
    'logistics',
    'technician',
  ],
  'work_orders.complete': [
    'admin',
    'order-supervisor',
    'technician',
    'analyst',
  ],
  'lab.save': ['admin', 'order-supervisor', 'technician', 'analyst'],
  'services_catalog.read_history': ['admin', 'editor'],
  'services_catalog.write': ['admin', 'editor'],
  'services_catalog.delete': ['admin', 'editor'],
  'services_catalog.import': ['admin', 'editor'],
} as const satisfies Record<string, AppUserRole[]>;

export type AppPermission = keyof typeof PERMISSION_ROLE_MAP;

interface AuthorizedUserConfigEntry {
  email?: string;
  role?: AppUserRole;
}

let cachedRolesByEmail: Map<string, AppUserRole> | null = null;
let cachedAtMs = 0;
const AUTHORIZED_USERS_CACHE_TTL_MS = 60_000;

const isAppUserRole = (value: unknown): value is AppUserRole => {
  return (
    value === 'admin' ||
    value === 'order-supervisor' ||
    value === 'logistics' ||
    value === 'technician' ||
    value === 'analyst' ||
    value === 'editor' ||
    value === 'viewer'
  );
};

const getTokenRole = (token: Record<string, unknown>): AppUserRole | null => {
  const directRole = token.role;
  if (isAppUserRole(directRole)) return directRole;

  const roles = token.roles;
  if (Array.isArray(roles)) {
    const firstValidRole = roles.find((entry) => isAppUserRole(entry));
    if (firstValidRole && isAppUserRole(firstValidRole)) {
      return firstValidRole;
    }
  }

  return null;
};

const loadAuthorizedRolesByEmail = async (): Promise<
  Map<string, AppUserRole>
> => {
  const now = Date.now();
  if (cachedRolesByEmail && now - cachedAtMs < AUTHORIZED_USERS_CACHE_TTL_MS) {
    return cachedRolesByEmail;
  }

  const snap = await admin
    .firestore()
    .collection(FIRESTORE_COLLECTIONS.CONFIG)
    .doc('default')
    .get();

  const data = snap.data() as
    | { authorizedUsers?: AuthorizedUserConfigEntry[] }
    | undefined;
  const entries = Array.isArray(data?.authorizedUsers)
    ? data.authorizedUsers
    : [];

  const map = new Map<string, AppUserRole>();
  entries.forEach((entry) => {
    const email =
      typeof entry.email === 'string' ? entry.email.trim().toLowerCase() : '';
    if (!email || !isAppUserRole(entry.role)) return;
    map.set(email, entry.role);
  });

  cachedRolesByEmail = map;
  cachedAtMs = now;
  return map;
};

const resolveUserRole = async (
  req: CallableRequest<unknown>
): Promise<AppUserRole | null> => {
  if (!req.auth) return null;

  const token = req.auth.token as Record<string, unknown>;
  const roleFromToken = getTokenRole(token);
  if (roleFromToken) return roleFromToken;

  const email =
    typeof token.email === 'string' ? token.email.trim().toLowerCase() : '';
  if (!email) return null;

  const rolesByEmail = await loadAuthorizedRolesByEmail();
  return rolesByEmail.get(email) ?? null;
};

export const requirePermission = async (
  req: CallableRequest<unknown>,
  permission: AppPermission
): Promise<AppUserRole> => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const role = await resolveUserRole(req);
  if (!role) {
    throw new HttpsError(
      'permission-denied',
      'Your current user role does not grant you permission to execute this task.'
    );
  }

  const allowedRoles = PERMISSION_ROLE_MAP[
    permission
  ] as readonly AppUserRole[];
  if (!allowedRoles.some((allowedRole) => allowedRole === role)) {
    throw new HttpsError(
      'permission-denied',
      `Role "${role}" cannot execute permission "${permission}".`
    );
  }

  return role;
};
