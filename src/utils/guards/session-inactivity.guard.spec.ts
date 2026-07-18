import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionInactivityGuard } from './session-inactivity.guard';
import { SessionActivityService } from '../../modules/users/session-activity.service';
import { UsersService } from '../../modules/users/users.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SESSION_IDLE_ERROR_CODE } from '../session-inactivity.constants';

jest.mock('../auth-helpers', () => ({
  getSidFromRequest: jest.fn(),
}));

import { getSidFromRequest } from '../auth-helpers';

describe('SessionInactivityGuard', () => {
  let guard: SessionInactivityGuard;
  let sessionActivityService: {
    assertAndTouchSession: jest.Mock;
  };
  let usersService: { getIdProveedorSaludByUserId: jest.Mock };
  let reflector: Reflector;

  const createContext = (opts: {
    userId?: string;
    path?: string;
    isPublic?: boolean;
  }): { ctx: ExecutionContext; request: Record<string, unknown> } => {
    const handler = jest.fn();
    if (opts.isPublic) {
      Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
    }
    const request: Record<string, unknown> = {
      userId: opts.userId,
      path: opts.path ?? '/api/expedientes/abc',
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

  beforeEach(async () => {
    sessionActivityService = {
      assertAndTouchSession: jest.fn().mockResolvedValue(undefined),
    };
    usersService = {
      getIdProveedorSaludByUserId: jest
        .fn()
        .mockResolvedValue('507f1f77bcf86cd799439012'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionInactivityGuard,
        Reflector,
        {
          provide: SessionActivityService,
          useValue: sessionActivityService,
        },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    guard = module.get(SessionInactivityGuard);
    reflector = module.get(Reflector);
    (getSidFromRequest as jest.Mock).mockReturnValue('sid-1');
  });

  it('allows @Public routes without checking session', async () => {
    const { ctx } = createContext({ isPublic: true });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(sessionActivityService.assertAndTouchSession).not.toHaveBeenCalled();
  });

  it('skips auth flow paths', async () => {
    const { ctx } = createContext({
      userId: 'user-1',
      path: '/auth/users/login',
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(sessionActivityService.assertAndTouchSession).not.toHaveBeenCalled();
  });

  it('asserts and touches session on protected routes', async () => {
    const { ctx, request } = createContext({
      userId: 'user-1',
      path: '/api/trabajadores',
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(sessionActivityService.assertAndTouchSession).toHaveBeenCalledWith(
      'sid-1',
      'user-1',
      '507f1f77bcf86cd799439012',
    );
    expect(request.idProveedorSalud).toBe('507f1f77bcf86cd799439012');
  });

  it('propagates SESSION_IDLE from service', async () => {
    sessionActivityService.assertAndTouchSession.mockRejectedValue(
      new UnauthorizedException({
        code: SESSION_IDLE_ERROR_CODE,
        message: 'Sesión bloqueada por inactividad',
      }),
    );
    const { ctx } = createContext({ userId: 'user-1' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
