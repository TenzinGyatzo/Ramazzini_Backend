import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Empresa } from './entities/empresa.entity';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { normalizeEmpresaData } from 'src/utils/normalization';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Trabajador } from '../trabajadores/schemas/trabajador.schema';
import { Antidoping } from '../expedientes/schemas/antidoping.schema';
import { AptitudPuesto } from '../expedientes/schemas/aptitud-puesto.schema';
import { Certificado } from '../expedientes/schemas/certificado.schema';
import { DocumentoExterno } from '../expedientes/schemas/documento-externo.schema';
import { ExamenVista } from '../expedientes/schemas/examen-vista.schema';
import { ExploracionFisica } from '../expedientes/schemas/exploracion-fisica.schema';
import { HistoriaClinica } from '../expedientes/schemas/historia-clinica.schema';
import { NotaMedica } from '../expedientes/schemas/nota-medica.schema';
import { CentrosTrabajoService } from '../centros-trabajo/centros-trabajo.service';
import { User } from '../users/schemas/user.schema';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import { DeletionCascadeService } from 'src/utils/services/deletion-cascade.service';
import { RegulatoryPolicyService } from 'src/utils/regulatory-policy.service';
import { createRegulatoryError } from 'src/utils/regulatory-error-helper';
import { RegulatoryErrorCode } from 'src/utils/regulatory-error-codes';
import { DeletionAuditReason } from 'src/utils/constants/deletion-audit.constants';

@Injectable()
export class EmpresasService {
  constructor(
    @InjectModel(Empresa.name) private empresaModel: Model<Empresa>,
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
    @Inject(forwardRef(() => CentrosTrabajoService))
    private centrosTrabajoService: CentrosTrabajoService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    private readonly deletionCascadeService: DeletionCascadeService,
    @Inject(forwardRef(() => RegulatoryPolicyService))
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
  ) {}

  async create(createEmpresaDto: CreateEmpresaDto): Promise<Empresa> {
    const normalizedDto = normalizeEmpresaData(createEmpresaDto);
    const createdEmpresa = new this.empresaModel(normalizedDto);
    return createdEmpresa.save();
  }

  async findAll(idProveedorSalud: string, userId?: string): Promise<Empresa[]> {
    if (userId) {
      const user = await this.userModel.findById(userId).exec();
      if (user && user.role === 'Principal') {
        return this.empresaModel
          .find({ idProveedorSalud: idProveedorSalud })
          .sort({ nombreComercial: 1 })
          .exec();
      } else if (user) {
        if (user.permisos?.accesoCompletoEmpresasCentros) {
          return this.empresaModel
            .find({ idProveedorSalud: idProveedorSalud })
            .sort({ nombreComercial: 1 })
            .exec();
        } else {
          return this.empresaModel
            .find({
              _id: { $in: user.empresasAsignadas || [] },
              idProveedorSalud: idProveedorSalud,
            })
            .sort({ nombreComercial: 1 })
            .exec();
        }
      }
    }

    return this.empresaModel
      .find({ idProveedorSalud: idProveedorSalud })
      .sort({ nombreComercial: 1 })
      .exec();
  }

  async findOne(id: string): Promise<Empresa> {
    return this.empresaModel.findById(id).exec();
  }

  async update(
    id: string,
    updateEmpresaDto: UpdateEmpresaDto,
    actorId?: string | null,
  ): Promise<Empresa> {
    const normalizedDto = normalizeEmpresaData(updateEmpresaDto);
    const updated = await this.empresaModel
      .findByIdAndUpdate(id, normalizedDto, { new: true })
      .exec();

    if (updated) {
      const proveedorSaludId =
        updated.idProveedorSalud?.toString?.() ??
        String(updated.idProveedorSalud ?? '');
      const changedKeys = Object.keys(normalizedDto).filter(
        (k) => normalizedDto[k] !== undefined,
      );
      await this.auditService.record({
        proveedorSaludId: proveedorSaludId || null,
        actorId: actorId ?? null,
        actionType: AuditActionType.EMPRESA_UPDATED,
        resourceType: 'empresa',
        resourceId: id,
        payload: {
          changedKeys,
          nombreComercial: updated.nombreComercial ?? null,
        },
        eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
      });
    }

    return updated;
  }

  async remove(id: string, actorId?: string | null): Promise<void> {
    const empresa = await this.empresaModel.findById(id).exec();
    if (!empresa) {
      await this.recordDeleteDenied(id, null, actorId, DeletionAuditReason.NOT_FOUND);
      throw new NotFoundException(
        `La empresa con ID ${id} no existe o ya ha sido eliminada.`,
      );
    }

    const proveedorSaludId =
      empresa.idProveedorSalud?.toString?.() ??
      String(empresa.idProveedorSalud ?? '');

    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);

    if (policy.regime === 'SIRES_NOM024') {
      const resguardedCount =
        await this.deletionCascadeService.countResguardedDocsByEmpresa(id);
      if (resguardedCount > 0) {
        await this.recordDeleteDenied(
          id,
          proveedorSaludId,
          actorId,
          DeletionAuditReason.RESGUARDED_DOCS_PRESENT,
          { resguardedDocCount: resguardedCount },
        );
        throw createRegulatoryError({
          errorCode: RegulatoryErrorCode.ORG_DELETE_BLOCKED_RESGUARDED_DOCS,
          details: { empresaId: id, resguardedDocCount: resguardedCount },
          regime: 'SIRES_NOM024',
        });
      }
    }

    const session = await this.empresaModel.db.startSession();
    let centrosCount = 0;

    try {
      await session.withTransaction(async () => {
        const centrosTrabajo = await this.centroTrabajoModel
          .find({ idEmpresa: id })
          .session(session)
          .exec();
        centrosCount = centrosTrabajo.length;

        if (centrosTrabajo.length > 0) {
          for (const centro of centrosTrabajo) {
            try {
              await this.centrosTrabajoService.remove(
                centro._id.toString(),
                actorId,
              );
            } catch (childError) {
              if (
                childError instanceof ForbiddenException ||
                childError instanceof NotFoundException ||
                childError instanceof BadRequestException
              ) {
                throw childError;
              }
              throw new Error(DeletionAuditReason.CASCADE_CHILD_FAILED);
            }
          }
        }

        const result = await this.empresaModel
          .findByIdAndDelete(id)
          .session(session);

        if (!result) {
          throw new Error(DeletionAuditReason.NOT_FOUND);
        }
      });

      session.endSession();

      await this.auditService.record({
        proveedorSaludId: proveedorSaludId || null,
        actorId: actorId ?? null,
        actionType: AuditActionType.EMPRESA_DELETED,
        resourceType: 'empresa',
        resourceId: id,
        payload: {
          nombreComercial: empresa.nombreComercial ?? null,
          centrosEliminados: centrosCount,
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

      if (proveedorSaludId) {
        const policy =
          await this.regulatoryPolicyService.getRegulatoryPolicy(
            proveedorSaludId,
          );
        if (policy.regime === 'SIRES_NOM024') {
          const resguardedCount =
            await this.deletionCascadeService.countResguardedDocsByEmpresa(id);
          if (resguardedCount > 0) {
            await this.recordDeleteDenied(
              id,
              proveedorSaludId,
              actorId,
              DeletionAuditReason.RESGUARDED_DOCS_PRESENT,
              { resguardedDocCount: resguardedCount, via: 'cascade_fallback' },
            );
            throw createRegulatoryError({
              errorCode: RegulatoryErrorCode.ORG_DELETE_BLOCKED_RESGUARDED_DOCS,
              details: { empresaId: id, resguardedDocCount: resguardedCount },
              regime: 'SIRES_NOM024',
            });
          }
        }
      }

      const reason = this.mapCascadeReason(error);
      await this.recordDeleteDenied(
        id,
        proveedorSaludId,
        actorId,
        reason,
        { message: error?.message ?? String(error) },
      );

      if (reason === DeletionAuditReason.NOT_FOUND) {
        throw new NotFoundException(
          `La empresa con ID ${id} no existe o ya ha sido eliminada.`,
        );
      }

      throw new BadRequestException(
        'No se pudo eliminar la empresa. Revise centros, trabajadores y documentos asociados e intente de nuevo.',
      );
    }
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
    if (message.includes('Centros de Trabajo') || message.includes('trabajador')) {
      return DeletionAuditReason.CASCADE_CHILD_FAILED;
    }
    return DeletionAuditReason.TRANSACTION_FAILED;
  }

  private async recordDeleteDenied(
    empresaId: string,
    proveedorSaludId: string | null,
    actorId: string | null | undefined,
    reason: string,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    await this.auditService.record({
      proveedorSaludId,
      actorId: actorId ?? null,
      actionType: AuditActionType.EMPRESA_DELETE_DENIED,
      resourceType: 'empresa',
      resourceId: empresaId,
      payload: { reason, ...extra },
      eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
    });
  }
}
