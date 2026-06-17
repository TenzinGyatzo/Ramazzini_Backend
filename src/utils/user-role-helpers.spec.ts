import { canManageTenantUsers, canInviteUsers, isPlatformAdministrador } from './user-role-helpers';

describe('user-role-helpers', () => {
  it('canManageTenantUsers permite Principal y Administrador', () => {
    expect(canManageTenantUsers('Principal')).toBe(true);
    expect(canManageTenantUsers('Administrador')).toBe(true);
    expect(canInviteUsers('Principal')).toBe(true);
  });

  it('canManageTenantUsers niega roles operativos', () => {
    expect(canManageTenantUsers('Médico')).toBe(false);
    expect(canManageTenantUsers('Administrativo')).toBe(false);
  });

  it('isPlatformAdministrador solo permite Administrador', () => {
    expect(isPlatformAdministrador('Administrador')).toBe(true);
    expect(isPlatformAdministrador('Principal')).toBe(false);
  });
});
