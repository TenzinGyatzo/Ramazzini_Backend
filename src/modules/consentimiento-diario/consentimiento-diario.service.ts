import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConsentimientoDiario } from './schemas/consentimiento-diario.schema';
import { Trabajador } from '../trabajadores/schemas/trabajador.schema';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from '../empresas/schemas/empresa.schema';
import { ProveedoresSalud } from '../proveedores-salud/entities/proveedores-salud.entity';
import { CreateConsentimientoDiarioDto } from './dto/create-consentimiento-diario.dto';
import {
  ConsentimientoStatusResponseDto,
  ConsentimientoCreatedResponseDto,
} from './dto/consentimiento-response.dto';
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';
import { createRegulatoryError } from '../../utils/regulatory-error-helper';
import { RegulatoryErrorCode } from '../../utils/regulatory-error-codes';
import { calculateDateKey } from '../../utils/date-key.util';
import { CONSENT_TEXT } from './constants/consent-text.constants';
import { ProveedoresSaludService } from '../proveedores-salud/proveedores-salud.service';
import { isValidObjectId } from 'mongoose';
import { WorkerFusionService } from '../trabajadores/worker-fusion.service';

@Injectable()
export class ConsentimientoDiarioService {
  constructor(
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

  /**
   * Obtiene el proveedorSaludId desde un trabajador
   * Trabajador -> CentroTrabajo -> Empresa -> ProveedorSalud
   */
  private async getProveedorSaludIdFromTrabajador(
    trabajadorId: string,
  ): Promise<string | null> {
    try {
      const trabajador = await this.trabajadorModel
        .findById(trabajadorId)
        .lean();
      if (!trabajador || !trabajador.idCentroTrabajo) {
        return null;
      }

      const centroTrabajo = await this.centroTrabajoModel
        .findById(trabajador.idCentroTrabajo)
        .lean();
      if (!centroTrabajo || !centroTrabajo.idEmpresa) {
        return null;
      }

      const empresa = await this.empresaModel
        .findById(centroTrabajo.idEmpresa)
        .lean();
      if (!empresa || !empresa.idProveedorSalud) {
        return null;
      }

      return empresa.idProveedorSalud.toString();
    } catch {
      return null;
    }
  }

  /**
   * Obtiene el estado del consentimiento diario para un trabajador
   */
  async getStatus(
    trabajadorId: string,
    userId: string,
    dateKey?: string,
  ): Promise<ConsentimientoStatusResponseDto> {
    // 1. Validar trabajadorId (ObjectId válido)
    if (!isValidObjectId(trabajadorId)) {
      throw new BadRequestException('El ID del trabajador no es válido');
    }

    // 2. NOM-024: Resolver a trabajador canónico (fusión de registros)
    const canonicalTrabajadorId =
      await this.workerFusionService.getCanonicalTrabajadorId(trabajadorId);

    // 3. Obtener trabajador y validar existencia
    const trabajador = await this.trabajadorModel
      .findById(canonicalTrabajadorId)
      .lean();
    if (!trabajador) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    // 4. Obtener proveedorSaludId desde trabajador
    const proveedorSaludId =
      await this.getProveedorSaludIdFromTrabajador(canonicalTrabajadorId);
    if (!proveedorSaludId) {
      throw new ForbiddenException(
        'No se pudo determinar el proveedor de salud del trabajador',
      );
    }

    // 5. Obtener policy
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);

    // 6. Gate SIRES-only: Si dailyConsentEnabled es false → throw CONSENT_NOT_ENABLED
    if (!policy.features.dailyConsentEnabled) {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.CONSENT_NOT_ENABLED,
        regime: policy.regime,
      });
    }

    // 7. Calcular dateKey si no se proporciona
    let finalDateKey: string;
    if (dateKey) {
      // Validar formato YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        throw new BadRequestException(
          'dateKey debe estar en formato YYYY-MM-DD',
        );
      }
      finalDateKey = dateKey;
    } else {
      // Obtener proveedor para calcular dateKey con timezone
      const proveedor =
        await this.proveedoresSaludService.findOne(proveedorSaludId);
      finalDateKey = calculateDateKey((proveedor as any) || null);
    }

    // 8. Buscar consentimiento existente (usar canonical para fusión)
    const consentimiento = await this.consentimientoDiarioModel
      .findOne({
        proveedorSaludId: new Types.ObjectId(proveedorSaludId),
        trabajadorId: new Types.ObjectId(canonicalTrabajadorId),
        dateKey: finalDateKey,
      })
      .lean();

    // 9. Retornar respuesta
    if (consentimiento) {
      return {
        hasConsent: true,
        dateKey: finalDateKey,
        consent: {
          acceptedAt: consentimiento.acceptedAt,
          acceptedByUserId: consentimiento.acceptedByUserId.toString(),
          consentMethod: consentimiento.consentMethod,
          consentTextVersion: consentimiento.consentTextVersion,
        },
      };
    } else {
      return {
        hasConsent: false,
        dateKey: finalDateKey,
      };
    }
  }

  /**
   * Crea un nuevo consentimiento diario
   */
  async create(
    dto: CreateConsentimientoDiarioDto,
    userId: string,
  ): Promise<ConsentimientoCreatedResponseDto> {
    // 1. Validar trabajadorId (ObjectId válido)
    if (!isValidObjectId(dto.trabajadorId)) {
      throw new BadRequestException('El ID del trabajador no es válido');
    }

    // 2. NOM-024: Resolver a trabajador canónico (fusión de registros)
    // Siempre guardar consentimiento con el canónico para que aplique desde cualquier registro
    const canonicalTrabajadorId =
      await this.workerFusionService.getCanonicalTrabajadorId(dto.trabajadorId);

    // 3. Obtener trabajador
    const trabajador = await this.trabajadorModel
      .findById(canonicalTrabajadorId)
      .lean();
    if (!trabajador) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    // 4. Obtener proveedorSaludId desde trabajador
    const proveedorSaludId = await this.getProveedorSaludIdFromTrabajador(
      canonicalTrabajadorId,
    );
    if (!proveedorSaludId) {
      throw new ForbiddenException(
        'No se pudo determinar el proveedor de salud del trabajador',
      );
    }

    // 4. Obtener policy y validar dailyConsentEnabled
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    if (!policy.features.dailyConsentEnabled) {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.CONSENT_NOT_ENABLED,
        regime: policy.regime,
      });
    }

    // 5. Calcular/validar dateKey
    let finalDateKey: string;
    if (dto.dateKey) {
      // Validar formato YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.dateKey)) {
        throw new BadRequestException(
          'dateKey debe estar en formato YYYY-MM-DD',
        );
      }
      finalDateKey = dto.dateKey;
    } else {
      // Calcular "hoy" usando calculateDateKey
      const proveedor =
        await this.proveedoresSaludService.findOne(proveedorSaludId);
      finalDateKey = calculateDateKey((proveedor as any) || null);
    }

    // 6. Validar unicidad: Buscar consentimiento existente (usar canonical)
    const existingConsent = await this.consentimientoDiarioModel
      .findOne({
        proveedorSaludId: new Types.ObjectId(proveedorSaludId),
        trabajadorId: new Types.ObjectId(canonicalTrabajadorId),
        dateKey: finalDateKey,
      })
      .lean();

    if (existingConsent) {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.CONSENT_ALREADY_EXISTS,
      });
    }

    // 7. Obtener texto del consentimiento desde constante
    // (ya está importado como CONSENT_TEXT)

    // 8. Crear registro (siempre con canonical para fusión)
    const consentimiento = new this.consentimientoDiarioModel({
      proveedorSaludId: new Types.ObjectId(proveedorSaludId),
      trabajadorId: new Types.ObjectId(canonicalTrabajadorId),
      dateKey: finalDateKey,
      acceptedAt: new Date(), // Server timestamp
      acceptedByUserId: new Types.ObjectId(userId),
      consentMethod: dto.consentMethod,
      source: 'UI',
      consentTextLiteral: CONSENT_TEXT.literal,
      consentTextVersion: CONSENT_TEXT.version,
    });

    // 9. Guardar y retornar
    const saved = await consentimiento.save();

    return {
      _id: saved._id.toString(),
      proveedorSaludId: saved.proveedorSaludId.toString(),
      trabajadorId: saved.trabajadorId.toString(),
      dateKey: saved.dateKey,
      acceptedAt: saved.acceptedAt,
      acceptedByUserId: saved.acceptedByUserId.toString(),
      consentMethod: saved.consentMethod,
      consentTextVersion: saved.consentTextVersion,
      createdAt: (saved as any).createdAt || new Date(),
    };
  }
}
