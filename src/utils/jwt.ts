import jwt from 'jsonwebtoken';

export const ACCESS_TOKEN_EXPIRES_IN = '12h';

export interface JwtPayload {
  id: string;
  sid?: string;
}

export function generateAccessToken(userId: string, sid?: string): string {
  return jwt.sign(
    { id: userId, ...(sid ? { sid } : {}) },
    process.env.JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    },
  );
}

/** @deprecated Use generateAccessToken */
export function generateJWT(id: string): string {
  return generateAccessToken(id);
}
