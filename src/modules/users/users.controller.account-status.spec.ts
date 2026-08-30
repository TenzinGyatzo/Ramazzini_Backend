import { UnauthorizedException } from '@nestjs/common';
import { UsersController } from './users.controller';

jest.mock('src/utils/auth-helpers', () => ({
  getUserIdFromRequest: jest.fn(() => 'actor-1'),
  getSidFromRequest: jest.fn(() => 'sid-1'),
}));

jest.mock('src/utils/auth-cookies', () => ({
  setAuthCookies: jest.fn(),
  clearAuthCookies: jest.fn(),
  getRefreshTokenFromCookies: jest.fn(() => 'presented-refresh'),
}));

jest.mock('src/utils/jwt', () => ({
  generateAccessToken: jest.fn(() => 'new-access'),
}));

import {
  setAuthCookies,
  clearAuthCookies,
} from 'src/utils/auth-cookies';

describe('UsersController account status (IMP-010)', () => {
  let controller: UsersController;
  let usersService: {
    findById: jest.Mock;
    findByEmail: jest.Mock;
    toggleAccountStatus: jest.Mock;
    removeUserByEmail: jest.Mock;
    assertActorCanManageTargetUser: jest.Mock;
    getIdProveedorSaludByUserId: jest.Mock;
  };
  let refreshTokenService: {
    rotate: jest.Mock;
    revoke: jest.Mock;
    revokeAllForUser: jest.Mock;
  };
  let sessionActivityService: {
    revokeAllForUser: jest.Mock;
    revokeSession: jest.Mock;
    assertAndTouchSession: jest.Mock;
  };
  let auditService: { record: jest.Mock };

  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };

  const req = { cookies: { ramazzini_refresh: 'presented-refresh' } } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    usersService = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      toggleAccountStatus: jest.fn(),
      removeUserByEmail: jest.fn(),
      assertActorCanManageTargetUser: jest.fn().mockResolvedValue(undefined),
      getIdProveedorSaludByUserId: jest.fn().mockResolvedValue('prov-1'),
    };
    refreshTokenService = {
      rotate: jest.fn(),
      revoke: jest.fn().mockResolvedValue(undefined),
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    };
    sessionActivityService = {
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
      revokeSession: jest.fn().mockResolvedValue(undefined),
      assertAndTouchSession: jest.fn().mockResolvedValue(undefined),
    };
    auditService = { record: jest.fn().mockResolvedValue(undefined) };

    controller = new UsersController(
      usersService as never,
      {} as never,
      refreshTokenService as never,
      auditService as never,
      {} as never,
      sessionActivityService as never,
    );
  });

  it('D: refresh de usuario suspendido → 401 y no setea cookies nuevas', async () => {
    refreshTokenService.rotate.mockResolvedValue({
      userId: 'user-1',
      newRefreshToken: 'new-refresh',
      previousCreatedAt: new Date('2026-08-30T10:00:00.000Z'),
    });
    usersService.findById.mockResolvedValue({
      verified: true,
      cuentaActiva: false,
      tokensInvalidBefore: new Date('2026-08-30T11:00:00.000Z'),
    });

    await expect(controller.refresh(req, res as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(clearAuthCookies).toHaveBeenCalled();
    expect(setAuthCookies).not.toHaveBeenCalled();
    expect(refreshTokenService.revoke).toHaveBeenCalledWith('new-refresh');
  });

  it('D/G: refresh residual anterior al watermark no revive sesión tras reactivar', async () => {
    refreshTokenService.rotate.mockResolvedValue({
      userId: 'user-1',
      newRefreshToken: 'new-refresh',
      previousCreatedAt: new Date('2026-08-30T10:00:00.000Z'),
    });
    usersService.findById.mockResolvedValue({
      verified: true,
      cuentaActiva: true,
      tokensInvalidBefore: new Date('2026-08-30T11:00:00.000Z'),
    });

    await expect(controller.refresh(req, res as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(setAuthCookies).not.toHaveBeenCalled();
    expect(refreshTokenService.revoke).toHaveBeenCalledWith('new-refresh');
  });

  it('E/F: suspender persiste y revoca refresh + activity sessions', async () => {
    usersService.toggleAccountStatus.mockResolvedValue({
      email: 'a@b.com',
      username: 'Ana',
      role: 'Médico',
    });

    await controller.toggleAccountStatus(
      'user-1',
      { cuentaActiva: false },
      req,
      res as never,
    );

    expect(usersService.toggleAccountStatus).toHaveBeenCalledWith(
      'user-1',
      false,
    );
    expect(refreshTokenService.revokeAllForUser).toHaveBeenCalledWith('user-1');
    expect(sessionActivityService.revokeAllForUser).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('G: reactivar no llama revokeAll (sesiones anteriores no reaparecen)', async () => {
    usersService.toggleAccountStatus.mockResolvedValue({
      email: 'a@b.com',
      username: 'Ana',
      role: 'Médico',
      cuentaActiva: true,
    });

    await controller.toggleAccountStatus(
      'user-1',
      { cuentaActiva: true },
      req,
      res as never,
    );

    expect(refreshTokenService.revokeAllForUser).not.toHaveBeenCalled();
    expect(sessionActivityService.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('E: fallo de revocación secundaria no revierte la suspensión', async () => {
    usersService.toggleAccountStatus.mockResolvedValue({
      email: 'a@b.com',
      username: 'Ana',
      role: 'Médico',
    });
    refreshTokenService.revokeAllForUser.mockRejectedValue(
      new Error('mongo down'),
    );

    await controller.toggleAccountStatus(
      'user-1',
      { cuentaActiva: false },
      req,
      res as never,
    );

    expect(usersService.toggleAccountStatus).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalled();
  });

  it('elimina y luego revoca refresh/activity (best-effort)', async () => {
    usersService.findByEmail.mockResolvedValue({
      _id: { toString: () => 'user-del' },
      email: 'del@b.com',
      username: 'Del',
      role: 'Médico',
    });
    usersService.removeUserByEmail.mockResolvedValue({ email: 'del@b.com' });

    await controller.removeUserByEmail('del@b.com', req, res as never);

    expect(usersService.removeUserByEmail).toHaveBeenCalledWith('del@b.com');
    expect(refreshTokenService.revokeAllForUser).toHaveBeenCalledWith(
      'user-del',
    );
    expect(sessionActivityService.revokeAllForUser).toHaveBeenCalledWith(
      'user-del',
    );
  });

  it('J: logout completa teardown sin consultar cuentaActiva', async () => {
    await controller.logout(req, res as never);

    expect(sessionActivityService.revokeSession).toHaveBeenCalledWith('sid-1');
    expect(refreshTokenService.revoke).toHaveBeenCalledWith(
      'presented-refresh',
    );
    expect(clearAuthCookies).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ msg: 'Sesión cerrada' });
    expect(usersService.findById).not.toHaveBeenCalled();
  });
});
