import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcuerdoConfidencialidadAceptacion } from './schemas/acuerdo-confidencialidad-aceptacion.schema';
import {
  AcuerdoConfidencialidadAcceptResponseDto,
  AcuerdoConfidencialidadStatusResponseDto,
} from './dto/acuerdo-confidencialidad-response.dto';
import { ACUERDO_CONFIDENCIALIDAD } from './constants/acuerdo-text.constants';
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';

const RESOURCE_TYPE_CONFIDENTIALITY_AGREEMENT = 'CONFIDENTIALITY_AGREEMENT';

@Injectable()
export class AcuerdoConfidencialidadService {
  constructor(
    @InjectModel(AcuerdoConfidencialidadAceptacion.name)
    private readonly aceptacionModel: Model<AcuerdoConfidencialidadAceptacion>,
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  getCurrentVersion(): string {
    return ACUERDO_CONFIDENCIALIDAD.version;
  }

  private buildNotRequiredStatus(): AcuerdoConfidencialidadStatusResponseDto {
    return {
      required: false,
      accepted: true,
    };
  }

  private buildRequiredStatus(
    accepted: boolean,
  ): AcuerdoConfidencialidadStatusResponseDto {
    return {
      required: true,
      accepted,
      currentVersion: ACUERDO_CONFIDENCIALIDAD.version,
      agreementText: ACUERDO_CONFIDENCIALIDAD.literal,
      footerConsent: ACUERDO_CONFIDENCIALIDAD.footerConsent,
    };
  }

  async isAgreementRequiredForUser(userId: string): Promise<boolean> {
    const proveedorSaludId =
      await this.usersService.getIdProveedorSaludByUserId(userId);
    if (!proveedorSaludId) {
      return false;
    }
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    return policy.features.confidentialityAgreementEnabled;
  }

  async hasAcceptedCurrentVersion(userId: string): Promise<boolean> {
    if (!(await this.isAgreementRequiredForUser(userId))) {
      return true;
    }
    const existing = await this.aceptacionModel
      .findOne({
        userId: new Types.ObjectId(userId),
        versionAco: ACUERDO_CONFIDENCIALIDAD.version,
      })
      .lean();
    return !!existing;
  }

  async getStatus(
    userId: string,
  ): Promise<AcuerdoConfidencialidadStatusResponseDto> {
    const proveedorSaludId =
      await this.usersService.getIdProveedorSaludByUserId(userId);
    if (!proveedorSaludId) {
      return this.buildNotRequiredStatus();
    }

    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    if (!policy.features.confidentialityAgreementEnabled) {
      return this.buildNotRequiredStatus();
    }

    const accepted = await this.hasAcceptedCurrentVersion(userId);
    return this.buildRequiredStatus(accepted);
  }

  async accept(
    userId: string,
    direccionIp: string,
  ): Promise<AcuerdoConfidencialidadAcceptResponseDto> {
    const proveedorSaludId =
      await this.usersService.getIdProveedorSaludByUserId(userId);
    if (!proveedorSaludId) {
      throw new BadRequestException(
        'No se pudo determinar el proveedor de salud del usuario',
      );
    }

    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    if (!policy.features.confidentialityAgreementEnabled) {
      throw new ForbiddenException(
        'El acuerdo de confidencialidad no aplica para este proveedor',
      );
    }

    const existing = await this.aceptacionModel
      .findOne({
        userId: new Types.ObjectId(userId),
        versionAco: ACUERDO_CONFIDENCIALIDAD.version,
      })
      .lean();

    if (existing) {
      return {
        accepted: true,
        versionAco: existing.versionAco,
        fechaHoraAceptacion: existing.fechaHoraAceptacion,
      };
    }

    const now = new Date();
    const created = await this.aceptacionModel.create({
      userId: new Types.ObjectId(userId),
      proveedorSaludId: new Types.ObjectId(proveedorSaludId),
      fechaHoraAceptacion: now,
      direccionIp,
      versionAco: ACUERDO_CONFIDENCIALIDAD.version,
      agreementTextLiteral: ACUERDO_CONFIDENCIALIDAD.literal,
      source: 'UI',
    });

    await this.auditService.record({
      proveedorSaludId,
      actorId: userId,
      actionType: AuditActionType.ACUERDO_CONFIDENCIALIDAD_ACEPTADO,
      resourceType: RESOURCE_TYPE_CONFIDENTIALITY_AGREEMENT,
      resourceId: created._id.toString(),
      payload: {
        userId,
        versionAco: created.versionAco,
        direccionIp: created.direccionIp,
        fechaHoraAceptacion: created.fechaHoraAceptacion.toISOString(),
        source: created.source,
      },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });

    return {
      accepted: true,
      versionAco: created.versionAco,
      fechaHoraAceptacion: created.fechaHoraAceptacion,
    };
  }
}
