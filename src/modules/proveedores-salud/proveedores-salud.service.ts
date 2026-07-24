import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
  NotFoundException,
} from '@nestjs/common';
import { CreateProveedoresSaludDto } from './dto/create-proveedores-salud.dto';
import { UpdateProveedoresSaludDto } from './dto/update-proveedores-salud.dto';
import { ChangeRegimenRegulatorioDto } from './dto/change-regimen-regulatorio.dto';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ProveedorSalud } from './schemas/proveedor-salud.schema';
import { Connection, Model, Types } from 'mongoose';
import { Empresa } from '../empresas/schemas/empresa.schema';
import { Suscripcion } from '../pagos/schemas/suscripcion.schema';
import { normalizeProveedorSaludData } from 'src/utils/normalization';
import { NOM024ComplianceUtil } from 'src/utils/nom024-compliance.util';
import { CatalogsService } from '../catalogs/catalogs.service';
import { RegulatoryPolicyService } from 'src/utils/regulatory-policy.service';
import { canChangeRegimenRegulatorio } from 'src/utils/user-role-helpers';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import {
  isValidCluesFormat,
  requiresCluesCatalogValidation,
} from 'src/utils/clues-validator.util';

export interface PanelAdminPrincipalUser {
  username: string;
  email: string;
  phone?: string;
}

export interface PanelAdminProveedorRow {
  _id: string;
  empresasCount: number;
  principalUser: PanelAdminPrincipalUser | null;
  historiasClinicasMes: number;
  notasMedicasMes: number;
  totalHistoriasClinicas: number;
  totalNotasMedicas: number;
  suscripcion: Record<string, unknown> | null;
}

@Injectable()
export class ProveedoresSaludService {
  constructor(
    @InjectModel(ProveedorSalud.name)
    private proveedoresSaludModel: Model<ProveedorSalud>,
    @InjectModel('User')
    private userModel: Model<any>,
    @InjectModel(Empresa.name)
    private empresaModel: Model<Empresa>,
    @InjectModel(Suscripcion.name)
    private suscripcionModel: Model<Suscripcion>,
    @InjectConnection()
    private connection: Connection,
    @Inject(forwardRef(() => NOM024ComplianceUtil))
    private nom024Util: NOM024ComplianceUtil,
    private catalogsService: CatalogsService,
    @Inject(forwardRef(() => RegulatoryPolicyService))
    private regulatoryPolicyService: RegulatoryPolicyService,
    @Inject(forwardRef(() => AuditService))
    private auditService: AuditService,
  ) {}

  /**
   * Validate régimen regulatorio according to business rules.
   * La declaración de contexto operativo solo es obligatoria en create/onboarding
   * (requireDeclaracionOperativa = true), no al editar el perfil.
   */
  private validateRegimenRegulatorio(
    dto: CreateProveedoresSaludDto | any,
    options: { requireDeclaracionOperativa?: boolean } = {},
  ): void {
    const requireDeclaracionOperativa =
      options.requireDeclaracionOperativa ?? true;
    const pais = dto.pais?.trim().toUpperCase();
    const isMX = pais === 'MX';
    let regimen = dto.regimenRegulatorio;

    // Normalización: convertir valores antiguos a nuevo formato
    if (regimen === 'NO_SUJETO_SIRES') {
      regimen = 'SIN_REGIMEN';
      dto.regimenRegulatorio = 'SIN_REGIMEN';
    }

    // Regla 1: Si país NO es México, rechazar régimen mexicano
    if (!isMX && regimen) {
      if (regimen === 'SIRES_NOM024') {
        throw new BadRequestException(
          'El régimen regulatorio SIRES solo aplica para proveedores en México',
        );
      }
      // Para países != México, normalizar a SIN_REGIMEN si viene otro valor
      if (regimen && regimen !== 'SIN_REGIMEN') {
        dto.regimenRegulatorio = 'SIN_REGIMEN';
      }
    }

    // Regla 2: Si es México y no se envía régimen, normalizar a SIN_REGIMEN
    if (isMX && !regimen) {
      dto.regimenRegulatorio = 'SIN_REGIMEN';
    }

    // Regla 3: Declaración de contexto operativo solo en onboarding/create
    if (
      requireDeclaracionOperativa &&
      isMX &&
      (regimen === 'SIN_REGIMEN' || dto.regimenRegulatorio === 'SIN_REGIMEN')
    ) {
      if (!dto.declaracionAceptada) {
        throw new BadRequestException(
          'La declaración de contexto operativo es obligatoria para continuar sin régimen regulatorio',
        );
      }
    }

    // Regla 4: Si régimen es SIRES_NOM024, CLUES sigue siendo opcional
    // (ya está manejado en la validación existente de CLUES)
  }

  /**
   * Validate CLUES according to regulatory policy
   * CLUES is optional in all cases, but if provided, it must be valid for SIRES_NOM024 providers
   */
  private async validateCLUESForMX(
    clues: string | undefined,
    proveedorSaludId: string,
  ): Promise<void> {
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);

    // CLUES is now optional in all cases. Only validate if provided.
    if (!clues || clues.trim() === '') {
      return;
    }

    const normalizedClues = clues.trim().toUpperCase();

    // Validate format (11 alphanumeric characters or sentinel 9998)
    if (!isValidCluesFormat(normalizedClues)) {
      throw new BadRequestException(
        'CLUES debe tener exactamente 11 caracteres alfanuméricos o el código 9998 (servicios médicos privados)',
      );
    }

    // Only validate against catalog if policy allows CLUES field (SIRES_NOM024)
    if (
      policy.features.cluesFieldVisible &&
      requiresCluesCatalogValidation(normalizedClues)
    ) {
      // SIRES provider: Validate against catalog if provided
      const isValid = await this.catalogsService.validateCLUES(normalizedClues);
      if (!isValid) {
        throw new BadRequestException(
          `CLUES inválido: ${normalizedClues}. No se encuentra en el catálogo de establecimientos de salud`,
        );
      }

      // Validate that establishment is in operation
      const isInOperation =
        await this.catalogsService.validateCLUESInOperation(normalizedClues);
      if (!isInOperation) {
        const cluesEntry =
          await this.catalogsService.getCLUESEntry(normalizedClues);
        const estatus = cluesEntry?.estatus || 'Desconocido';
        throw new BadRequestException(
          `CLUES ${normalizedClues} no está en operación. Estatus actual: ${estatus}`,
        );
      }
    }
    // SIN_REGIMEN: CLUES ignored (no catalog validation, but format was already validated)
  }

  async create(
    createProveedoresSaludDto: CreateProveedoresSaludDto,
  ): Promise<ProveedorSalud> {
    const normalizedDto = normalizeProveedorSaludData(
      createProveedoresSaludDto,
    );

    // Validar régimen regulatorio ANTES de otras validaciones
    this.validateRegimenRegulatorio(normalizedDto);

    // Asignar timestamp de declaración si aplica
    if (
      (normalizedDto.regimenRegulatorio === 'SIN_REGIMEN' ||
        normalizedDto.regimenRegulatorio === 'NO_SUJETO_SIRES') &&
      normalizedDto.declaracionAceptada
    ) {
      normalizedDto.declaracionAceptadaAt = new Date();
      // Asignar versión si no viene (opcional, similar a termsVersion)
      if (!normalizedDto.declaracionVersion) {
        normalizedDto.declaracionVersion = '1.0';
      }
    }

    // Validate CLUES according to regulatory policy
    // For new providers, check regimenRegulatorio from DTO
    const regimen = normalizedDto.regimenRegulatorio || 'SIN_REGIMEN';
    const cluesFieldVisible = regimen === 'SIRES_NOM024';

    if (normalizedDto.clues && normalizedDto.clues.trim() !== '') {
      const normalizedClues = normalizedDto.clues.trim().toUpperCase();

      // Validate format (11 alphanumeric characters or sentinel 9998)
      if (!isValidCluesFormat(normalizedClues)) {
        throw new BadRequestException(
          'CLUES debe tener exactamente 11 caracteres alfanuméricos o el código 9998 (servicios médicos privados)',
        );
      }

      // Only validate against catalog if policy allows CLUES field (SIRES_NOM024)
      if (cluesFieldVisible && requiresCluesCatalogValidation(normalizedClues)) {
        // SIRES provider: Validate against catalog
        const isValid =
          await this.catalogsService.validateCLUES(normalizedClues);
        if (!isValid) {
          throw new BadRequestException(
            `CLUES inválido: ${normalizedClues}. No se encuentra en el catálogo de establecimientos de salud`,
          );
        }

        // Validate that establishment is in operation
        const isInOperation =
          await this.catalogsService.validateCLUESInOperation(normalizedClues);
        if (!isInOperation) {
          const cluesEntry =
            await this.catalogsService.getCLUESEntry(normalizedClues);
          const estatus = cluesEntry?.estatus || 'Desconocido';
          throw new BadRequestException(
            `CLUES ${normalizedClues} no está en operación. Estatus actual: ${estatus}`,
          );
        }
      }
      // SIN_REGIMEN: CLUES ignored (no catalog validation, but format was already validated)

      normalizedDto.clues = normalizedClues;
    }

    const createdProveedorSalud = new this.proveedoresSaludModel(normalizedDto);
    const saved = await createdProveedorSalud.save();

    // Limpiar cache después de crear (aunque no debería haber cache aún)
    this.nom024Util.clearProviderCache(saved._id.toString());

    return saved;
  }

  async findAll(): Promise<ProveedorSalud[]> {
    return this.proveedoresSaludModel.find().exec();
  }

  async findOne(id: string): Promise<ProveedorSalud> {
    return this.proveedoresSaludModel.findById(id).exec();
  }

  // **Método para actualizar un proveedor de salud**
  /* async update(id: string, updateProveedoresSaludDto: UpdateProveedoresSaludDto): Promise<ProveedorSalud> {
    const normalizedDto = normalizeProveedorSaludData(updateProveedoresSaludDto);
    return this.proveedoresSaludModel.findByIdAndUpdate(id, normalizedDto, { new: true }).exec();
  } */

  // **Método para actualizar los campos de uno por uno**
  async update(
    id: string,
    updateDto: UpdateProveedoresSaludDto,
  ): Promise<ProveedorSalud> {
    const proveedor = await this.proveedoresSaludModel.findById(id);
    if (!proveedor) throw new Error('Proveedor de salud no encontrado');

    const normalizedDto = normalizeProveedorSaludData(updateDto);

    // Validar régimen regulatorio si se está actualizando
    if (
      normalizedDto.regimenRegulatorio !== undefined ||
      normalizedDto.pais !== undefined
    ) {
      // Crear un DTO temporal con los valores actuales y los nuevos para validar
      const dtoToValidate = {
        pais: normalizedDto.pais || proveedor.pais,
        regimenRegulatorio:
          normalizedDto.regimenRegulatorio || proveedor.regimenRegulatorio,
        declaracionAceptada:
          normalizedDto.declaracionAceptada !== undefined
            ? normalizedDto.declaracionAceptada
            : proveedor.declaracionAceptada,
      };
      // En update/perfil no exigir declaración (solo aplica en onboarding/create)
      this.validateRegimenRegulatorio(dtoToValidate, {
        requireDeclaracionOperativa: false,
      });

      // Normalizar valores antiguos a nuevo formato
      if (dtoToValidate.regimenRegulatorio === 'NO_SUJETO_SIRES') {
        dtoToValidate.regimenRegulatorio = 'SIN_REGIMEN';
        normalizedDto.regimenRegulatorio = 'SIN_REGIMEN';
      }
      if (
        proveedor.regimenRegulatorio === 'NO_SUJETO_SIRES' &&
        !normalizedDto.regimenRegulatorio
      ) {
        // Si el proveedor tiene valor antiguo y no se está actualizando, normalizar
        normalizedDto.regimenRegulatorio = 'SIN_REGIMEN';
      }

      // Si se actualiza el régimen, actualizar también los campos relacionados
      if (
        normalizedDto.regimenRegulatorio === 'SIN_REGIMEN' ||
        normalizedDto.regimenRegulatorio === 'NO_SUJETO_SIRES'
      ) {
        if (normalizedDto.declaracionAceptada) {
          normalizedDto.declaracionAceptadaAt = new Date();
          if (!normalizedDto.declaracionVersion) {
            normalizedDto.declaracionVersion = '1.0';
          }
        }
      }
    }

    // Limpiar cache del proveedor después de actualizar
    this.nom024Util.clearProviderCache(id);

    // Obtener política regulatoria para validar CLUES
    const policy = await this.regulatoryPolicyService.getRegulatoryPolicy(id);

    // Use current CLUES if not being updated, otherwise use new CLUES
    const cluesToValidate =
      normalizedDto.clues !== undefined ? normalizedDto.clues : proveedor.clues;

    // Validar CLUES solo si:
    // 1. El campo debe ser visible según el régimen (SIRES_NOM024)
    // 2. Se proporciona un valor
    if (
      policy.features.cluesFieldVisible &&
      cluesToValidate &&
      cluesToValidate.trim() !== ''
    ) {
      await this.validateCLUESForMX(cluesToValidate, id);
    }

    // Normalize CLUES to uppercase if provided (non-empty); empty string clears the field
    if (normalizedDto.clues !== undefined && normalizedDto.clues !== '') {
      normalizedDto.clues = normalizedDto.clues.trim().toUpperCase();
    }

    // ✅ Asegura que también se actualicen los valores vacíos como ""
    for (const key in normalizedDto) {
      proveedor[key] = normalizedDto[key];
    }

    return proveedor.save();
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.proveedoresSaludModel
      .findByIdAndDelete(id)
      .exec();
    return result !== null;
  }

  async getTopEmpresasByWorkers(idProveedorSalud: string, limit = 3) {
    return await this.proveedoresSaludModel.aggregate([
      {
        $match: { _id: new Types.ObjectId(idProveedorSalud) }, // Filtrar solo por el proveedor de salud
      },
      {
        $lookup: {
          from: 'empresas', // Unir con las empresas del proveedor
          localField: '_id',
          foreignField: 'idProveedorSalud', // Relación con proveedor
          as: 'empresas',
        },
      },
      {
        $unwind: { path: '$empresas', preserveNullAndEmptyArrays: true }, // Descomponer las empresas
      },
      {
        $lookup: {
          from: 'centrotrabajos', // Unir con los centros de trabajo
          localField: 'empresas._id',
          foreignField: 'idEmpresa',
          as: 'centros',
        },
      },
      {
        $unwind: { path: '$centros', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'trabajadors', // Unir con los trabajadores
          localField: 'centros._id',
          foreignField: 'idCentroTrabajo',
          as: 'trabajadores',
        },
      },
      {
        $group: {
          _id: '$empresas._id', // Agrupar por empresa
          nombreComercial: { $first: '$empresas.nombreComercial' }, // Tomar el nombre de la empresa
          totalTrabajadores: { $sum: { $size: '$trabajadores' } }, // Contar los trabajadores
        },
      },
      {
        $sort: { totalTrabajadores: -1 },
      },
      {
        $limit: limit,
      },
    ]);
  }

  async getHistoriasClinicasDelMes(idProveedorSalud: string) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const result = await this.proveedoresSaludModel.aggregate([
      {
        $match: { _id: new Types.ObjectId(idProveedorSalud) },
      },
      {
        $lookup: {
          from: 'empresas',
          localField: '_id',
          foreignField: 'idProveedorSalud',
          as: 'empresas',
        },
      },
      { $unwind: '$empresas' },
      {
        $lookup: {
          from: 'centrotrabajos',
          localField: 'empresas._id',
          foreignField: 'idEmpresa',
          as: 'centros',
        },
      },
      { $unwind: '$centros' },
      {
        $lookup: {
          from: 'trabajadors',
          localField: 'centros._id',
          foreignField: 'idCentroTrabajo',
          as: 'trabajadores',
        },
      },
      { $unwind: '$trabajadores' },
      {
        $lookup: {
          from: 'historiaclinicas',
          localField: 'trabajadores._id',
          foreignField: 'idTrabajador',
          as: 'historias',
        },
      },
      {
        $project: {
          historias: {
            $filter: {
              input: '$historias',
              as: 'historia',
              cond: {
                $and: [
                  { $gte: ['$$historia.createdAt', firstDay] },
                  { $lte: ['$$historia.createdAt', lastDay] },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          count: { $size: '$historias' },
        },
      },
      {
        $group: {
          _id: null,
          totalHistoriasClinicas: { $sum: '$count' },
        },
      },
    ]);

    return result.length > 0 ? result[0].totalHistoriasClinicas : 0;
  }

  async getTodasHistoriasClinicas(idProveedorSalud: string) {
    const result = await this.proveedoresSaludModel.aggregate([
      {
        $match: { _id: new Types.ObjectId(idProveedorSalud) },
      },
      {
        $lookup: {
          from: 'empresas',
          localField: '_id',
          foreignField: 'idProveedorSalud',
          as: 'empresas',
        },
      },
      { $unwind: '$empresas' },
      {
        $lookup: {
          from: 'centrotrabajos',
          localField: 'empresas._id',
          foreignField: 'idEmpresa',
          as: 'centros',
        },
      },
      { $unwind: '$centros' },
      {
        $lookup: {
          from: 'trabajadors',
          localField: 'centros._id',
          foreignField: 'idCentroTrabajo',
          as: 'trabajadores',
        },
      },
      { $unwind: '$trabajadores' },
      {
        $lookup: {
          from: 'historiaclinicas',
          localField: 'trabajadores._id',
          foreignField: 'idTrabajador',
          as: 'historias',
        },
      },
      {
        $project: {
          count: { $size: '$historias' },
        },
      },
      {
        $group: {
          _id: null,
          totalHistoriasClinicas: { $sum: '$count' },
        },
      },
    ]);

    return result.length > 0 ? result[0].totalHistoriasClinicas : 0;
  }

  async getNotasMedicasDelMes(idProveedorSalud: string) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const result = await this.proveedoresSaludModel.aggregate([
      {
        $match: { _id: new Types.ObjectId(idProveedorSalud) },
      },
      {
        $lookup: {
          from: 'empresas',
          localField: '_id',
          foreignField: 'idProveedorSalud',
          as: 'empresas',
        },
      },
      { $unwind: '$empresas' },
      {
        $lookup: {
          from: 'centrotrabajos',
          localField: 'empresas._id',
          foreignField: 'idEmpresa',
          as: 'centros',
        },
      },
      { $unwind: '$centros' },
      {
        $lookup: {
          from: 'trabajadors',
          localField: 'centros._id',
          foreignField: 'idCentroTrabajo',
          as: 'trabajadores',
        },
      },
      { $unwind: '$trabajadores' },
      {
        $lookup: {
          from: 'notamedicas',
          localField: 'trabajadores._id',
          foreignField: 'idTrabajador',
          as: 'notas',
        },
      },
      {
        $project: {
          notas: {
            $filter: {
              input: '$notas',
              as: 'nota',
              cond: {
                $and: [
                  { $gte: ['$$nota.createdAt', firstDay] },
                  { $lte: ['$$nota.createdAt', lastDay] },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          count: { $size: '$notas' },
        },
      },
      {
        $group: {
          _id: null,
          totalNotasMedicas: { $sum: '$count' },
        },
      },
    ]);

    return result.length > 0 ? result[0].totalNotasMedicas : 0;
  }

  async getTodasNotasMedicas(idProveedorSalud: string) {
    const result = await this.proveedoresSaludModel.aggregate([
      {
        $match: { _id: new Types.ObjectId(idProveedorSalud) },
      },
      {
        $lookup: {
          from: 'empresas',
          localField: '_id',
          foreignField: 'idProveedorSalud',
          as: 'empresas',
        },
      },
      { $unwind: '$empresas' },
      {
        $lookup: {
          from: 'centrotrabajos',
          localField: 'empresas._id',
          foreignField: 'idEmpresa',
          as: 'centros',
        },
      },
      { $unwind: '$centros' },
      {
        $lookup: {
          from: 'trabajadors',
          localField: 'centros._id',
          foreignField: 'idCentroTrabajo',
          as: 'trabajadores',
        },
      },
      { $unwind: '$trabajadores' },
      {
        $lookup: {
          from: 'notamedicas',
          localField: 'trabajadores._id',
          foreignField: 'idTrabajador',
          as: 'notas',
        },
      },
      {
        $project: {
          count: { $size: '$notas' },
        },
      },
      {
        $group: {
          _id: null,
          totalNotasMedicas: { $sum: '$count' },
        },
      },
    ]);

    return result.length > 0 ? result[0].totalNotasMedicas : 0;
  }

  // **Métodos para reglas de puntaje**
  async getReglasPuntaje(idProveedorSalud: string) {
    const proveedor = await this.proveedoresSaludModel
      .findById(idProveedorSalud)
      .select('reglasPuntaje')
      .exec();

    if (!proveedor) {
      throw new Error('Proveedor de salud no encontrado');
    }

    // Si no tiene reglas configuradas, devolver las por defecto
    if (!proveedor.reglasPuntaje) {
      return {
        aptitudes: 3,
        historias: 1,
        exploraciones: 1,
        examenesVista: 1,
        audiometrias: 1,
        antidopings: 1,
        notas: 2,
        externos: 0,
      };
    }

    return proveedor.reglasPuntaje;
  }

  async updateReglasPuntaje(
    idProveedorSalud: string,
    reglasPuntaje: {
      aptitudes: number;
      historias: number;
      exploraciones: number;
      examenesVista: number;
      audiometrias: number;
      antidopings: number;
      notas: number;
      externos: number;
    },
  ) {
    const proveedor = await this.proveedoresSaludModel
      .findByIdAndUpdate(idProveedorSalud, { reglasPuntaje }, { new: true })
      .exec();

    if (!proveedor) {
      throw new Error('Proveedor de salud no encontrado');
    }

    return proveedor.reglasPuntaje;
  }

  /**
   * Cambia el régimen regulatorio de un proveedor de salud
   * Solo permite upgrade: SIN_REGIMEN → SIRES_NOM024
   * Bloquea downgrade: SIRES_NOM024 → SIN_REGIMEN
   * Persiste metadatos de auditoría del cambio
   */
  async changeRegimenRegulatorio(
    proveedorSaludId: string,
    userId: string,
    dto: ChangeRegimenRegulatorioDto,
  ): Promise<{ proveedorSalud: ProveedorSalud; regulatoryPolicy: any }> {
    // Validar ObjectId
    if (!Types.ObjectId.isValid(proveedorSaludId)) {
      throw new BadRequestException('ID de proveedor de salud inválido');
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID de usuario inválido');
    }

    // Validar que el usuario existe y pertenece al proveedor
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Validar que el usuario pertenece al proveedor
    const userProveedorId = user.idProveedorSalud?.toString();
    const proveedorIdStr = proveedorSaludId.toString();

    if (userProveedorId !== proveedorIdStr) {
      throw new ForbiddenException(
        'No tienes permisos para modificar este proveedor de salud',
      );
    }

    if (!canChangeRegimenRegulatorio(user.role)) {
      throw new ForbiddenException(
        'Solo el usuario principal puede cambiar el régimen regulatorio',
      );
    }

    // Obtener proveedor actual
    const proveedor = await this.proveedoresSaludModel
      .findById(proveedorSaludId)
      .exec();

    if (!proveedor) {
      throw new NotFoundException('Proveedor de salud no encontrado');
    }

    const regimenActual = proveedor.regimenRegulatorio || 'SIN_REGIMEN';
    const regimenNuevo = dto.regimenRegulatorio;

    // Validar que no es el mismo régimen
    if (regimenActual === regimenNuevo) {
      throw new BadRequestException(
        `El proveedor ya tiene el régimen ${regimenNuevo}`,
      );
    }

    // Validar transiciones permitidas
    // Solo permitir upgrade: SIN_REGIMEN → SIRES_NOM024
    if (regimenActual === 'SIRES_NOM024' && regimenNuevo === 'SIN_REGIMEN') {
      throw new ForbiddenException(
        'No se permite cambiar de SIRES_NOM024 a SIN_REGIMEN. Contacta a soporte si necesitas desactivar SIRES.',
      );
    }

    // Validar que solo se permite upgrade
    if (regimenActual !== 'SIN_REGIMEN' || regimenNuevo !== 'SIRES_NOM024') {
      throw new BadRequestException(
        `Transición no permitida: ${regimenActual} → ${regimenNuevo}. Solo se permite cambiar de SIN_REGIMEN a SIRES_NOM024.`,
      );
    }

    // Actualizar régimen regulatorio con metadatos de auditoría
    const updatedProveedor = await this.proveedoresSaludModel
      .findByIdAndUpdate(
        proveedorSaludId,
        {
          $set: {
            regimenRegulatorio: regimenNuevo,
            regimenChangedAt: new Date(),
            regimenChangedByUserId: userId,
            regimenChangeReason: dto.reason,
          },
        },
        { new: true },
      )
      .exec();

    if (!updatedProveedor) {
      throw new NotFoundException('Error al actualizar el proveedor de salud');
    }

    // Limpiar cache NOM024 después del cambio
    this.nom024Util.clearProviderCache(proveedorSaludId);

    await this.auditService.record({
      proveedorSaludId: proveedorIdStr,
      actorId: userId,
      actionType: AuditActionType.ADMIN_CONFIG_SIRES,
      resourceType: 'PROVEEDOR_SALUD',
      resourceId: proveedorIdStr,
      payload: {
        regimenAnterior: regimenActual,
        regimenNuevo: regimenNuevo,
        reason: dto.reason,
        proveedorSaludId: proveedorIdStr,
      },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });

    // Obtener la nueva política regulatoria
    const regulatoryPolicy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);

    return {
      proveedorSalud: updatedProveedor,
      regulatoryPolicy,
    };
  }

  async getPanelAdmin(ids?: string[]): Promise<PanelAdminProveedorRow[]> {
    const filter =
      ids?.length && ids.every((id) => Types.ObjectId.isValid(id))
        ? { _id: { $in: ids.map((id) => new Types.ObjectId(id)) } }
        : {};

    const proveedores = await this.proveedoresSaludModel
      .find(filter)
      .select('-reglasPuntaje')
      .lean()
      .exec();

    if (proveedores.length === 0) return [];

    const proveedorIds = proveedores.map((p) => (p as any)._id.toString());
    const proveedorObjectIds = proveedorIds.map((id) => new Types.ObjectId(id));
    const idSet = new Set(proveedorIds);

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      empresasCounts,
      principalUsers,
      historiasStats,
      notasStats,
      suscripciones,
    ] = await Promise.all([
      this.batchEmpresasCountByProveedor(proveedorObjectIds),
      this.userModel
        .find({
          idProveedorSalud: { $in: proveedorObjectIds },
          role: 'Principal',
        })
        .select('username email phone idProveedorSalud')
        .lean()
        .exec(),
      this.batchDocumentStatsByProveedor(
        'historiaclinicas',
        firstDay,
        lastDay,
        idSet,
      ),
      this.batchDocumentStatsByProveedor(
        'notamedicas',
        firstDay,
        lastDay,
        idSet,
      ),
      this.batchSuscripciones(
        proveedores
          .map((p) => (p as any).suscripcionActiva)
          .filter(Boolean) as string[],
      ),
    ]);

    const empresasMap = new Map(
      empresasCounts.map((row) => [row._id, row.count]),
    );
    const usersMap = new Map<string, PanelAdminPrincipalUser>();
    for (const user of principalUsers) {
      const pid = (user as any).idProveedorSalud?.toString();
      if (!pid) continue;
      usersMap.set(pid, {
        username: (user as any).username,
        email: (user as any).email,
        phone: (user as any).phone,
      });
    }
    const historiasMap = new Map(
      historiasStats.map((row) => [row._id, row]),
    );
    const notasMap = new Map(notasStats.map((row) => [row._id, row]));
    const subsMap = new Map(
      suscripciones.map((s) => [(s as any).subscription_id, s]),
    );

    return proveedores.map((p) => {
      const id = (p as any)._id.toString();
      const historias = historiasMap.get(id);
      const notas = notasMap.get(id);
      const suscripcionActiva = (p as any).suscripcionActiva as
        | string
        | undefined;

      return {
        _id: id,
        empresasCount: empresasMap.get(id) ?? 0,
        principalUser: usersMap.get(id) ?? null,
        historiasClinicasMes: historias?.mesCount ?? 0,
        notasMedicasMes: notas?.mesCount ?? 0,
        totalHistoriasClinicas: historias?.totalCount ?? 0,
        totalNotasMedicas: notas?.totalCount ?? 0,
        suscripcion: suscripcionActiva
          ? ((subsMap.get(suscripcionActiva) as Record<string, unknown>) ?? null)
          : null,
      };
    });
  }

  private async batchEmpresasCountByProveedor(
    proveedorObjectIds: Types.ObjectId[],
  ): Promise<{ _id: string; count: number }[]> {
    const rows = await this.empresaModel
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { idProveedorSalud: { $in: proveedorObjectIds } } },
        { $group: { _id: '$idProveedorSalud', count: { $sum: 1 } } },
      ])
      .exec();

    return rows.map((row) => ({
      _id: row._id.toString(),
      count: row.count,
    }));
  }

  private async batchDocumentStatsByProveedor(
    collectionName: string,
    firstDay: Date,
    lastDay: Date,
    proveedorIdFilter?: Set<string>,
  ): Promise<
    { _id: string; totalCount: number; mesCount: number }[]
  > {
    const collection = this.connection.collection(collectionName);
    const filterByProveedor =
      proveedorIdFilter != null && proveedorIdFilter.size > 0;

    const pipeline: Record<string, unknown>[] = [
      {
        $lookup: {
          from: 'trabajadors',
          localField: 'idTrabajador',
          foreignField: '_id',
          as: 'trabajador',
        },
      },
      { $unwind: '$trabajador' },
      {
        $lookup: {
          from: 'centrotrabajos',
          localField: 'trabajador.idCentroTrabajo',
          foreignField: '_id',
          as: 'centro',
        },
      },
      { $unwind: '$centro' },
      {
        $lookup: {
          from: 'empresas',
          localField: 'centro.idEmpresa',
          foreignField: '_id',
          as: 'empresa',
        },
      },
      { $unwind: '$empresa' },
    ];

    if (filterByProveedor) {
      pipeline.push({
        $match: {
          'empresa.idProveedorSalud': {
            $in: [...proveedorIdFilter!].map((id) => new Types.ObjectId(id)),
          },
        },
      });
    }

    pipeline.push({
      $group: {
        _id: '$empresa.idProveedorSalud',
        totalCount: { $sum: 1 },
        mesCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ['$createdAt', firstDay] },
                  { $lte: ['$createdAt', lastDay] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    });

    const rows = await collection
      .aggregate<{ _id: Types.ObjectId; totalCount: number; mesCount: number }>(
        pipeline,
      )
      .toArray();

    return rows.map((row) => ({
      _id: row._id.toString(),
      totalCount: row.totalCount,
      mesCount: row.mesCount,
    }));
  }

  private async batchSuscripciones(
    subscriptionIds: string[],
  ): Promise<Record<string, unknown>[]> {
    if (subscriptionIds.length === 0) return [];

    const uniqueIds = [...new Set(subscriptionIds)];
    const docs = await this.suscripcionModel
      .find({ subscription_id: { $in: uniqueIds } })
      .lean()
      .exec();

    return docs as Record<string, unknown>[];
  }
}
