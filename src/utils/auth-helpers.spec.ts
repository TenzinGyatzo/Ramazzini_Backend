import { UnauthorizedException } from '@nestjs/common';
import { getUserIdFromRequest, getAccessTokenFromRequest } from './auth-helpers';
import { ACCESS_COOKIE } from './auth-cookies';
import * as jwt from 'jsonwebtoken';

describe('auth-helpers (cookies)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('getAccessTokenFromRequest lee cookie HttpOnly', () => {
    const token = jwt.sign({ id: 'user-1' }, process.env.JWT_SECRET!);
    const req = { cookies: { [ACCESS_COOKIE]: token }, headers: {} } as any;

    expect(getAccessTokenFromRequest(req)).toBe(token);
  });

  it('getAccessTokenFromRequest usa Bearer como fallback', () => {
    const token = jwt.sign({ id: 'user-2' }, process.env.JWT_SECRET!);
    const req = {
      cookies: {},
      headers: { authorization: `Bearer ${token}` },
    } as any;

    expect(getAccessTokenFromRequest(req)).toBe(token);
  });

  it('getUserIdFromRequest rechaza sin token', () => {
    const req = { cookies: {}, headers: {} } as any;
    expect(() => getUserIdFromRequest(req)).toThrow(UnauthorizedException);
  });
});
