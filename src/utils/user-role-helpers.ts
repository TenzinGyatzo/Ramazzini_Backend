export function canManageTenantUsers(role: string): boolean {
  return role === 'Principal' || role === 'Administrador';
}

/** Solo el operador de plataforma (Administrador). */
export function isPlatformAdministrador(role: string): boolean {
  return role === 'Administrador';
}

/** @alias canManageTenantUsers */
export const canInviteUsers = canManageTenantUsers;
