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
import { AuditService } from 'src/modules/audit/audit.service';
import { AuditActionType } from 'src/modules/audit/constants/audit-action-type';
import { AuditEventClass } from 'src/modules/audit/constants/audit-event-class';
import {
  DeletionAuditReason,
  DeletionAuditResourceType,
} from '../constants/deletion-audit.constants';

type AuthenticatedRequest = Request & { userId?: string };

@Injectable()
export class DeletionPasswordGuard implements CanActivate {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly deletionCascadeService: DeletionCascadeService,
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
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
      await this.recordAuthFail(
        context,
        request,
        userId,
        DeletionAuditReason.MISSING_PASSWORD,
      );
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
      await this.recordAuthFail(
        context,
        request,
        userId,
        DeletionAuditReason.INVALID_PASSWORD,
        user.idProveedorSalud
          ? String(user.idProveedorSalud)
          : null,
      );
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    return true;
  }

  private async recordAuthFail(
    context: ExecutionContext,
    request: AuthenticatedRequest,
    actorId: string,
    reason: string,
    proveedorSaludId?: string | null,
  ): Promise<void> {
    const { resourceType, resourceId } = this.resolveResource(
      context,
      request,
    );
    let proveedor = proveedorSaludId ?? null;
    if (proveedor == null) {
      const user = await this.userModel
        .findById(actorId)
        .select('idProveedorSalud')
        .lean()
        .exec();
      proveedor = user?.idProveedorSalud
        ? String(user.idProveedorSalud)
        : null;
    }

    try {
      await this.auditService.record({
        proveedorSaludId: proveedor,
        actorId,
        actionType: AuditActionType.DELETION_AUTH_FAIL,
        resourceType,
        resourceId,
        payload: { reason },
        eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
      });
    } catch {
      // Class 2: never block the UnauthorizedException path on audit failure
    }
  }

  private resolveResource(
    context: ExecutionContext,
    request: AuthenticatedRequest,
  ): {
    resourceType: DeletionAuditResourceType;
    resourceId: string | null;
  } {
    const cascadeCheck = this.reflector.get<
      DeletionCascadeCheckType | undefined
    >(DELETION_CASCADE_CHECK_KEY, context.getHandler());

    if (cascadeCheck === 'centro') {
      return {
        resourceType: 'centroTrabajo',
        resourceId: request.params.centroId ?? null,
      };
    }
    if (cascadeCheck === 'empresa') {
      return {
        resourceType: 'empresa',
        resourceId: request.params.id ?? null,
      };
    }

    const path = String(request.route?.path ?? request.path ?? '');
    if (path.includes('delete-user') || path.includes('eliminar-usuario')) {
      return {
        resourceType: 'usuario',
        resourceId: request.params?.email ?? request.params?.id ?? null,
      };
    }
    if (request.params?.centroId) {
      return {
        resourceType: 'centroTrabajo',
        resourceId: request.params.centroId,
      };
    }
    if (request.params?.id) {
      return {
        resourceType: 'empresa',
        resourceId: request.params.id,
      };
    }

    return { resourceType: 'unknown', resourceId: null };
  }

  private async requiresDeletionPassword(
    context: ExecutionContext,
    request: AuthenticatedRequest,
  ): Promise<boolean> {
    const cascadeCheck = this.reflector.get<
      DeletionCascadeCheckType | undefined
    >(DELETION_CASCADE_CHECK_KEY, context.getHandler());

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
