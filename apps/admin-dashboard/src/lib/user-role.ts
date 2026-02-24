export type AppUserRole =
  | 'admin'
  | 'order-supervisor'
  | 'logistics'
  | 'technician'
  | 'analyst'
  | 'editor'
  | 'viewer';

const USER_ROLE_LABEL_MAP: Record<AppUserRole, string> = {
  admin: 'Administrador',
  'order-supervisor': 'Supervisor de órdenes',
  logistics: 'Logística',
  technician: 'Técnico',
  analyst: 'Analista',
  editor: 'Editor',
  viewer: 'Visualizador'
};

export const getUserRoleLabel = (role?: AppUserRole | null) => {
  if (!role) return 'Usuario';
  return USER_ROLE_LABEL_MAP[role] ?? 'Usuario';
};
