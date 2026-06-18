import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';

export const TOKEN_TTL_MS = {
  verify: 24 * 60 * 60 * 1000,
  reset: 60 * 60 * 1000,
} as const;

export type UserTokenPurpose = keyof typeof TOKEN_TTL_MS;

export const INVALID_TOKEN_MSG = 'Hubo un error, token no válido';
export const EXPIRED_TOKEN_MSG =
  'El enlace ha expirado. Solicita uno nuevo.';

export interface UserTokenFields {
  token?: string;
  tokenExpiresAt?: Date | null;
}

export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

export function issueUserToken(
  user: UserTokenFields,
  purpose: UserTokenPurpose,
): void {
  user.token = generateSecureToken();
  user.tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS[purpose]);
}

export function clearUserToken(user: UserTokenFields): void {
  user.token = '';
  user.tokenExpiresAt = null;
}

export function assertTokenValid(user: UserTokenFields | null | undefined): void {
  if (!user?.token) {
    throw new NotFoundException({ msg: INVALID_TOKEN_MSG });
  }

  if (
    user.tokenExpiresAt != null &&
    user.tokenExpiresAt.getTime() < Date.now()
  ) {
    throw new BadRequestException({ msg: EXPIRED_TOKEN_MSG });
  }
}
