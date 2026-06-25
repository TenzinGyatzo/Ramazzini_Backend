import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AcuerdoConfidencialidadService } from '../../modules/acuerdo-confidencialidad/acuerdo-confidencialidad.service';
import { createRegulatoryError } from '../regulatory-error-helper';
import { RegulatoryErrorCode } from '../regulatory-error-codes';

const AUTH_FLOW_PATH_FRAGMENTS = [
  '/users/login',
  '/users/refresh',
  '/users/logout',
  '/users/register',
  '/users/forgot-password',
  '/users/verify/',
];

const CONFIDENTIALITY_AGREEMENT_PATH_FRAGMENTS = [
  '/acuerdo-confidencialidad/',
];

function pathMatchesFragments(path: string, fragments: string[]): boolean {
  return fragments.some((fragment) => path.includes(fragment));
}

function isAuthFlowPath(path: string): boolean {
  return pathMatchesFragments(path, AUTH_FLOW_PATH_FRAGMENTS);
}

function isConfidentialityAgreementPath(path: string): boolean {
  return pathMatchesFragments(path, CONFIDENTIALITY_AGREEMENT_PATH_FRAGMENTS);
}

function isBootstrapUserPath(path: string): boolean {
  return path.includes('/users/user');
}

@Injectable()
export class ConfidentialityAgreementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly acuerdoConfidencialidadService: AcuerdoConfidencialidadService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<
      Request & { userId?: string }
    >();
    const path = request.path ?? request.url ?? '';

    if (isAuthFlowPath(path)) {
      return true;
    }

    if (isConfidentialityAgreementPath(path)) {
      return true;
    }

    if (isBootstrapUserPath(path)) {
      return true;
    }

    const userId = request.userId;
    if (!userId) {
      return true;
    }

    const required =
      await this.acuerdoConfidencialidadService.isAgreementRequiredForUser(
        userId,
      );
    if (!required) {
      return true;
    }

    const accepted =
      await this.acuerdoConfidencialidadService.hasAcceptedCurrentVersion(
        userId,
      );
    if (accepted) {
      return true;
    }

    throw createRegulatoryError({
      errorCode: RegulatoryErrorCode.CONFIDENTIALITY_AGREEMENT_REQUIRED,
    });
  }
}
