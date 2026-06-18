import { Response } from 'express';

export const ACCESS_COOKIE = 'ramazzini_access';
export const REFRESH_COOKIE = 'ramazzini_refresh';

const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ACCESS_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax' as const,
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions(),
    path: '/',
    maxAge: ACCESS_MAX_AGE_MS,
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    path: '/auth/users',
    maxAge: REFRESH_MAX_AGE_MS,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, {
    ...baseCookieOptions(),
    path: '/',
  });
  res.clearCookie(REFRESH_COOKIE, {
    ...baseCookieOptions(),
    path: '/auth/users',
  });
}

export function getRefreshTokenFromCookies(
  cookies: Record<string, string | undefined> | undefined,
): string | undefined {
  return cookies?.[REFRESH_COOKIE];
}
