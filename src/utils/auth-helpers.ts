import { Request } from 'express';
import jwt from 'jsonwebtoken';
import {
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ACCESS_COOKIE } from './auth-cookies';

interface JwtPayload {
  id: string;
  sid?: string;
  iat?: number;
}

export type VerifiedJwtPayload = {
  id: string;
  sid?: string;
  iat?: number;
};

export function getAccessTokenFromRequest(req: Request): string {
  const cookieToken = req.cookies?.[ACCESS_COOKIE];
  if (cookieToken) {
    return cookieToken;
  }

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    return req.headers.authorization.split(' ')[1];
  }

  throw new UnauthorizedException('Token de autenticación requerido');
}

export function getVerifiedJwtPayloadFromRequest(
  req: Request,
): VerifiedJwtPayload {
  try {
    const token = getAccessTokenFromRequest(req);
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

    if (!decoded.id) {
      throw new BadRequestException(
        'Token inválido: ID de usuario no encontrado',
      );
    }

    return {
      id: decoded.id,
      sid: decoded.sid,
      iat: decoded.iat,
    };
  } catch (error) {
    if (
      error instanceof UnauthorizedException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }
    throw new UnauthorizedException('Token inválido o expirado');
  }
}

export function getUserIdFromRequest(req: Request): string {
  return getVerifiedJwtPayloadFromRequest(req).id;
}

export function getSidFromRequest(req: Request): string | undefined {
  try {
    const token = getAccessTokenFromRequest(req);
    const decoded = jwt.decode(token) as JwtPayload | null;
    return typeof decoded?.sid === 'string' ? decoded.sid : undefined;
  } catch {
    return undefined;
  }
}
