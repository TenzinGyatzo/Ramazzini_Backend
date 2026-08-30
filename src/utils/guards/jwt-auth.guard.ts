import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { getVerifiedJwtPayloadFromRequest } from '../auth-helpers';
import { RequestWithUserContext } from '../helpers/request-user-context';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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
    const payload = getVerifiedJwtPayloadFromRequest(request);
    request.userId = payload.id;
    if (typeof payload.iat === 'number') {
      request.jwtIat = payload.iat;
    }
    return true;
  }
}
