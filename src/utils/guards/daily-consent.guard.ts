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
import { Model, Types } from 'mongoose';
import { ConsentimientoDiario } from '../../modules/consentimiento-diario/schemas/consentimiento-diario.schema';
import { Trabajador } from '../../modules/trabajadores/schemas/trabajador.schema';
import { CentroTrabajo } from '../../modules/centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from '../../modules/empresas/schemas/empresa.schema';
import { RegulatoryPolicyService } from '../regulatory-policy.service';
import { ProveedoresSaludService } from '../../modules/proveedores-salud/proveedores-salud.service';
import { calculateDateKey } from '../date-key.util';
import { createRegulatoryError } from '../regulatory-error-helper';
import { RegulatoryErrorCode } from '../regulatory-error-codes';
import {
  RequireDailyConsentOptions,
  REQUIRE_DAILY_CONSENT_KEY,
} from '../decorators/require-daily-consent.decorator';
import {
  extractTrabajadorId,
  getProveedorSaludIdFromTrabajador,
} from '../helpers/daily-consent.helper';
import { isValidObjectId } from 'mongoose';
import { WorkerFusionService } from '../../modules/trabajadores/worker-fusion.service';

/**
 * Guard para enforcement de consentimiento informado diario
 *
 * Este guard valida que exista un consentimiento diario válido antes de permitir
 * ejecutar acciones protegidas. Solo aplica para proveedores con régimen SIRES_NOM024
 * cuando dailyConsentEnabled === true.
 *
 * @example
 * @Post(':documentType/crear')
 * @UseGuards(DailyConsentGuard)
 * @RequireDailyConsent({ action: 'create_document' })
 * async createDocument(...) {
 *   // El guard ya validó el consentimiento antes de llegar aquí
 * }
 */
@Injectable()
export class DailyConsentGuard implements CanActivate {
  private readonly logger = new Logger(DailyConsentGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectModel(ConsentimientoDiario.name)
    private consentimientoDiarioModel: Model<ConsentimientoDiario>,
    @InjectModel(Trabajador.name)
    private trabajadorModel: Model<Trabajador>,
    @InjectModel(CentroTrabajo.name)
    private centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(Empresa.name)
    private empresaModel: Model<Empresa>,
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
    private readonly proveedoresSaludService: ProveedoresSaludService,
    private readonly workerFusionService: WorkerFusionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Obtener metadata del decorador
    const options = this.reflector.get<RequireDailyConsentOptions>(
      REQUIRE_DAILY_CONSENT_KEY,
      context.getHandler(),
    );

    // Si no hay decorador, no validar (paso-through)
    if (!options) {
      return true;
    }

    // 2. Extraer trabajadorId desde múltiples fuentes
    const trabajadorId = extractTrabajadorId(context);

    // Si skipIfNoTrabajadorId está habilitado y no hay trabajadorId, permitir
    if (options.skipIfNoTrabajadorId && !trabajadorId) {
      return true;
    }

    // Validar que trabajadorId esté presente y sea válido
    if (!trabajadorId) {
      throw new BadRequestException(
        'trabajadorId es requerido para esta acción',
      );
    }

    if (!isValidObjectId(trabajadorId)) {
      throw new BadRequestException('El ID del trabajador no es válido');
    }

    // 2.5 NOM-024: Resolver a trabajador canónico (fusión de registros)
    // El consentimiento se asocia al canónico; si se accede desde un duplicado,
    // debemos buscar el consentimiento del canónico para no pedirlo de nuevo
    const canonicalTrabajadorId =
      await this.workerFusionService.getCanonicalTrabajadorId(trabajadorId);

    // 3. Obtener proveedorSaludId desde trabajador
    const proveedorSaludId = await getProveedorSaludIdFromTrabajador(
      trabajadorId,
      this.trabajadorModel,
      this.centroTrabajoModel,
      this.empresaModel,
    );

    if (!proveedorSaludId) {
      throw new ForbiddenException(
        'No se pudo determinar el proveedor de salud del trabajador',
      );
    }

    // 4. Obtener policy
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);

    // 5. Si dailyConsentEnabled === false, permitir (pass-through silencioso)
    if (!policy.features.dailyConsentEnabled) {
      return true;
    }

    // 6. Calcular dateKey (backend es fuente de verdad del "día")
    let dateKey: string;
    try {
      const proveedor =
        await this.proveedoresSaludService.findOne(proveedorSaludId);
      dateKey = calculateDateKey((proveedor as any) || null);
    } catch (error) {
      this.logger.error(
        `Error al calcular dateKey para proveedor ${proveedorSaludId}:`,
        error,
      );
      throw new ForbiddenException(
        'Error al validar consentimiento. Por favor, intenta nuevamente.',
      );
    }

    // 7. Buscar consentimiento existente (usar canonicalTrabajadorId para fusión)
    let consentimiento;
    try {
      consentimiento = await this.consentimientoDiarioModel
        .findOne({
          proveedorSaludId: new Types.ObjectId(proveedorSaludId),
          trabajadorId: new Types.ObjectId(canonicalTrabajadorId),
          dateKey: dateKey,
        })
        .lean();
    } catch (error) {
      this.logger.error(
        `Error al buscar consentimiento para trabajador ${trabajadorId} en ${dateKey}:`,
        error,
      );
      // Fallar de forma segura: no permitir acceso si hay error técnico
      throw new ForbiddenException(
        'Error al validar consentimiento. Por favor, intenta nuevamente.',
      );
    }

    // 8. Si NO existe consentimiento, bloquear con error regulatorio
    if (!consentimiento) {
      const action = options.action || 'unknown';
      this.logger.warn(
        `Consentimiento requerido pero no encontrado para trabajador ${trabajadorId} en dateKey ${dateKey} (acción: ${action})`,
      );
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.CONSENT_REQUIRED,
        details: {
          trabajadorId: trabajadorId,
          dateKey: dateKey,
          action: action,
        },
        regime: policy.regime,
      });
    }

    // 9. Validación explícita de dateKey (defensa en profundidad)
    // Aunque la búsqueda ya filtra por dateKey, validamos explícitamente
    // para detectar edge cases de race conditions o inconsistencias
    if (consentimiento.dateKey !== dateKey) {
      const action = options.action || 'unknown';
      this.logger.warn(
        `Consentimiento encontrado pero con dateKey incorrecto para trabajador ${trabajadorId}. Esperado: ${dateKey}, Encontrado: ${consentimiento.dateKey} (acción: ${action})`,
      );
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.CONSENT_INVALID_DATE,
        details: {
          trabajadorId: trabajadorId,
          dateKey: dateKey,
          action: action,
        },
        regime: policy.regime,
      });
    }

    // 10. Si existe consentimiento con dateKey válido, permitir acceso
    this.logger.debug(
      `Consentimiento válido encontrado para trabajador ${trabajadorId} en dateKey ${dateKey}`,
    );
    return true;
  }
}
