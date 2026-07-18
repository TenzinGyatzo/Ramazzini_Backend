import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Consentimiento } from './schemas/consentimiento.schema';
import { Trabajador } from '../trabajadores/schemas/trabajador.schema';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from '../empresas/schemas/empresa.schema';
import { CreateConsentimientoDto } from './dto/create-consentimiento.dto';
import {
  ConsentimientoStatusResponseDto,
  ConsentimientoCreatedResponseDto,
} from './dto/consentimiento-response.dto';
import {
  RegulatoryPolicy,
  RegulatoryPolicyService,
} from '../../utils/regulatory-policy.service';
import { createRegulatoryError } from '../../utils/regulatory-error-helper';
import { RegulatoryErrorCode } from '../../utils/regulatory-error-codes';
import {
  CONSENTIMIENTO_TRATAMIENTO_INFORMACION_SIRES,
  TIPO_CONSENTIMIENTO_TRATAMIENTO,
} from './constants/consentimiento-text.constants';
import { WorkerFusionService } from '../trabajadores/worker-fusion.service';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import {
  getProveedorSaludIdFromTrabajador,
  resolveTrabajadorProveedorChain,
} from '../../utils/helpers/treatment-consent.helper';

const RESOURCE_TYPE_CONSENTIMIENTO_TRATAMIENTO_SIRES =
  'CONSENTIMIENTO_TRATAMIENTO_SIRES';

interface ConsentRegimeContext {
  canonicalTrabajadorId: string;
  trabajador: Record<string, any>;
  proveedorSaludId: string;
  policy: RegulatoryPolicy;
}

@Injectable()
export class ConsentimientosService {
  constructor(
    @InjectModel(Consentimiento.name)
    private readonly consentimientoModel: Model<Consentimiento>,
    @InjectModel(Trabajador.name)
    private readonly trabajadorModel: Model<Trabajador>,
    @InjectModel(CentroTrabajo.name)
    private readonly centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(Empresa.name)
    private readonly empresaModel: Model<Empresa>,
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
    private readonly workerFusionService: WorkerFusionService,
    private readonly auditService: AuditService,
  ) {}

  getCurrentVersion(): string {
    return CONSENTIMIENTO_TRATAMIENTO_INFORMACION_SIRES.version;
  }

  private buildNotRequiredStatus(): ConsentimientoStatusResponseDto {
    return { required: false, accepted: true };
  }

  private buildRequiredStatus(
    accepted: boolean,
    consent?: ConsentimientoStatusResponseDto['consent'],
  ): ConsentimientoStatusResponseDto {
    return {
      required: true,
      accepted,
      currentVersion: CONSENTIMIENTO_TRATAMIENTO_INFORMACION_SIRES.version,
      consentText: CONSENTIMIENTO_TRATAMIENTO_INFORMACION_SIRES.literal,
      declaracionProfesional:
        CONSENTIMIENTO_TRATAMIENTO_INFORMACION_SIRES.declaracionProfesional,
      consent,
    };
  }

  /**
   * Canónico + cadena trabajador→proveedor + policy en una sola pasada.
   */
  private async resolveConsentRegimeContext(
    trabajadorId: string,
  ): Promise<ConsentRegimeContext> {
    const canonicalTrabajadorId =
      await this.workerFusionService.getCanonicalTrabajadorId(trabajadorId);

    const chain = await resolveTrabajadorProveedorChain(
      canonicalTrabajadorId,
      this.trabajadorModel,
      this.centroTrabajoModel,
      this.empresaModel,
    );

    if (!chain.trabajador) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    if (!chain.proveedorSaludId) {
      throw new ForbiddenException(
        'No se pudo determinar el proveedor de salud del trabajador',
      );
    }

    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(
        chain.proveedorSaludId,
      );

    return {
      canonicalTrabajadorId,
      trabajador: chain.trabajador,
      proveedorSaludId: chain.proveedorSaludId,
      policy,
    };
  }

  private buildLookupFilter(
    proveedorSaludId: string,
    canonicalTrabajadorId: string,
    version?: string,
  ) {
    return {
      proveedorSaludId: new Types.ObjectId(proveedorSaludId),
      trabajadorId: new Types.ObjectId(canonicalTrabajadorId),
      tipoConsentimiento: TIPO_CONSENTIMIENTO_TRATAMIENTO,
      version: version ?? CONSENTIMIENTO_TRATAMIENTO_INFORMACION_SIRES.version,
    };
  }

  /**
   * Busca el consentimiento vigente con IDs ya resueltos (sin re-cadena).
   */
  async findCurrentConsentimientoByResolvedIds(
    proveedorSaludId: string,
    canonicalTrabajadorId: string,
  ): Promise<Consentimiento | null> {
    return this.consentimientoModel
      .findOne(
        this.buildLookupFilter(proveedorSaludId, canonicalTrabajadorId),
      )
      .lean()
      .exec() as Promise<Consentimiento | null>;
  }

  async hasAcceptedCurrentVersion(
    proveedorSaludId: string,
    canonicalTrabajadorId: string,
  ): Promise<boolean> {
    const existing = await this.findCurrentConsentimientoByResolvedIds(
      proveedorSaludId,
      canonicalTrabajadorId,
    );
    return !!existing;
  }

  async getStatus(
    trabajadorId: string,
  ): Promise<ConsentimientoStatusResponseDto> {
    if (!isValidObjectId(trabajadorId)) {
      throw new BadRequestException('El ID del trabajador no es válido');
    }

    const { canonicalTrabajadorId, proveedorSaludId, policy } =
      await this.resolveConsentRegimeContext(trabajadorId);

    if (!policy.features.dailyConsentEnabled) {
      return this.buildNotRequiredStatus();
    }

    const consentimiento = await this.consentimientoModel
      .findOne(this.buildLookupFilter(proveedorSaludId, canonicalTrabajadorId))
      .lean();

    if (!consentimiento) {
      return this.buildRequiredStatus(false);
    }

    return this.buildRequiredStatus(true, {
      acceptedAt: consentimiento.acceptedAt,
      acceptedByUserId: consentimiento.acceptedByUserId.toString(),
      metodo: consentimiento.metodo,
      version: consentimiento.version,
    });
  }

  private toCreatedResponse(saved: {
    _id: Types.ObjectId;
    proveedorSaludId: Types.ObjectId;
    trabajadorId: Types.ObjectId;
    tipoConsentimiento: string;
    version: string;
    acceptedAt: Date;
    acceptedByUserId: Types.ObjectId;
    metodo: string;
    createdAt?: Date;
  }): ConsentimientoCreatedResponseDto {
    return {
      _id: saved._id.toString(),
      proveedorSaludId: saved.proveedorSaludId.toString(),
      trabajadorId: saved.trabajadorId.toString(),
      tipoConsentimiento: saved.tipoConsentimiento,
      version: saved.version,
      acceptedAt: saved.acceptedAt,
      acceptedByUserId: saved.acceptedByUserId.toString(),
      metodo: saved.metodo,
      createdAt: (saved as any).createdAt || new Date(),
    };
  }

  async create(
    dto: CreateConsentimientoDto,
    userId: string,
  ): Promise<ConsentimientoCreatedResponseDto> {
    if (!isValidObjectId(dto.trabajadorId)) {
      throw new BadRequestException('El ID del trabajador no es válido');
    }

    const { canonicalTrabajadorId, proveedorSaludId, policy } =
      await this.resolveConsentRegimeContext(dto.trabajadorId);

    if (!policy.features.dailyConsentEnabled) {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.CONSENT_NOT_ENABLED,
        regime: policy.regime,
      });
    }

    const lookup = this.buildLookupFilter(
      proveedorSaludId,
      canonicalTrabajadorId,
    );

    const existing = await this.consentimientoModel.findOne(lookup).lean();
    if (existing) {
      return this.toCreatedResponse(existing as any);
    }

    const now = new Date();
    const payload = {
      ...lookup,
      literal: CONSENTIMIENTO_TRATAMIENTO_INFORMACION_SIRES.literal,
      declaracionProfesional:
        CONSENTIMIENTO_TRATAMIENTO_INFORMACION_SIRES.declaracionProfesional,
      metodo: dto.metodo,
      acceptedByUserId: new Types.ObjectId(userId),
      acceptedAt: now,
      source: 'UI',
    };

    try {
      const created = await this.consentimientoModel.create(payload);

      await this.auditService.record({
        proveedorSaludId,
        actorId: userId,
        actionType: AuditActionType.CONSENT_CREATED,
        resourceType: RESOURCE_TYPE_CONSENTIMIENTO_TRATAMIENTO_SIRES,
        resourceId: created._id.toString(),
        payload: {
          trabajadorId: canonicalTrabajadorId,
          tipoConsentimiento: TIPO_CONSENTIMIENTO_TRATAMIENTO,
          version: created.version,
          metodo: created.metodo,
          acceptedAt: created.acceptedAt.toISOString(),
        },
        eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
      });

      return this.toCreatedResponse(created as any);
    } catch (error: any) {
      if (error?.code === 11000) {
        const duplicate = await this.consentimientoModel.findOne(lookup).lean();
        if (duplicate) {
          return this.toCreatedResponse(duplicate as any);
        }
      }
      throw error;
    }
  }

  async findCurrentConsentimientoForTrabajador(
    trabajadorId: string,
  ): Promise<Consentimiento | null> {
    const canonicalTrabajadorId =
      await this.workerFusionService.getCanonicalTrabajadorId(trabajadorId);
    const proveedorSaludId = await getProveedorSaludIdFromTrabajador(
      canonicalTrabajadorId,
      this.trabajadorModel,
      this.centroTrabajoModel,
      this.empresaModel,
    );
    if (!proveedorSaludId) {
      return null;
    }

    return this.findCurrentConsentimientoByResolvedIds(
      proveedorSaludId,
      canonicalTrabajadorId,
    );
  }
}
