import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  assertTokenValid,
  clearUserToken,
  EXPIRED_TOKEN_MSG,
  generateSecureToken,
  INVALID_TOKEN_MSG,
  issueUserToken,
  TOKEN_TTL_MS,
} from './user-token';

describe('user-token (H-34)', () => {
  it('generateSecureToken produce 64 caracteres hex', () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  it('generateSecureToken produce valores distintos', () => {
    expect(generateSecureToken()).not.toBe(generateSecureToken());
  });

  it('issueUserToken asigna token y tokenExpiresAt según propósito', () => {
    const user: { token?: string; tokenExpiresAt?: Date | null } = {};
    const before = Date.now();

    issueUserToken(user, 'verify');

    expect(user.token).toHaveLength(64);
    expect(user.tokenExpiresAt).toBeInstanceOf(Date);
    expect(user.tokenExpiresAt!.getTime()).toBeGreaterThanOrEqual(
      before + TOKEN_TTL_MS.verify - 1000,
    );

    issueUserToken(user, 'reset');
    expect(user.tokenExpiresAt!.getTime()).toBeLessThanOrEqual(
      Date.now() + TOKEN_TTL_MS.reset + 1000,
    );
  });

  it('assertTokenValid rechaza usuario sin token', () => {
    expect(() => assertTokenValid(null)).toThrow(NotFoundException);
    try {
      assertTokenValid({ token: '' });
    } catch (error) {
      expect(error.getResponse()).toEqual({ msg: INVALID_TOKEN_MSG });
    }
  });

  it('assertTokenValid acepta token legacy sin tokenExpiresAt', () => {
    expect(() =>
      assertTokenValid({ token: 'legacy-token', tokenExpiresAt: null }),
    ).not.toThrow();
    expect(() =>
      assertTokenValid({ token: 'legacy-token', tokenExpiresAt: undefined }),
    ).not.toThrow();
  });

  it('assertTokenValid rechaza token expirado', () => {
    expect(() =>
      assertTokenValid({
        token: 'expired',
        tokenExpiresAt: new Date(Date.now() - 1000),
      }),
    ).toThrow(BadRequestException);

    try {
      assertTokenValid({
        token: 'expired',
        tokenExpiresAt: new Date(Date.now() - 1000),
      });
    } catch (error) {
      expect(error.getResponse()).toEqual({ msg: EXPIRED_TOKEN_MSG });
    }
  });

  it('clearUserToken limpia token y expiración', () => {
    const user = {
      token: 'abc',
      tokenExpiresAt: new Date(),
    };
    clearUserToken(user);
    expect(user.token).toBe('');
    expect(user.tokenExpiresAt).toBeNull();
  });
});
