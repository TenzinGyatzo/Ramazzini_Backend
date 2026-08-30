import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { getSidFromRequest } from '../auth-helpers';
import { SessionActivityService } from '../../modules/users/session-activity.service';
import { UsersService } from '../../modules/users/users.service';
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

function isAuthFlowPath(path: string): boolean {
  return AUTH_FLOW_PATH_FRAGMENTS.some((fragment) => path.includes(fragment));
}

@Injectable()
export class SessionInactivityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionActivityService: SessionActivityService,
    private readonly usersService: UsersService,
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

    const userId = request.userId;
    if (!userId) {
      return true;
    }

    const sid = getSidFromRequest(request);
    let proveedorSaludId = request[REQUEST_PROVEEDOR_SALUD_ID_KEY];
    if (proveedorSaludId === undefined) {
      proveedorSaludId =
        await this.usersService.getIdProveedorSaludByUserId(userId);
      request[REQUEST_PROVEEDOR_SALUD_ID_KEY] = proveedorSaludId;
    }

    await this.sessionActivityService.assertAndTouchSession(
      sid,
      userId,
      proveedorSaludId,
    );

    return true;
  }
}
