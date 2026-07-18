import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AcuerdoConfidencialidadService } from '../../modules/acuerdo-confidencialidad/acuerdo-confidencialidad.service';
import { createRegulatoryError } from '../regulatory-error-helper';
import { RegulatoryErrorCode } from '../regulatory-error-codes';
import {
  REQUEST_PROVEEDOR_SALUD_ID_KEY,
  RequestWithUserContext,
} from '../helpers/request-user-context';

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

    const request = context
      .switchToHttp()
      .getRequest<RequestWithUserContext>();
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

    // Reutilizar idProveedorSalud si SessionInactivityGuard ya lo resolvió
    const preloadedProveedorSaludId = request[REQUEST_PROVEEDOR_SALUD_ID_KEY];
    const gate =
      await this.acuerdoConfidencialidadService.resolveAgreementGate(
        userId,
        preloadedProveedorSaludId !== undefined
          ? { proveedorSaludId: preloadedProveedorSaludId }
          : undefined,
      );
    if (!gate.required || gate.accepted) {
      return true;
    }

    throw createRegulatoryError({
      errorCode: RegulatoryErrorCode.CONFIDENTIALITY_AGREEMENT_REQUIRED,
    });
  }
}
