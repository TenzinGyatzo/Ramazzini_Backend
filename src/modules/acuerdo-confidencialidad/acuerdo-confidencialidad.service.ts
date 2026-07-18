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

/** Resultado del gate de acuerdo (misma semántica que required + hasAccepted). */
export type ConfidentialityAgreementGate = {
  required: boolean;
  accepted: boolean;
};

@Injectable()
export class AcuerdoConfidencialidadService {
  /** Cache corta por userId: evita re-resolver user/policy/aceptación en ráfagas. */
  private readonly gateCache = new Map<
    string,
    { gate: ConfidentialityAgreementGate; timestamp: number }
  >();
  private readonly GATE_CACHE_TTL_MS = 30_000;

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

  private getCachedGate(
    userId: string,
  ): ConfidentialityAgreementGate | null {
    const cached = this.gateCache.get(userId);
    if (!cached) {
      return null;
    }
    if (Date.now() - cached.timestamp >= this.GATE_CACHE_TTL_MS) {
      this.gateCache.delete(userId);
      return null;
    }
    return cached.gate;
  }

  private setCachedGate(
    userId: string,
    gate: ConfidentialityAgreementGate,
  ): void {
    this.gateCache.set(userId, { gate, timestamp: Date.now() });
  }

  private async findCurrentAcceptance(userId: string) {
    return this.aceptacionModel
      .findOne({
        userId: new Types.ObjectId(userId),
        versionAco: ACUERDO_CONFIDENCIALIDAD.version,
      })
      .lean();
  }

  /**
   * Resuelve required + accepted en un solo paso (1× user, 1× policy, 1× aceptación si aplica).
   * Cache de corta vida por userId; se refresca a accepted=true en accept().
   * `options.proveedorSaludId` (incl. null) evita re-lookup si un guard previo ya lo resolvió.
   */
  async resolveAgreementGate(
    userId: string,
    options?: { proveedorSaludId?: string | null },
  ): Promise<ConfidentialityAgreementGate> {
    const cached = this.getCachedGate(userId);
    if (cached) {
      return cached;
    }

    const proveedorSaludId =
      options?.proveedorSaludId !== undefined
        ? options.proveedorSaludId
        : await this.usersService.getIdProveedorSaludByUserId(userId);
    if (!proveedorSaludId) {
      const gate: ConfidentialityAgreementGate = {
        required: false,
        accepted: true,
      };
      this.setCachedGate(userId, gate);
      return gate;
    }

    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    if (!policy.features.confidentialityAgreementEnabled) {
      const gate: ConfidentialityAgreementGate = {
        required: false,
        accepted: true,
      };
      this.setCachedGate(userId, gate);
      return gate;
    }

    const existing = await this.findCurrentAcceptance(userId);
    const gate: ConfidentialityAgreementGate = {
      required: true,
      accepted: !!existing,
    };
    this.setCachedGate(userId, gate);
    return gate;
  }

  async isAgreementRequiredForUser(userId: string): Promise<boolean> {
    return (await this.resolveAgreementGate(userId)).required;
  }

  async hasAcceptedCurrentVersion(userId: string): Promise<boolean> {
    // Misma semántica: si no aplica, se considera aceptado (no bloquea).
    return (await this.resolveAgreementGate(userId)).accepted;
  }

  async getStatus(
    userId: string,
  ): Promise<AcuerdoConfidencialidadStatusResponseDto> {
    const gate = await this.resolveAgreementGate(userId);
    if (!gate.required) {
      return this.buildNotRequiredStatus();
    }
    return this.buildRequiredStatus(gate.accepted);
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

    const existing = await this.findCurrentAcceptance(userId);

    if (existing) {
      this.setCachedGate(userId, { required: true, accepted: true });
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

    // Evita 403 falso tras aceptar (cache previa con accepted:false).
    this.setCachedGate(userId, { required: true, accepted: true });

    return {
      accepted: true,
      versionAco: created.versionAco,
      fechaHoraAceptacion: created.fechaHoraAceptacion,
    };
  }
}
