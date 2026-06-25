import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trabajador } from '../../modules/trabajadores/schemas/trabajador.schema';
import { CentroTrabajo } from '../../modules/centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from '../../modules/empresas/schemas/empresa.schema';
import { RegulatoryPolicyService } from '../regulatory-policy.service';
import { createRegulatoryError } from '../regulatory-error-helper';
import { RegulatoryErrorCode } from '../regulatory-error-codes';
import {
  RequireTreatmentConsentOptions,
  REQUIRE_TREATMENT_CONSENT_KEY,
} from '../decorators/require-treatment-consent.decorator';
import {
  extractTrabajadorId,
  getProveedorSaludIdFromTrabajador,
} from '../helpers/treatment-consent.helper';
import { isValidObjectId } from 'mongoose';
import { WorkerFusionService } from '../../modules/trabajadores/worker-fusion.service';
import { ConsentimientosService } from '../../modules/consentimientos/consentimientos.service';
import { CONSENTIMIENTO_TRATAMIENTO_INFORMACION_SIRES } from '../../modules/consentimientos/constants/consentimiento-text.constants';

/**
 * Valida consentimiento para tratamiento de información en SIRES (versión vigente)
 * antes de acciones protegidas (p. ej. creación documental).
 */
@Injectable()
export class TreatmentConsentGuard implements CanActivate {
  private readonly logger = new Logger(TreatmentConsentGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectModel(Trabajador.name)
    private trabajadorModel: Model<Trabajador>,
    @InjectModel(CentroTrabajo.name)
    private centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(Empresa.name)
    private empresaModel: Model<Empresa>,
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
    private readonly workerFusionService: WorkerFusionService,
    private readonly consentimientosService: ConsentimientosService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RequireTreatmentConsentOptions>(
      REQUIRE_TREATMENT_CONSENT_KEY,
      context.getHandler(),
    );

    if (!options) {
      return true;
    }

    const trabajadorId = extractTrabajadorId(context);

    if (options.skipIfNoTrabajadorId && !trabajadorId) {
      return true;
    }

    if (!trabajadorId) {
      throw new BadRequestException(
        'trabajadorId es requerido para esta acción',
      );
    }

    if (!isValidObjectId(trabajadorId)) {
      throw new BadRequestException('El ID del trabajador no es válido');
    }

    const canonicalTrabajadorId =
      await this.workerFusionService.getCanonicalTrabajadorId(trabajadorId);

    const proveedorSaludId = await getProveedorSaludIdFromTrabajador(
      canonicalTrabajadorId,
      this.trabajadorModel,
      this.centroTrabajoModel,
      this.empresaModel,
    );

    if (!proveedorSaludId) {
      throw new ForbiddenException(
        'No se pudo determinar el proveedor de salud del trabajador',
      );
    }

    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);

    if (!policy.features.dailyConsentEnabled) {
      return true;
    }

    const currentVersion = CONSENTIMIENTO_TRATAMIENTO_INFORMACION_SIRES.version;
    let accepted: boolean;
    try {
      accepted = await this.consentimientosService.hasAcceptedCurrentVersion(
        proveedorSaludId,
        canonicalTrabajadorId,
      );
    } catch (error) {
      this.logger.error(
        `Error al validar consentimiento para trabajador ${trabajadorId}:`,
        error,
      );
      throw new ForbiddenException(
        'Error al validar consentimiento. Por favor, intenta nuevamente.',
      );
    }

    if (!accepted) {
      const action = options.action || 'unknown';
      this.logger.warn(
        `Consentimiento requerido (v${currentVersion}) no encontrado para trabajador ${trabajadorId} (acción: ${action})`,
      );
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.CONSENT_REQUIRED,
        details: {
          trabajadorId,
          action,
          currentVersion,
        },
        regime: policy.regime,
      });
    }

    return true;
  }
}
