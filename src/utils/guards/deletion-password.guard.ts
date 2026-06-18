import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from 'express';
import { User } from 'src/modules/users/entities/user.entity';
import { DELETION_PASSWORD_HEADER } from '../constants/deletion-auth';
import {
  DELETION_CASCADE_CHECK_KEY,
  DeletionCascadeCheckType,
} from '../decorators/deletion-cascade-check.decorator';
import { DeletionCascadeService } from '../services/deletion-cascade.service';

type AuthenticatedRequest = Request & { userId?: string };

@Injectable()
export class DeletionPasswordGuard implements CanActivate {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly deletionCascadeService: DeletionCascadeService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedException('Autenticación requerida para eliminar');
    }

    const requiresPassword = await this.requiresDeletionPassword(
      context,
      request,
    );

    if (!requiresPassword) {
      return true;
    }

    const password = request.headers[DELETION_PASSWORD_HEADER];
    if (!password || typeof password !== 'string' || !password.trim()) {
      throw new UnauthorizedException(
        'Se requiere confirmar tu contraseña para eliminar',
      );
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isValid = await user.checkPassword(password);
    if (!isValid) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    return true;
  }

  private async requiresDeletionPassword(
    context: ExecutionContext,
    request: AuthenticatedRequest,
  ): Promise<boolean> {
    const cascadeCheck = this.reflector.get<DeletionCascadeCheckType | undefined>(
      DELETION_CASCADE_CHECK_KEY,
      context.getHandler(),
    );

    if (!cascadeCheck) {
      return true;
    }

    if (cascadeCheck === 'empresa') {
      const empresaId = request.params.id;
      if (!empresaId) {
        return true;
      }
      const centros =
        await this.deletionCascadeService.countCentrosByEmpresa(empresaId);
      return centros > 0;
    }

    if (cascadeCheck === 'centro') {
      const centroId = request.params.centroId;
      if (!centroId) {
        return true;
      }
      const trabajadores =
        await this.deletionCascadeService.countTrabajadoresByCentro(centroId);
      return trabajadores > 0;
    }

    return true;
  }
}
