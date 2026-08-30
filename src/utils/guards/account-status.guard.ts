import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import {
  ACCOUNT_INACTIVE_ERROR_CODE,
  ACCOUNT_INACTIVE_MESSAGE,
  isAccountStatusLogoutRequest,
  isIssuedBeforeWatermark,
} from '../account-status.constants';
import {
  REQUEST_PROVEEDOR_SALUD_ID_KEY,
  RequestWithUserContext,
} from '../helpers/request-user-context';
import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class AccountStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
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
    if (isAccountStatusLogoutRequest(request)) {
      return true;
    }

    const userId = request.userId;
    if (!userId) {
      this.throwInactive();
    }

    const status = await this.usersService.findAuthStatusById(userId);
    if (!status || !status.verified || !status.cuentaActiva) {
      this.throwInactive();
    }

    const issuedAtMs =
      typeof request.jwtIat === 'number' ? request.jwtIat * 1000 : undefined;
    if (isIssuedBeforeWatermark(issuedAtMs, status.tokensInvalidBefore)) {
      this.throwInactive();
    }

    request[REQUEST_PROVEEDOR_SALUD_ID_KEY] = status.idProveedorSalud;
    return true;
  }

  private throwInactive(): never {
    throw new UnauthorizedException({
      code: ACCOUNT_INACTIVE_ERROR_CODE,
      message: ACCOUNT_INACTIVE_MESSAGE,
    });
  }
}
