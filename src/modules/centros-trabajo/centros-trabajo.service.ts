import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CentroTrabajo } from './entities/centros-trabajo.entity';
import { CreateCentrosTrabajoDto } from './dto/create-centros-trabajo.dto';
import { UpdateCentrosTrabajoDto } from './dto/update-centros-trabajo.dto';
import { normalizeCentroTrabajoData } from 'src/utils/normalization';
import { GeographyValidator } from '../catalogs/validators/geography.validator';
import { Trabajador } from '../trabajadores/schemas/trabajador.schema';
import { Antidoping } from '../expedientes/schemas/antidoping.schema';
import { AptitudPuesto } from '../expedientes/schemas/aptitud-puesto.schema';
import { Certificado } from '../expedientes/schemas/certificado.schema';
import { DocumentoExterno } from '../expedientes/schemas/documento-externo.schema';
import { ExamenVista } from '../expedientes/schemas/examen-vista.schema';
import { ExploracionFisica } from '../expedientes/schemas/exploracion-fisica.schema';
import { HistoriaClinica } from '../expedientes/schemas/historia-clinica.schema';
import { NotaMedica } from '../expedientes/schemas/nota-medica.schema';
import { TrabajadoresService } from '../trabajadores/trabajadores.service';
import { User } from '../users/schemas/user.schema';
import { Empresa } from '../empresas/schemas/empresa.schema';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import { DeletionCascadeService } from 'src/utils/services/deletion-cascade.service';
import { RegulatoryPolicyService } from 'src/utils/regulatory-policy.service';
import { createRegulatoryError } from 'src/utils/regulatory-error-helper';
import { RegulatoryErrorCode } from 'src/utils/regulatory-error-codes';
import { DeletionAuditReason } from 'src/utils/constants/deletion-audit.constants';

@Injectable()
export class CentrosTrabajoService {
  constructor(
    @InjectModel(CentroTrabajo.name)
    private centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(Trabajador.name) private trabajadorModel: Model<Trabajador>,
    @InjectModel(Antidoping.name) private antidopingModel: Model<Antidoping>,
    @InjectModel(AptitudPuesto.name) private aptitudModel: Model<AptitudPuesto>,
    @InjectModel(Certificado.name) private certificadoModel: Model<Certificado>,
    @InjectModel(DocumentoExterno.name)
    private documentoExternoModel: Model<DocumentoExterno>,
    @InjectModel(ExamenVista.name) private examenVistaModel: Model<ExamenVista>,
    @InjectModel(ExploracionFisica.name)
    private exploracionFisicaModel: Model<ExploracionFisica>,
    @InjectModel(HistoriaClinica.name)
    private historiaClinicaModel: Model<HistoriaClinica>,
    @InjectModel(NotaMedica.name) private notaMedicaModel: Model<NotaMedica>,
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel(Empresa.name) private empresaModel: Model<Empresa>,
    @Inject(forwardRef(() => TrabajadoresService))
    private trabajadoresService: TrabajadoresService,
    private geographyValidator: GeographyValidator,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    private readonly deletionCascadeService: DeletionCascadeService,
    @Inject(forwardRef(() => RegulatoryPolicyService))
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
  ) {}

  private async validateGeographyHierarchy(
    dto: CreateCentrosTrabajoDto | UpdateCentrosTrabajoDto,
  ): Promise<void> {
    if (!dto.estado && !dto.municipio) {
      return;
    }

    const validationResult = await this.geographyValidator.validateGeography({
      entidad: dto.estado,
      municipio: dto.municipio,
    });

    if (!validationResult.valid) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        ruleId: 'A3',
        message: 'La información geográfica es inconsistente',
        details: validationResult.errors.map((e) => ({
          field: e.field === 'entidad' ? 'estado' : 'municipio',
          reason: e.reason,
        })),
      });
    }
  }

  async create(
    createCentrosTrabajoDto: CreateCentrosTrabajoDto,
  ): Promise<CentroTrabajo> {
    const normalizedDto = normalizeCentroTrabajoData(createCentrosTrabajoDto);
    await this.validateGeographyHierarchy(normalizedDto);
    const createdCentroTrabajo = new this.centroTrabajoModel(normalizedDto);
    return await createdCentroTrabajo.save();
  }

  async findCentersByCompany(id: string): Promise<CentroTrabajo[]> {
    return await this.centroTrabajoModel.find({ idEmpresa: id }).exec();
  }

  async findCentersByCompanies(empresaIds: string[]): Promise<CentroTrabajo[]> {
    if (empresaIds.length === 0) {
      return [];
    }

    return this.centroTrabajoModel
      .find({ idEmpresa: { $in: empresaIds } })
      .exec();
  }

  async findByUserAssignments(userId: string): Promise<CentroTrabajo[]> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      return [];
    }

    if (user.role === 'Principal') {
      return await this.centroTrabajoModel.find({}).exec();
    }

    if (user.permisos?.accesoCompletoEmpresasCentros) {
      return await this.centroTrabajoModel.find({}).exec();
    }

    return await this.centroTrabajoModel
      .find({
        _id: { $in: user.centrosTrabajoAsignados || [] },
      })
      .exec();
  }

  async findOne(id: string): Promise<CentroTrabajo> {
    return this.centroTrabajoModel.findById(id).exec();
  }

  async countCentrosByEmpresa(empresaId: string): Promise<number> {
    return this.centroTrabajoModel
      .countDocuments({ idEmpresa: empresaId })
      .exec();
  }

  async countTrabajadoresByCentro(centroId: string): Promise<number> {
    return this.trabajadorModel
      .countDocuments({ idCentroTrabajo: centroId })
      .exec();
  }

  async update(
    id: string,
    updateCentrosTrabajoDto: UpdateCentrosTrabajoDto,
    actorId?: string | null,
  ): Promise<CentroTrabajo> {
    const normalizedDto = normalizeCentroTrabajoData(updateCentrosTrabajoDto);

    const centroActual = await this.centroTrabajoModel.findById(id).exec();
    if (!centroActual) {
      throw new BadRequestException('Centro de trabajo no encontrado');
    }

    const mergedDto = {
      ...centroActual.toObject(),
      ...normalizedDto,
    } as CreateCentrosTrabajoDto;

    await this.validateGeographyHierarchy(mergedDto);

    const updated = await this.centroTrabajoModel
      .findByIdAndUpdate(id, normalizedDto, { new: true })
      .exec();

    if (updated) {
      const empresaId =
        updated.idEmpresa?.toString?.() ?? String(updated.idEmpresa ?? '');
      const proveedorSaludId = await this.resolveProveedorSaludId(empresaId);
      const changedKeys = Object.keys(normalizedDto).filter(
        (k) => normalizedDto[k] !== undefined,
      );
      await this.auditService.record({
        proveedorSaludId,
        actorId: actorId ?? null,
        actionType: AuditActionType.CENTRO_UPDATED,
        resourceType: 'centroTrabajo',
        resourceId: id,
        payload: {
          empresaId,
          changedKeys,
          nombreCentro: updated.nombreCentro ?? null,
        },
        eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
      });
    }

    return updated;
  }

  async remove(id: string, actorId?: string | null): Promise<void> {
    const centro = await this.centroTrabajoModel.findById(id).exec();
    if (!centro) {
      await this.recordDeleteDenied(
        id,
        null,
        null,
        actorId,
        DeletionAuditReason.NOT_FOUND,
      );
      throw new NotFoundException(
        `El centro de trabajo con ID ${id} no existe o ya ha sido eliminado.`,
      );
    }

    const empresaId =
      centro.idEmpresa?.toString?.() ?? String(centro.idEmpresa ?? '');
    const proveedorSaludId = await this.resolveProveedorSaludId(empresaId);

    if (proveedorSaludId) {
      const policy =
        await this.regulatoryPolicyService.getRegulatoryPolicy(
          proveedorSaludId,
        );
      if (policy.regime === 'SIRES_NOM024') {
        const resguardedCount =
          await this.deletionCascadeService.countResguardedDocsByCentro(id);
        if (resguardedCount > 0) {
          await this.recordDeleteDenied(
            id,
            empresaId,
            proveedorSaludId,
            actorId,
            DeletionAuditReason.RESGUARDED_DOCS_PRESENT,
            { resguardedDocCount: resguardedCount },
          );
          throw createRegulatoryError({
            errorCode: RegulatoryErrorCode.ORG_DELETE_BLOCKED_RESGUARDED_DOCS,
            details: {
              centroId: id,
              empresaId,
              resguardedDocCount: resguardedCount,
            },
            regime: 'SIRES_NOM024',
          });
        }
      }
    }

    const session = await this.centroTrabajoModel.db.startSession();
    let trabajadoresCount = 0;

    try {
      await session.withTransaction(async () => {
        const trabajadores = await this.trabajadorModel
          .find({ idCentroTrabajo: id })
          .session(session)
          .exec();
        trabajadoresCount = trabajadores.length;

        if (trabajadores.length > 0) {
          const resultadosEliminacion = await Promise.all(
            trabajadores.map((trabajador) =>
              this.trabajadoresService.remove(trabajador._id.toString()),
            ),
          );

          if (resultadosEliminacion.includes(false)) {
            throw new Error(DeletionAuditReason.CASCADE_CHILD_FAILED);
          }
        }

        const result = await this.centroTrabajoModel
          .findByIdAndDelete(id)
          .session(session);

        if (!result) {
          throw new Error(DeletionAuditReason.NOT_FOUND);
        }
      });

      session.endSession();

      await this.auditService.record({
        proveedorSaludId,
        actorId: actorId ?? null,
        actionType: AuditActionType.CENTRO_DELETED,
        resourceType: 'centroTrabajo',
        resourceId: id,
        payload: {
          empresaId,
          nombreCentro: centro.nombreCentro ?? null,
          trabajadoresEliminados: trabajadoresCount,
        },
        eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
      });
    } catch (error) {
      session.endSession();

      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Si el pre-check falló en detectar docs resguardados, revalidar y tratar como gate SIRES
      if (proveedorSaludId) {
        const policy =
          await this.regulatoryPolicyService.getRegulatoryPolicy(
            proveedorSaludId,
          );
        if (policy.regime === 'SIRES_NOM024') {
          const resguardedCount =
            await this.deletionCascadeService.countResguardedDocsByCentro(id);
          if (resguardedCount > 0) {
            await this.recordDeleteDenied(
              id,
              empresaId,
              proveedorSaludId,
              actorId,
              DeletionAuditReason.RESGUARDED_DOCS_PRESENT,
              { resguardedDocCount: resguardedCount, via: 'cascade_fallback' },
            );
            throw createRegulatoryError({
              errorCode: RegulatoryErrorCode.ORG_DELETE_BLOCKED_RESGUARDED_DOCS,
              details: {
                centroId: id,
                empresaId,
                resguardedDocCount: resguardedCount,
              },
              regime: 'SIRES_NOM024',
            });
          }
        }
      }

      const reason = this.mapCascadeReason(error);
      await this.recordDeleteDenied(
        id,
        empresaId,
        proveedorSaludId,
        actorId,
        reason,
        { message: error?.message ?? String(error) },
      );

      if (reason === DeletionAuditReason.NOT_FOUND) {
        throw new NotFoundException(
          `El centro de trabajo con ID ${id} no existe o ya ha sido eliminado.`,
        );
      }

      throw new BadRequestException(
        'No se pudo eliminar el centro de trabajo. Revise trabajadores y documentos asociados e intente de nuevo.',
      );
    }
  }

  private async resolveProveedorSaludId(
    empresaId: string,
  ): Promise<string | null> {
    if (!empresaId) {
      return null;
    }
    const empresa = await this.empresaModel
      .findById(empresaId)
      .select('idProveedorSalud')
      .lean()
      .exec();
    if (!empresa?.idProveedorSalud) {
      return null;
    }
    return String(empresa.idProveedorSalud);
  }

  private mapCascadeReason(error: unknown): string {
    const message =
      error instanceof Error ? error.message : String(error ?? '');
    if (message.includes('archivo') || message.includes('FILE_CLEANUP')) {
      return DeletionAuditReason.FILE_CLEANUP_FAILED;
    }
    if (message === DeletionAuditReason.CASCADE_CHILD_FAILED) {
      return DeletionAuditReason.CASCADE_CHILD_FAILED;
    }
    if (message === DeletionAuditReason.NOT_FOUND) {
      return DeletionAuditReason.NOT_FOUND;
    }
    if (message.includes('trabajador') || message.includes('archivos')) {
      return message.includes('archivo')
        ? DeletionAuditReason.FILE_CLEANUP_FAILED
        : DeletionAuditReason.CASCADE_CHILD_FAILED;
    }
    return DeletionAuditReason.TRANSACTION_FAILED;
  }

  private async recordDeleteDenied(
    centroId: string,
    empresaId: string | null,
    proveedorSaludId: string | null,
    actorId: string | null | undefined,
    reason: string,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    await this.auditService.record({
      proveedorSaludId,
      actorId: actorId ?? null,
      actionType: AuditActionType.CENTRO_DELETE_DENIED,
      resourceType: 'centroTrabajo',
      resourceId: centroId,
      payload: { reason, empresaId, ...extra },
      eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
    });
  }
}
