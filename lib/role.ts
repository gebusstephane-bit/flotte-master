// Gestion des roles utilisateur — RBAC avec Supabase Auth
// 4 rôles: admin, direction, agent_parc, exploitation

export type UserRole = 'admin' | 'direction' | 'agent_parc' | 'exploitation';

export const ALL_ROLES: UserRole[] = ['admin', 'direction', 'agent_parc', 'exploitation'];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  direction: 'Direction',
  agent_parc: 'Agent Parc',
  exploitation: 'Exploitation',
};

export interface Permissions {
  canValidateDevis: boolean;
  canPlanRdv: boolean;
  canCompleteIntervention: boolean;
  canEditVehicle: boolean;
  canManageUsers: boolean;
  canUploadDevis: boolean;
  canDownloadDevis: boolean;
  canDeleteVehicle: boolean;
  canDeleteIntervention: boolean;
  canDeleteUser: boolean;
}

export const PERMISSIONS: Record<UserRole, Permissions> = {
  admin: {
    canValidateDevis: true,
    canPlanRdv: true,
    canCompleteIntervention: true,
    canEditVehicle: true,
    canManageUsers: true,
    canUploadDevis: true,
    canDownloadDevis: true,
    canDeleteVehicle: true,
    canDeleteIntervention: true,
    canDeleteUser: true,
  },
  direction: {
    canValidateDevis: true,
    canPlanRdv: false,
    canCompleteIntervention: false,
    canEditVehicle: true,
    canManageUsers: true,
    canUploadDevis: true,
    canDownloadDevis: true,
    canDeleteVehicle: true,
    canDeleteIntervention: true,
    canDeleteUser: false,
  },
  agent_parc: {
    canValidateDevis: false,
    canPlanRdv: true,
    canCompleteIntervention: true,
    canEditVehicle: true,
    canManageUsers: false,
    canUploadDevis: true,
    canDownloadDevis: true,
    canDeleteVehicle: false,
    canDeleteIntervention: false,
    canDeleteUser: false,
  },
  exploitation: {
    canValidateDevis: false,
    canPlanRdv: false,
    canCompleteIntervention: false,
    canEditVehicle: false,
    canManageUsers: false,
    canUploadDevis: false,
    canDownloadDevis: false,
    canDeleteVehicle: false,
    canDeleteIntervention: false,
    canDeleteUser: false,
  },
} as const;

export function getPermissions(role: UserRole): Permissions {
  return PERMISSIONS[role] ?? PERMISSIONS.exploitation;
}

// Legacy compat — localStorage for DEV mode role switcher
const ROLE_STORAGE_KEY = 'fleet_user_role';

export function getUserRole(): UserRole {
  if (typeof window === 'undefined') return 'exploitation';
  const stored = localStorage.getItem(ROLE_STORAGE_KEY);
  if (stored && ALL_ROLES.includes(stored as UserRole)) {
    return stored as UserRole;
  }
  return 'exploitation';
}

export function setUserRole(role: UserRole): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ROLE_STORAGE_KEY, role);
}
