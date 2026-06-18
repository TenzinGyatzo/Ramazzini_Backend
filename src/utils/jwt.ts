import jwt from 'jsonwebtoken';

export const ACCESS_TOKEN_EXPIRES_IN = '12h';

export function generateAccessToken(userId: string): string {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

/** @deprecated Use generateAccessToken */
export function generateJWT(id: string): string {
  return generateAccessToken(id);
}
