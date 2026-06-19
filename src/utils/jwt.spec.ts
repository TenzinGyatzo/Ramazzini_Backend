import jwt from 'jsonwebtoken';
import { generateAccessToken, ACCESS_TOKEN_EXPIRES_IN } from './jwt';

describe('jwt', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('ACCESS_TOKEN_EXPIRES_IN es 12h', () => {
    expect(ACCESS_TOKEN_EXPIRES_IN).toBe('12h');
  });

  it('generateAccessToken incluye id de usuario y expira en 12h', () => {
    const token = generateAccessToken('user-abc');
    const decoded = jwt.decode(token) as { id: string; exp: number; iat: number };

    expect(decoded.id).toBe('user-abc');
    expect(decoded.exp - decoded.iat).toBe(12 * 60 * 60);
  });

  it('generateAccessToken incluye sid cuando se proporciona', () => {
    const token = generateAccessToken('user-abc', 'session-uuid');
    const decoded = jwt.decode(token) as { id: string; sid?: string };

    expect(decoded.sid).toBe('session-uuid');
  });
});
