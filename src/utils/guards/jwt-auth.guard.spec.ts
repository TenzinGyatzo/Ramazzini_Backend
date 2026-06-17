import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('JwtAuthGuard', () => {
  const reflector = new Reflector();
  let guard: JwtAuthGuard;

  const createContext = (req: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  beforeEach(() => {
    guard = new JwtAuthGuard(reflector);
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();
  });

  it('permite acceso en rutas @Public sin token', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const req = { headers: {} };
    const result = guard.canActivate(createContext(req));

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });

  it('rechaza peticiones sin Authorization', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const req = { headers: {} };

    expect(() => guard.canActivate(createContext(req))).toThrow(
      UnauthorizedException,
    );
  });

  it('asigna userId cuando el token es válido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    (jwt.verify as jest.Mock).mockReturnValue({ id: 'user-123' });

    const req = { headers: { authorization: 'Bearer valid-token' } };
    const result = guard.canActivate(createContext(req));

    expect(result).toBe(true);
    expect((req as { userId?: string }).userId).toBe('user-123');
    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
  });

  it('rechaza token inválido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid');
    });

    const req = { headers: { authorization: 'Bearer bad-token' } };

    expect(() => guard.canActivate(createContext(req))).toThrow(
      UnauthorizedException,
    );
  });
});
