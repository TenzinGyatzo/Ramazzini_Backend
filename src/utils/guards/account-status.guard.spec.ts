import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AccountStatusGuard } from './account-status.guard';
import { UsersService } from '../../modules/users/users.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import {
  ACCOUNT_INACTIVE_ERROR_CODE,
  ACCOUNT_INACTIVE_MESSAGE,
} from '../account-status.constants';
import { REQUEST_PROVEEDOR_SALUD_ID_KEY } from '../helpers/request-user-context';

describe('AccountStatusGuard', () => {
  let guard: AccountStatusGuard;
  let usersService: { findAuthStatusById: jest.Mock };

  const proveedorId = '507f1f77bcf86cd799439012';
  const issuedAtSec = 1_700_000_000;

  const activeStatus = {
    cuentaActiva: true,
    verified: true,
    idProveedorSalud: proveedorId,
    tokensInvalidBefore: null as Date | null,
  };

  const createContext = (opts: {
    userId?: string;
    jwtIat?: number;
    path?: string;
    method?: string;
    isPublic?: boolean;
  }): { ctx: ExecutionContext; request: Record<string, unknown> } => {
    const handler = jest.fn();
    if (opts.isPublic) {
      Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
    }
    const request: Record<string, unknown> = {
      userId: opts.userId,
      jwtIat: opts.jwtIat,
      method: opts.method ?? 'GET',
      path: opts.path ?? '/api/trabajadores',
    };
    const ctx = {
      getHandler: () => handler,
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
    return { ctx, request };
  };

  const expectAccountInactive = async (ctx: ExecutionContext) => {
    try {
      await guard.canActivate(ctx);
      throw new Error('expected UnauthorizedException');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      const body = (error as UnauthorizedException).getResponse();
      expect(body).toEqual(
        expect.objectContaining({
          code: ACCOUNT_INACTIVE_ERROR_CODE,
          message: ACCOUNT_INACTIVE_MESSAGE,
        }),
      );
    }
  };

  beforeEach(async () => {
    usersService = {
      findAuthStatusById: jest.fn().mockResolvedValue(activeStatus),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountStatusGuard,
        Reflector,
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    guard = module.get(AccountStatusGuard);
  });

  it('A: usuario activo + JWT válido → permite y precarga idProveedorSalud', async () => {
    const { ctx, request } = createContext({
      userId: 'user-1',
      jwtIat: issuedAtSec,
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(usersService.findAuthStatusById).toHaveBeenCalledWith('user-1');
    expect(request[REQUEST_PROVEEDOR_SALUD_ID_KEY]).toBe(proveedorId);
  });

  it('B: mismo JWT tras suspensión → 401 ACCOUNT_INACTIVE inmediato', async () => {
    usersService.findAuthStatusById.mockResolvedValue({
      ...activeStatus,
      cuentaActiva: false,
      tokensInvalidBefore: new Date((issuedAtSec + 60) * 1000),
    });
    const { ctx } = createContext({ userId: 'user-1', jwtIat: issuedAtSec });
    await expectAccountInactive(ctx);
  });

  it('C: usuario eliminado + JWT vigente → 401 ACCOUNT_INACTIVE', async () => {
    usersService.findAuthStatusById.mockResolvedValue(null);
    const { ctx } = createContext({ userId: 'user-1', jwtIat: issuedAtSec });
    await expectAccountInactive(ctx);
  });

  it('watermark aislado: cuenta activa + verified + iat anterior → 401 ACCOUNT_INACTIVE', async () => {
    usersService.findAuthStatusById.mockResolvedValue({
      cuentaActiva: true,
      verified: true,
      idProveedorSalud: proveedorId,
      tokensInvalidBefore: new Date((issuedAtSec + 10) * 1000),
    });
    const { ctx } = createContext({ userId: 'user-1', jwtIat: issuedAtSec });
    await expectAccountInactive(ctx);
    expect(usersService.findAuthStatusById).toHaveBeenCalledWith('user-1');
  });

  it('watermark aislado: cuenta activa + iat posterior al watermark → permite', async () => {
    const watermark = new Date(issuedAtSec * 1000);
    usersService.findAuthStatusById.mockResolvedValue({
      cuentaActiva: true,
      verified: true,
      idProveedorSalud: proveedorId,
      tokensInvalidBefore: watermark,
    });
    const { ctx } = createContext({
      userId: 'user-1',
      jwtIat: issuedAtSec + 120,
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('I: rutas @Public no consultan estado de cuenta', async () => {
    for (const path of [
      '/auth/users/login',
      '/auth/users/refresh',
      '/auth/users/register',
      '/auth/users/verify/abc',
      '/auth/users/forgot-password',
    ]) {
      usersService.findAuthStatusById.mockClear();
      const { ctx } = createContext({
        isPublic: true,
        path,
        userId: 'user-1',
        jwtIat: issuedAtSec,
      });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(usersService.findAuthStatusById).not.toHaveBeenCalled();
    }
  });

  it('J: POST /auth/users/logout de cuenta suspendida no es bloqueado', async () => {
    usersService.findAuthStatusById.mockResolvedValue({
      ...activeStatus,
      cuentaActiva: false,
    });
    const { ctx } = createContext({
      userId: 'user-1',
      jwtIat: issuedAtSec,
      method: 'POST',
      path: '/auth/users/logout',
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(usersService.findAuthStatusById).not.toHaveBeenCalled();
  });

  it('J: logout-all / logout-history no heredan la excepción de logout', async () => {
    usersService.findAuthStatusById.mockResolvedValue({
      ...activeStatus,
      cuentaActiva: false,
    });
    for (const path of [
      '/auth/users/logout-all',
      '/auth/users/logout-history',
    ]) {
      const { ctx } = createContext({
        userId: 'user-1',
        jwtIat: issuedAtSec,
        method: 'POST',
        path,
      });
      await expectAccountInactive(ctx);
    }
  });

  it('L: tokensInvalidBefore null/ausente no cierra la sesión', async () => {
    usersService.findAuthStatusById.mockResolvedValue({
      ...activeStatus,
      tokensInvalidBefore: null,
    });
    const { ctx } = createContext({ userId: 'user-1', jwtIat: issuedAtSec });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rechaza verified === false', async () => {
    usersService.findAuthStatusById.mockResolvedValue({
      ...activeStatus,
      verified: false,
    });
    const { ctx } = createContext({ userId: 'user-1', jwtIat: issuedAtSec });
    await expectAccountInactive(ctx);
  });
});
