/** Operador de plataforma del panel admin (mismo criterio que el frontend). */
export const PLATFORM_ADMIN_EMAIL = 'edgarcoronel66@gmail.com';

export function isPlatformAdminEmail(email: string | undefined | null): boolean {
  return email?.toLowerCase() === PLATFORM_ADMIN_EMAIL;
}

export function canManageTenantUsers(role: string): boolean {
  return role === 'Principal' || role === 'Administrador';
}

/** Solo el operador de plataforma (Administrador). */
export function isPlatformAdministrador(role: string): boolean {
  return role === 'Administrador';
}

/** @alias canManageTenantUsers */
export const canInviteUsers = canManageTenantUsers;

export function canChangeRegimenRegulatorio(role: string): boolean {
  return role === 'Principal';
}

export function canAccessAuditTrail(role: string): boolean {
  return role === 'Principal';
}
