import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import {
  ExpedienteColaboracion,
} from './schemas/expediente-colaboracion.schema';
import { ExpedienteColaboracionEstado } from './enums/expediente-colaboracion-estado.enum';
import { CrearColaboracionDesdeClonParams } from './interfaces/crear-colaboracion-desde-clon.interface';
import { CentroTrabajo } from 'src/modules/centros-trabajo/schemas/centro-trabajo.schema';
import { Trabajador } from 'src/modules/trabajadores/schemas/trabajador.schema';
import { Empresa } from 'src/modules/empresas/schemas/empresa.schema';
import { WORKER_LINKED_COLLECTIONS } from 'src/modules/trabajadores/constants/worker-linked-collections.constant';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';

@Injectable()
export class ExpedienteColaboracionService {
  constructor(
    @InjectModel(ExpedienteColaboracion.name)
    private readonly colaboracionModel: Model<ExpedienteColaboracion>,
    @InjectModel(CentroTrabajo.name)
    private readonly centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(Trabajador.name)
    private readonly trabajadorModel: Model<Trabajador>,
    @InjectModel(Empresa.name)
    private readonly empresaModel: Model<Empresa>,
    @InjectConnection()
    private readonly connection: Connection,
    @Optional()
    @Inject(forwardRef(() => AuditService))
    private readonly auditService?: AuditService,
  ) {}

  async crearDesdeClon(
    params: CrearColaboracionDesdeClonParams,
  ): Promise<ExpedienteColaboracion> {
    const existing = await this.colaboracionModel
      .findOne({
        centroDestinoId: params.centroDestinoId,
        estado: ExpedienteColaboracionEstado.ACTIVA,
      })
      .exec();

    if (existing) {
      throw new BadRequestException(
        'Ya existe una colaboración activa para el centro destino',
      );
    }

    const colaboracion = await this.colaboracionModel.create({
      proveedorOrigenId: new Types.ObjectId(params.proveedorOrigenId),
      proveedorDestinoId: new Types.ObjectId(params.proveedorDestinoId),
      centroOrigenId: new Types.ObjectId(params.centroOrigenId),
      centroDestinoId: new Types.ObjectId(params.centroDestinoId),
      empresaOrigenId: new Types.ObjectId(params.empresaOrigenId),
      empresaDestinoId: new Types.ObjectId(params.empresaDestinoId),
      estado: ExpedienteColaboracionEstado.ACTIVA,
      autorizadoPor: params.autorizadoPor
        ? new Types.ObjectId(params.autorizadoPor)
        : undefined,
      creadoPor: params.creadoPor
        ? new Types.ObjectId(params.creadoPor)
        : undefined,
      cloneRunId: params.cloneRunId,
      trabajadorMap: params.trabajadorMap.map((entry) => ({
        origenId: new Types.ObjectId(entry.origenId),
        destinoId: new Types.ObjectId(entry.destinoId),
      })),
    });

    await this.centroTrabajoModel.updateOne(
      { _id: params.centroDestinoId },
      {
        $set: {
          idCentroOrigen: new Types.ObjectId(params.centroOrigenId),
          idExpedienteColaboracion: colaboracion._id,
        },
      },
    );

    await Promise.all(
      params.trabajadorMap.map((entry) =>
        this.trabajadorModel.updateOne(
          { _id: entry.destinoId },
          {
            $set: {
              idTrabajadorOrigen: new Types.ObjectId(entry.origenId),
              idProveedorSaludOrigen: new Types.ObjectId(
                params.proveedorOrigenId,
              ),
            },
          },
        ),
      ),
    );

    await this.recordColaboracionCreated(colaboracion, params);

    return colaboracion;
  }

  async findActivaByCentroDestino(
    centroDestinoId: string,
  ): Promise<ExpedienteColaboracion | null> {
    return this.colaboracionModel
      .findOne({
        centroDestinoId,
        estado: ExpedienteColaboracionEstado.ACTIVA,
      })
      .exec();
  }

  async findActivaByTrabajadorDestino(
    trabajadorDestinoId: string,
  ): Promise<ExpedienteColaboracion | null> {
    const trabajador = await this.trabajadorModel
      .findById(trabajadorDestinoId)
      .select('idCentroTrabajo')
      .lean()
      .exec();
    if (!trabajador?.idCentroTrabajo) {
      return null;
    }
    return this.findActivaByCentroDestino(String(trabajador.idCentroTrabajo));
  }

  async resolveTrabajadorDestinoPorOrigen(
    trabajadorOrigenId: string,
    proveedorDestinoId: string,
  ): Promise<{ trabajadorDestinoId: string; colaboracionId: string } | null> {
    const trabajador = await this.trabajadorModel
      .findOne({ idTrabajadorOrigen: trabajadorOrigenId })
      .select('_id idCentroTrabajo idProveedorSaludOrigen')
      .lean()
      .exec();

    if (!trabajador) {
      return null;
    }

    const colaboracion = await this.findActivaByTrabajadorDestino(
      String(trabajador._id),
    );
    if (!colaboracion) {
      return null;
    }

    if (
      String(colaboracion.proveedorDestinoId) !== String(proveedorDestinoId)
    ) {
      return null;
    }

    const inMap = colaboracion.trabajadorMap?.some(
      (entry) =>
        String(entry.origenId) === String(trabajadorOrigenId) &&
        String(entry.destinoId) === String(trabajador._id),
    );
    if (!inMap) {
      return null;
    }

    return {
      trabajadorDestinoId: String(trabajador._id),
      colaboracionId: String(colaboracion._id),
    };
  }

  async resolveProveedorBranding(
    trabajadorDestinoId: string,
  ): Promise<string | null> {
    const trabajador = await this.trabajadorModel
      .findById(trabajadorDestinoId)
      .select('idProveedorSaludOrigen idCentroTrabajo')
      .lean()
      .exec();

    if (!trabajador?.idProveedorSaludOrigen) {
      return null;
    }

    const colaboracion = await this.findActivaByTrabajadorDestino(
      trabajadorDestinoId,
    );
    if (!colaboracion) {
      return null;
    }

    return String(trabajador.idProveedorSaludOrigen);
  }

  async revocar(colaboracionId: string, actorId?: string): Promise<void> {
    const colaboracion = await this.colaboracionModel
      .findById(colaboracionId)
      .exec();
    if (!colaboracion) {
      throw new NotFoundException('Colaboración no encontrada');
    }

    colaboracion.estado = ExpedienteColaboracionEstado.REVOCADA;
    await colaboracion.save();

    if (this.auditService) {
      const payload = {
        colaboracionId: String(colaboracion._id),
        centroOrigenId: String(colaboracion.centroOrigenId),
        centroDestinoId: String(colaboracion.centroDestinoId),
      };
      await this.auditService.record({
        proveedorSaludId: String(colaboracion.proveedorOrigenId),
        actorId: actorId ?? null,
        actionType: AuditActionType.EXPEDIENTE_COLABORACION_REVOKED,
        resourceType: 'ExpedienteColaboracion',
        resourceId: String(colaboracion._id),
        payload,
        eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
      });
      await this.auditService.record({
        proveedorSaludId: String(colaboracion.proveedorDestinoId),
        actorId: actorId ?? null,
        actionType: AuditActionType.EXPEDIENTE_COLABORACION_REVOKED,
        resourceType: 'ExpedienteColaboracion',
        resourceId: String(colaboracion._id),
        payload,
        eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
      });
    }
  }

  async hasDocumentAtPathForTrabajador(
    trabajadorDestinoId: string,
    relativePath: string,
  ): Promise<boolean> {
    const normalizedPath = this.normalizeClinicalRelativePath(relativePath);
    const trabajadorOid = new Types.ObjectId(trabajadorDestinoId);

    for (const cfg of WORKER_LINKED_COLLECTIONS) {
      if (!cfg.fileField) {
        continue;
      }

      const collection = this.connection.collection(cfg.collectionName);
      const docs = await collection
        .find({ [cfg.fkField]: trabajadorOid })
        .project({ [cfg.fileField]: 1 })
        .toArray();

      for (const doc of docs) {
        const routeValue = doc[cfg.fileField];
        if (typeof routeValue !== 'string' || !routeValue) {
          continue;
        }
        const normalizedRoute = this.normalizeClinicalRelativePath(routeValue);
        if (
          normalizedPath === normalizedRoute ||
          normalizedPath.startsWith(`${normalizedRoute}/`)
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private normalizeClinicalRelativePath(relativePath: string): string {
    return relativePath
      .replace(/^\/+/, '')
      .replace(/^expedientes-medicos\/?/, '')
      .replace(/\\/g, '/');
  }

  private async recordColaboracionCreated(
    colaboracion: ExpedienteColaboracion,
    params: CrearColaboracionDesdeClonParams,
  ): Promise<void> {
    if (!this.auditService) {
      return;
    }

    const payload = {
      colaboracionId: String(colaboracion._id),
      centroOrigenId: params.centroOrigenId,
      centroDestinoId: params.centroDestinoId,
      trabajadores: params.trabajadorMap.length,
      cloneRunId: params.cloneRunId ?? null,
    };

    await this.auditService.record({
      proveedorSaludId: params.proveedorOrigenId,
      actorId: params.creadoPor ?? params.autorizadoPor ?? null,
      actionType: AuditActionType.EXPEDIENTE_COLABORACION_CREATED,
      resourceType: 'ExpedienteColaboracion',
      resourceId: String(colaboracion._id),
      payload,
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });

    await this.auditService.record({
      proveedorSaludId: params.proveedorDestinoId,
      actorId: params.creadoPor ?? params.autorizadoPor ?? null,
      actionType: AuditActionType.EXPEDIENTE_COLABORACION_CREATED,
      resourceType: 'ExpedienteColaboracion',
      resourceId: String(colaboracion._id),
      payload,
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });
  }
}
