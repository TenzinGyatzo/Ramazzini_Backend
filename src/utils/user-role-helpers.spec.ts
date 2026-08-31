import {
  canManageTenantUsers,
  canInviteUsers,
  isPlatformAdministrador,
  isPlatformAdminEmail,
  canChangeRegimenRegulatorio,
} from './user-role-helpers';

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

  it('isPlatformAdminEmail solo permite el correo del operador de plataforma', () => {
    expect(isPlatformAdminEmail('edgarcoronel66@gmail.com')).toBe(true);
    expect(isPlatformAdminEmail('EdgarCoronel66@gmail.com')).toBe(true);
    expect(isPlatformAdminEmail('otro@example.com')).toBe(false);
    expect(isPlatformAdminEmail(undefined)).toBe(false);
  });

  it('canChangeRegimenRegulatorio solo permite Principal', () => {
    expect(canChangeRegimenRegulatorio('Principal')).toBe(true);
    expect(canChangeRegimenRegulatorio('Administrador')).toBe(false);
    expect(canChangeRegimenRegulatorio('Médico')).toBe(false);
  });
});
