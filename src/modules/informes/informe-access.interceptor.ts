import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { OrganizationalAccessService } from 'src/utils/organizational-access.service';
import { getUserIdFromRequest } from '../../utils/auth-helpers';
import { isValidObjectId } from 'mongoose';

@Injectable()
export class InformeAccessInterceptor implements NestInterceptor {
  constructor(
    private readonly organizationalAccessService: OrganizationalAccessService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest();
    const routePath: string = req.route?.path ?? '';

    if (routePath.includes('registrar-exportacion')) {
      return next.handle();
    }

    const { empresaId, trabajadorId } = req.params ?? {};
    if (!empresaId || !trabajadorId) {
      return next.handle();
    }

    if (!isValidObjectId(empresaId) || !isValidObjectId(trabajadorId)) {
      throw new BadRequestException('IDs de empresa o trabajador no válidos');
    }

    const userId = getUserIdFromRequest(req);
    await this.organizationalAccessService.assertUserCanAccessTrabajador(
      userId,
      empresaId,
      trabajadorId,
    );

    return next.handle();
  }
}
