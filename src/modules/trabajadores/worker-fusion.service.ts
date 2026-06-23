/**
 * Worker Fusion Service — NOM-024-SSA3-2012 / DGIS manual fusion.
 *
 * Detects duplicate workers (folio or real CURP within same company), signals alerts,
 * and performs manual physical consolidation of clinical records.
 */

import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, ClientSession, Model, Types, Schema } from 'mongoose';
import { Trabajador } from './schemas/trabajador.schema';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { CreateTrabajadorDto } from './dto/create-trabajador.dto';
import { isGenericCURP } from 'src/utils/curp-validator.util';
import {
  DuplicateMatch,
  DuplicateMatchCriterio,
  DuplicateWorkerSummary,
  FusionResultadoClinicoSummary,
  FusionRiesgoTrabajoSummary,
} from './interfaces/duplicate-match.interface';
import {
  WorkerDuplicateAlert,
  WorkerDuplicateAlertCriterio,
} from './schemas/worker-duplicate-alert.schema';
import { WorkerFusionHistory } from './schemas/worker-fusion-history.schema';
import { WORKER_LINKED_COLLECTIONS, EXPEDIENTE_DOCUMENT_MODEL_NAMES } from './constants/worker-linked-collections.constant';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import { ConsentimientoDiario } from '../consentimiento-diario/schemas/consentimiento-diario.schema';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EXPEDIENTES_DIR } from 'src/utils/expedientes-dir';

export const CURP_GENERICA = 'XXXX999999XXXXXX99';

export interface FusionPreviewResult {
  destino: DuplicateWorkerSummary;
  fuente: DuplicateWorkerSummary;
  conteosDestino: Record<string, number>;
  conteosFuente: Record<string, number>;
  /** Documentos visibles en el expediente médico (misma definición que la UI del expediente). */
  documentosExpedienteDestino: number;
  documentosExpedienteFuente: number;
  /** Registros vinculados fuera del expediente (consentimientos, RT, resultados, etc.). */
  registrosVinculadosDestino: number;
  registrosVinculadosFuente: number;
  detalleVinculadosDestino: Record<string, number>;
  detalleVinculadosFuente: Record<string, number>;
  resultadosClinicosDestino: FusionResultadoClinicoSummary[];
  resultadosClinicosFuente: FusionResultadoClinicoSummary[];
  riesgosTrabajoDestino: FusionRiesgoTrabajoSummary[];
  riesgosTrabajoFuente: FusionRiesgoTrabajoSummary[];
  totalDocumentosFuente: number;
  conflictos: {
    numeroEmpleado: boolean;
    consentimientoMismoDia: number;
  };
  criterioMatch: DuplicateMatchCriterio | null;
  destinoRecomendadoId: string;
}

export interface FusionResult {
  destinoId: string;
  fuenteId: string;
  documentosMigradosPorColeccion: Record<string, number>;
  archivosMigrados: number;
}

@Injectable()
export class WorkerFusionService {
  constructor(
    @InjectModel(Trabajador.name) private trabajadorModel: Model<Trabajador>,
    @InjectModel(CentroTrabajo.name)
    private centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(WorkerDuplicateAlert.name)
    private duplicateAlertModel: Model<WorkerDuplicateAlert>,
    @InjectModel(WorkerFusionHistory.name)
    private fusionHistoryModel: Model<WorkerFusionHistory>,
    @InjectModel(ConsentimientoDiario.name)
    private consentimientoModel: Model<ConsentimientoDiario>,
    @InjectConnection() private connection: Connection,
    @Inject(forwardRef(() => AuditService))
    private auditService: AuditService,
  ) {}

  async findDuplicateInEmpresa(
    trabajadorDto: CreateTrabajadorDto & { folio?: string; _id?: string },
    idCentroTrabajo: string,
    excludeTrabajadorId?: string,
  ): Promise<DuplicateMatch | null> {
    const idEmpresa = await this.getIdEmpresaFromCentro(idCentroTrabajo);
    if (!idEmpresa) return null;

    const centroIds = await this.getCentroIdsByEmpresa(idEmpresa);
    if (centroIds.length === 0) return null;

    const baseFilter: Record<string, unknown> = {
      idCentroTrabajo: { $in: centroIds },
    };
    if (excludeTrabajadorId) {
      baseFilter._id = { $ne: new Types.ObjectId(excludeTrabajadorId) };
    }

    const folio = trabajadorDto.folio?.trim();
    if (folio) {
      const byFolio = await this.trabajadorModel
        .findOne({ ...baseFilter, folio })
        .sort({ createdAt: 1 })
        .lean()
        .exec();
      if (byFolio) return this.buildDuplicateMatch(byFolio, 'FOLIO');
    }

    const curp = trabajadorDto.curp?.trim().toUpperCase();
    if (curp && !isGenericCURP(curp)) {
      const byCurp = await this.trabajadorModel
        .findOne({ ...baseFilter, curp })
        .sort({ createdAt: 1 })
        .lean()
        .exec();
      if (byCurp) return this.buildDuplicateMatch(byCurp, 'CURP');
    }

    return null;
  }

  async findAllDuplicatesInEmpresa(
    trabajadorId: string,
  ): Promise<DuplicateMatch[]> {
    const worker = await this.trabajadorModel.findById(trabajadorId).lean().exec();
    if (!worker) return [];

    const idCentro = (worker as any).idCentroTrabajo?.toString();
    if (!idCentro) return [];

    const match = await this.findDuplicateInEmpresa(
      worker as any,
      idCentro,
      trabajadorId,
    );
    if (!match) return [];

    const reverse = await this.findDuplicateInEmpresa(
      { ...(worker as any), _id: trabajadorId },
      idCentro,
      match.trabajadorId,
    );

    const matches = [match];
    if (reverse && reverse.trabajadorId === trabajadorId) {
      matches.push(reverse);
    }
    return matches;
  }

  async getCanonicalTrabajadorId(trabajadorId: string): Promise<string> {
    if (!trabajadorId) return trabajadorId;

    const worker = await this.trabajadorModel
      .findById(trabajadorId)
      .select('idTrabajadorCanonico')
      .lean()
      .exec();

    if (!worker) return trabajadorId;

    const canonicalId = (worker as any).idTrabajadorCanonico?.toString();
    return canonicalId || trabajadorId;
  }

  /** Resuelve IDs canónicos en una sola consulta (evita N round-trips en listados). */
  async resolveCanonicalIdMap(workerIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (workerIds.length === 0) return map;

    for (const id of workerIds) {
      map.set(id, id);
    }

    const objectIds = workerIds.map((id) => new Types.ObjectId(id));
    const workers = await this.trabajadorModel
      .find({ _id: { $in: objectIds } })
      .select('_id idTrabajadorCanonico')
      .lean()
      .exec();

    for (const worker of workers) {
      const wid = (worker as any)._id.toString();
      const canonical = (worker as any).idTrabajadorCanonico?.toString();
      map.set(wid, canonical || wid);
    }

    return map;
  }

  async resolveTrabajadorIdsForQuery(trabajadorIds: string[]): Promise<string[]> {
    const map = await this.resolveCanonicalIdMap(trabajadorIds);
    return [...new Set(Array.from(map.values()))];
  }

  async createDuplicateAlert(
    trabajadorId: string,
    candidatoId: string,
    criterio: WorkerDuplicateAlertCriterio,
    idEmpresa: string,
    createdBy: string,
  ): Promise<WorkerDuplicateAlert | null> {
    if (trabajadorId === candidatoId) return null;

    const insertFields: Record<string, unknown> = {
      trabajadorId: new Types.ObjectId(trabajadorId),
      candidatoId: new Types.ObjectId(candidatoId),
      criterio,
      idEmpresa: new Types.ObjectId(idEmpresa),
      estado: 'PENDIENTE',
    };
    if (createdBy && createdBy !== 'system' && Types.ObjectId.isValid(createdBy)) {
      insertFields.createdBy = new Types.ObjectId(createdBy);
    }

    try {
      const alert = await this.duplicateAlertModel.findOneAndUpdate(
        {
          trabajadorId: new Types.ObjectId(trabajadorId),
          candidatoId: new Types.ObjectId(candidatoId),
          estado: 'PENDIENTE',
        },
        { $setOnInsert: insertFields },
        { upsert: true, new: true },
      );
      return alert;
    } catch {
      return await this.duplicateAlertModel
        .findOne({
          trabajadorId: new Types.ObjectId(trabajadorId),
          candidatoId: new Types.ObjectId(candidatoId),
          estado: 'PENDIENTE',
        })
        .exec();
    }
  }

  /**
   * Escaneo retroactivo por folio o CURP real (solo script/admin; no invocar en listados).
   */
  async scanRetroactiveDuplicatesForEmpresa(
    idEmpresa: string,
    createdBy: string,
  ): Promise<number> {
    const centroIds = await this.getCentroIdsByEmpresa(idEmpresa);
    if (centroIds.length === 0) return 0;

    const centroObjectIds = centroIds.map((id) => new Types.ObjectId(id));
    const matchCentros = { idCentroTrabajo: { $in: centroObjectIds } };

    const [folioGroups, curpGroups] = await Promise.all([
      this.trabajadorModel
        .aggregate<{ _id: string; workerIds: Types.ObjectId[] }>([
          {
            $match: {
              ...matchCentros,
              folio: { $exists: true, $nin: [null, ''] },
            },
          },
          {
            $group: {
              _id: '$folio',
              workerIds: { $push: '$_id' },
              count: { $sum: 1 },
            },
          },
          { $match: { count: { $gt: 1 } } },
        ])
        .exec(),
      this.trabajadorModel
        .aggregate<{ _id: string; workerIds: Types.ObjectId[] }>([
          {
            $match: {
              ...matchCentros,
              curp: {
                $exists: true,
                $nin: [null, '', CURP_GENERICA],
              },
            },
          },
          {
            $group: {
              _id: { $toUpper: '$curp' },
              workerIds: { $push: '$_id' },
              count: { $sum: 1 },
            },
          },
          { $match: { count: { $gt: 1 } } },
        ])
        .exec(),
    ]);

    let created = 0;
    created += await this.createAlertsForDuplicateGroups(
      folioGroups,
      'FOLIO',
      idEmpresa,
      createdBy,
    );
    created += await this.createAlertsForDuplicateGroups(
      curpGroups,
      'CURP',
      idEmpresa,
      createdBy,
    );
    return created;
  }

  private async createAlertsForDuplicateGroups(
    groups: { _id: string; workerIds: Types.ObjectId[] }[],
    criterio: WorkerDuplicateAlertCriterio,
    idEmpresa: string,
    createdBy: string,
  ): Promise<number> {
    let created = 0;
    for (const group of groups) {
      const workers = await this.trabajadorModel
        .find({ _id: { $in: group.workerIds } })
        .sort({ createdAt: 1 })
        .select('_id')
        .lean()
        .exec();

      if (workers.length < 2) continue;
      const candidatoId = (workers[0] as any)._id.toString();

      for (let i = 1; i < workers.length; i++) {
        const trabajadorId = (workers[i] as any)._id.toString();
        const alert = await this.createDuplicateAlert(
          trabajadorId,
          candidatoId,
          criterio,
          idEmpresa,
          createdBy,
        );
        if (alert) created++;
      }
    }
    return created;
  }

  async getPendingAlertsForCentro(centroId: string): Promise<any[]> {
    const idEmpresa = await this.getIdEmpresaFromCentro(centroId);
    if (!idEmpresa) return [];

    const centroIds = await this.getCentroIdsByEmpresa(idEmpresa);
    const workerIds = await this.trabajadorModel
      .find({ idCentroTrabajo: centroId })
      .distinct('_id')
      .exec();

    const alerts = await this.duplicateAlertModel
      .find({
        idEmpresa: new Types.ObjectId(idEmpresa),
        estado: 'PENDIENTE',
        $or: [
          { trabajadorId: { $in: workerIds } },
          { candidatoId: { $in: workerIds } },
        ],
      })
      .populate('trabajadorId', 'nombre primerApellido segundoApellido curp folio numeroEmpleado idCentroTrabajo createdAt')
      .populate('candidatoId', 'nombre primerApellido segundoApellido curp folio numeroEmpleado idCentroTrabajo createdAt')
      .lean()
      .exec();

    return alerts;
  }

  async getPendingAlertCountsByWorkerIds(
    workerIds: string[],
  ): Promise<Map<string, number>> {
    if (workerIds.length === 0) return new Map();

    const objectIds = workerIds.map((id) => new Types.ObjectId(id));
    const alerts = await this.duplicateAlertModel
      .find({
        estado: 'PENDIENTE',
        $or: [
          { trabajadorId: { $in: objectIds } },
          { candidatoId: { $in: objectIds } },
        ],
      })
      .select('trabajadorId candidatoId')
      .lean()
      .exec();

    const counts = new Map<string, number>();
    for (const alert of alerts) {
      const tId = (alert as any).trabajadorId?.toString();
      const cId = (alert as any).candidatoId?.toString();
      if (tId && workerIds.includes(tId)) {
        counts.set(tId, (counts.get(tId) ?? 0) + 1);
      }
      if (cId && workerIds.includes(cId)) {
        counts.set(cId, (counts.get(cId) ?? 0) + 1);
      }
    }
    return counts;
  }

  async descartarAlerta(alertId: string, userId: string): Promise<WorkerDuplicateAlert> {
    const alert = await this.duplicateAlertModel.findById(alertId).exec();
    if (!alert) throw new NotFoundException('Alerta de duplicado no encontrada');
    if (alert.estado !== 'PENDIENTE') {
      throw new BadRequestException('La alerta ya fue procesada');
    }
    alert.estado = 'DESCARTADO';
    alert.descartadoBy = new Types.ObjectId(userId) as any;
    return alert.save();
  }

  /**
   * Elimina las alertas de duplicado que referencian a un trabajador (como
   * trabajador o como candidato). Se invoca al eliminar físicamente un
   * trabajador para que el registro que permanece no quede marcado como
   * duplicado de uno que ya no existe.
   */
  async removeAlertsReferencingWorker(
    workerId: string,
    session?: ClientSession,
  ): Promise<void> {
    if (!workerId || !Types.ObjectId.isValid(workerId)) return;
    const workerObjectId = new Types.ObjectId(workerId);
    const query = this.duplicateAlertModel.deleteMany({
      $or: [{ trabajadorId: workerObjectId }, { candidatoId: workerObjectId }],
    });
    if (session) query.session(session);
    await query.exec();
  }

  async getFusionRedirect(fuenteId: string): Promise<string | null> {
    const history = await this.fusionHistoryModel
      .findOne({ fuenteId: new Types.ObjectId(fuenteId) })
      .lean()
      .exec();
    return history ? (history as any).destinoId?.toString() ?? null : null;
  }

  async getFusionPreview(
    destinoId: string,
    fuenteId: string,
  ): Promise<FusionPreviewResult> {
    if (destinoId === fuenteId) {
      throw new BadRequestException('Destino y fuente deben ser distintos');
    }

    const [destino, fuente] = await Promise.all([
      this.trabajadorModel.findById(destinoId).lean().exec(),
      this.trabajadorModel.findById(fuenteId).lean().exec(),
    ]);

    if (!destino || !fuente) {
      throw new NotFoundException('Trabajador destino o fuente no encontrado');
    }

    const centroIds = [
      ...new Set(
        [
          (destino as any).idCentroTrabajo?.toString(),
          (fuente as any).idCentroTrabajo?.toString(),
        ].filter(Boolean),
      ),
    ];
    const centroInfoMap = await this.resolveCentrosForFusionPair(centroIds);
    const centroNombreMap = new Map<string, string>(
      [...centroInfoMap.entries()].map(([id, info]) => [id, info.nombreCentro]),
    );

    const [
      { destino: conteosDestinoBase, fuente: conteosFuenteBase },
      consentimientoMismoDia,
      resultadosClinicosDestino,
      resultadosClinicosFuente,
      riesgosTrabajoDestino,
      riesgosTrabajoFuente,
    ] = await Promise.all([
      this.countDocumentsByWorkerPair(destinoId, fuenteId),
      this.countConsentimientoCollisions(destinoId, fuenteId),
      this.fetchResultadosClinicosSummary(destinoId),
      this.fetchResultadosClinicosSummary(fuenteId),
      this.fetchRiesgosTrabajoSummary(destinoId),
      this.fetchRiesgosTrabajoSummary(fuenteId),
    ]);

    const conteosDestino = { ...conteosDestinoBase };
    const conteosFuente = { ...conteosFuenteBase };
    if (resultadosClinicosDestino.length) {
      conteosDestino.ResultadoClinico = resultadosClinicosDestino.length;
    }
    if (resultadosClinicosFuente.length) {
      conteosFuente.ResultadoClinico = resultadosClinicosFuente.length;
    }
    if (riesgosTrabajoDestino.length) {
      conteosDestino.RiesgoTrabajo = riesgosTrabajoDestino.length;
    }
    if (riesgosTrabajoFuente.length) {
      conteosFuente.RiesgoTrabajo = riesgosTrabajoFuente.length;
    }

    const totalDocumentosFuente = Object.values(conteosFuente).reduce((a, b) => a + b, 0);

    const numDestino = (destino as any).numeroEmpleado?.trim();
    const numFuente = (fuente as any).numeroEmpleado?.trim();
    const numeroEmpleadoConflict =
      !!numDestino && !!numFuente && numDestino !== numFuente;

    const criterioMatch = this.detectMatchCriterio(destino as any, fuente as any);

    const destinoDocs = Object.values(conteosDestino).reduce((a, b) => a + b, 0);
    const fuenteDocs = totalDocumentosFuente;
    const destinoDate = new Date((destino as any).createdAt ?? 0).getTime();
    const fuenteDate = new Date((fuente as any).createdAt ?? 0).getTime();

    let destinoRecomendadoId = destinoId;
    if (fuenteDocs > destinoDocs) {
      destinoRecomendadoId = fuenteId;
    } else if (fuenteDocs === destinoDocs && fuenteDate < destinoDate) {
      destinoRecomendadoId = fuenteId;
    }

    const splitDestino = this.splitExpedienteAndVinculados(conteosDestino);
    const splitFuente = this.splitExpedienteAndVinculados(conteosFuente);

    return {
      destino: this.toWorkerSummary(
        destino,
        centroNombreMap.get((destino as any).idCentroTrabajo?.toString()),
      ),
      fuente: this.toWorkerSummary(
        fuente,
        centroNombreMap.get((fuente as any).idCentroTrabajo?.toString()),
      ),
      conteosDestino,
      conteosFuente,
      documentosExpedienteDestino: splitDestino.expediente,
      documentosExpedienteFuente: splitFuente.expediente,
      registrosVinculadosDestino: splitDestino.vinculados,
      registrosVinculadosFuente: splitFuente.vinculados,
      detalleVinculadosDestino: splitDestino.detalleVinculados,
      detalleVinculadosFuente: splitFuente.detalleVinculados,
      resultadosClinicosDestino,
      resultadosClinicosFuente,
      riesgosTrabajoDestino,
      riesgosTrabajoFuente,
      totalDocumentosFuente,
      conflictos: {
        numeroEmpleado: numeroEmpleadoConflict,
        consentimientoMismoDia,
      },
      criterioMatch,
      destinoRecomendadoId,
    };
  }

  async fusionarTrabajadores(params: {
    trabajadorDestinoId: string;
    trabajadorFuenteId: string;
    userId: string;
    idEmpresa: string;
    proveedorSaludId: string;
    numeroEmpleadoResuelto?: string;
    migrarArchivos?: boolean;
    confirmacion: boolean;
    /** Solo script legacy: fuente con idTrabajadorCanonico apuntando a destino */
    legacyAutoFusion?: boolean;
  }): Promise<FusionResult> {
    const {
      trabajadorDestinoId,
      trabajadorFuenteId,
      userId,
      idEmpresa,
      proveedorSaludId,
      numeroEmpleadoResuelto,
      migrarArchivos = false,
      confirmacion,
      legacyAutoFusion = false,
    } = params;

    if (!confirmacion) {
      throw new BadRequestException('Se requiere confirmación explícita para fusionar');
    }

    if (trabajadorDestinoId === trabajadorFuenteId) {
      throw new BadRequestException('Destino y fuente deben ser distintos');
    }

    const preview = await this.getFusionPreview(
      trabajadorDestinoId,
      trabajadorFuenteId,
    );

    const hasPendingAlert = await this.duplicateAlertModel.exists({
      estado: 'PENDIENTE',
      $or: [
        {
          trabajadorId: new Types.ObjectId(trabajadorFuenteId),
          candidatoId: new Types.ObjectId(trabajadorDestinoId),
        },
        {
          trabajadorId: new Types.ObjectId(trabajadorDestinoId),
          candidatoId: new Types.ObjectId(trabajadorFuenteId),
        },
      ],
    });

    if (!hasPendingAlert && !preview.criterioMatch && !legacyAutoFusion) {
      throw new BadRequestException(
        'No hay coincidencia verificable por folio o CURP real entre los registros',
      );
    }

    if (legacyAutoFusion) {
      const fuenteWorker = await this.trabajadorModel
        .findById(trabajadorFuenteId)
        .select('idTrabajadorCanonico')
        .lean()
        .exec();
      const canonicalRef = (fuenteWorker as any)?.idTrabajadorCanonico?.toString();
      if (canonicalRef !== trabajadorDestinoId) {
        throw new BadRequestException(
          'Migración legacy: la fuente debe tener idTrabajadorCanonico apuntando al destino',
        );
      }
    }

    if (preview.conflictos.numeroEmpleado && !numeroEmpleadoResuelto) {
      throw new ConflictException(
        'Conflicto de número de empleado: indique cuál conservar en numeroEmpleadoResuelto',
      );
    }

    const session = await this.connection.startSession();
    const documentosMigradosPorColeccion: Record<string, number> = {};
    let archivosMigrados = 0;

    try {
      await session.withTransaction(async () => {
        await this.deduplicateConsentimientos(
          trabajadorDestinoId,
          trabajadorFuenteId,
          session,
        );

        for (const config of WORKER_LINKED_COLLECTIONS) {
          const count = await this.migrateCollection(
            config,
            trabajadorFuenteId,
            trabajadorDestinoId,
            session,
          );
          if (count > 0) {
            documentosMigradosPorColeccion[config.modelName] = count;
          }
          if (migrarArchivos && config.fileField && count > 0) {
            archivosMigrados += await this.migrateFilePaths(
              config,
              trabajadorFuenteId,
              trabajadorDestinoId,
              session,
            );
          }
        }

        await this.trabajadorModel
          .updateMany(
            { idTrabajadorCanonico: new Types.ObjectId(trabajadorFuenteId) },
            { $set: { idTrabajadorCanonico: new Types.ObjectId(trabajadorDestinoId) } },
          )
          .session(session)
          .exec();

        if (numeroEmpleadoResuelto) {
          await this.trabajadorModel
            .updateOne(
              { _id: new Types.ObjectId(trabajadorDestinoId) },
              { $set: { numeroEmpleado: numeroEmpleadoResuelto } },
            )
            .session(session)
            .exec();
        }

        await this.duplicateAlertModel
          .updateMany(
            {
              estado: 'PENDIENTE',
              $or: [
                { trabajadorId: new Types.ObjectId(trabajadorFuenteId) },
                { candidatoId: new Types.ObjectId(trabajadorFuenteId) },
                {
                  trabajadorId: new Types.ObjectId(trabajadorDestinoId),
                  candidatoId: new Types.ObjectId(trabajadorFuenteId),
                },
                {
                  trabajadorId: new Types.ObjectId(trabajadorFuenteId),
                  candidatoId: new Types.ObjectId(trabajadorDestinoId),
                },
              ],
            },
            { $set: { estado: 'FUSIONADO' } },
          )
          .session(session)
          .exec();

        await this.fusionHistoryModel.create(
          [
            {
              fuenteId: new Types.ObjectId(trabajadorFuenteId),
              destinoId: new Types.ObjectId(trabajadorDestinoId),
              idEmpresa: new Types.ObjectId(idEmpresa),
              actorId: new Types.ObjectId(userId),
              criterio: preview.criterioMatch,
              documentosMigradosPorColeccion,
            },
          ],
          { session },
        );

        const deleted = await this.trabajadorModel
          .findByIdAndDelete(trabajadorFuenteId)
          .session(session)
          .exec();

        if (!deleted) {
          throw new BadRequestException('No se pudo eliminar el trabajador fuente');
        }

        await this.auditService.record({
          proveedorSaludId,
          actorId: userId,
          actionType: AuditActionType.WORKER_FUSION_MANUAL,
          eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
          resourceType: 'Trabajador',
          resourceId: trabajadorDestinoId,
          payload: {
            destinoId: trabajadorDestinoId,
            fuenteId: trabajadorFuenteId,
            criterio: preview.criterioMatch,
            documentosMigradosPorColeccion,
            archivosMigrados,
            numeroEmpleadoResuelto: numeroEmpleadoResuelto ?? null,
          },
        });
      });
    } finally {
      session.endSession();
    }

    return {
      destinoId: trabajadorDestinoId,
      fuenteId: trabajadorFuenteId,
      documentosMigradosPorColeccion,
      archivosMigrados,
    };
  }

  private async migrateCollection(
    config: (typeof WORKER_LINKED_COLLECTIONS)[number],
    fuenteId: string,
    destinoId: string,
    session: ClientSession,
  ): Promise<number> {
    let model: Model<any>;
    try {
      model = this.connection.model(config.modelName);
    } catch {
      model = this.connection.model(
        config.modelName,
        new Schema({}, { strict: false }),
        config.collectionName,
      );
    }

    const result = await model
      .updateMany(
        { [config.fkField]: new Types.ObjectId(fuenteId) },
        { $set: { [config.fkField]: new Types.ObjectId(destinoId) } },
      )
      .session(session)
      .exec();

    return result.modifiedCount ?? 0;
  }

  private async deduplicateConsentimientos(
    destinoId: string,
    fuenteId: string,
    session: ClientSession,
  ): Promise<void> {
    const fuenteConsents = await this.consentimientoModel
      .find({ trabajadorId: new Types.ObjectId(fuenteId) })
      .session(session)
      .lean()
      .exec();

    for (const consent of fuenteConsents) {
      const provId = (consent as any).proveedorSaludId;
      const dateKey = (consent as any).dateKey;
      const destExists = await this.consentimientoModel
        .exists({
          proveedorSaludId: provId,
          trabajadorId: new Types.ObjectId(destinoId),
          dateKey,
        })
        .session(session);

      if (destExists) {
        await this.consentimientoModel
          .deleteOne({ _id: (consent as any)._id })
          .session(session)
          .exec();
      }
    }
  }

  private async migrateFilePaths(
    config: (typeof WORKER_LINKED_COLLECTIONS)[number],
    fuenteId: string,
    destinoId: string,
    session: ClientSession,
  ): Promise<number> {
    if (!config.fileField) return 0;

    let model: Model<any>;
    try {
      model = this.connection.model(config.modelName);
    } catch {
      return 0;
    }

    const docs = await model
      .find({
        [config.fkField]: new Types.ObjectId(destinoId),
        [config.fileField]: { $exists: true, $ne: null },
      })
      .select(`_id ${config.fileField}`)
      .session(session)
      .lean()
      .exec();

    const baseDir = EXPEDIENTES_DIR;
    let migrated = 0;

    for (const doc of docs) {
      const oldPath = (doc as any)[config.fileField];
      if (!oldPath || !oldPath.includes(fuenteId)) continue;

      const newPath = oldPath.replace(fuenteId, destinoId);
      const oldFull = path.join(baseDir, '..', oldPath);
      const newFull = path.join(baseDir, '..', newPath);

      try {
        await fs.mkdir(path.dirname(newFull), { recursive: true });
        await fs.rename(oldFull, newFull).catch(async () => {
          await fs.cp(oldFull, newFull, { recursive: true });
        });
        await model
          .updateOne({ _id: (doc as any)._id }, { $set: { [config.fileField]: newPath } })
          .session(session)
          .exec();
        migrated++;
      } catch {
        // Legacy MVP: keep original path if physical move fails
      }
    }

    return migrated;
  }

  /** Conteos derivados de summaries; no duplicar countDocuments en el batch. */
  private static readonly SUMMARY_COUNT_MODELS = new Set([
    'ResultadoClinico',
    'RiesgoTrabajo',
  ]);

  private async countDocumentsByWorkerPair(
    destinoId: string,
    fuenteId: string,
  ): Promise<{
    destino: Record<string, number>;
    fuente: Record<string, number>;
  }> {
    const destinoOid = new Types.ObjectId(destinoId);
    const fuenteOid = new Types.ObjectId(fuenteId);
    const workerIds = [destinoOid, fuenteOid];

    const configs = WORKER_LINKED_COLLECTIONS.filter(
      (c) => !WorkerFusionService.SUMMARY_COUNT_MODELS.has(c.modelName),
    );

    const results = await Promise.all(
      configs.map(async (config) => {
        let model: Model<any>;
        try {
          model = this.connection.model(config.modelName);
        } catch {
          return null;
        }
        const groups = await model
          .aggregate<{ _id: Types.ObjectId; count: number }>([
            { $match: { [config.fkField]: { $in: workerIds } } },
            { $group: { _id: `$${config.fkField}`, count: { $sum: 1 } } },
          ])
          .exec();
        return { modelName: config.modelName, groups };
      }),
    );

    const destino: Record<string, number> = {};
    const fuente: Record<string, number> = {};

    for (const entry of results) {
      if (!entry) continue;
      for (const group of entry.groups) {
        const workerId = group._id?.toString();
        if (workerId === destinoId) {
          destino[entry.modelName] = group.count;
        } else if (workerId === fuenteId) {
          fuente[entry.modelName] = group.count;
        }
      }
    }

    return { destino, fuente };
  }

  /** Separa conteos en documentos del expediente vs otros registros vinculados. */
  private splitExpedienteAndVinculados(counts: Record<string, number>): {
    expediente: number;
    vinculados: number;
    detalleVinculados: Record<string, number>;
  } {
    let expediente = 0;
    let vinculados = 0;
    const detalleVinculados: Record<string, number> = {};
    for (const [modelName, count] of Object.entries(counts)) {
      if (EXPEDIENTE_DOCUMENT_MODEL_NAMES.has(modelName)) {
        expediente += count;
      } else {
        vinculados += count;
        detalleVinculados[modelName] = count;
      }
    }
    return { expediente, vinculados, detalleVinculados };
  }

  private async fetchResultadosClinicosSummary(
    trabajadorId: string,
  ): Promise<FusionResultadoClinicoSummary[]> {
    let model: Model<any>;
    try {
      model = this.connection.model('ResultadoClinico');
    } catch {
      return [];
    }
    const docs = await model
      .find({ idTrabajador: new Types.ObjectId(trabajadorId) })
      .select('tipoEstudio fechaEstudio resultadoGlobal')
      .sort({ fechaEstudio: -1 })
      .lean()
      .exec();
    return docs.map((d: any) => ({
      _id: d._id?.toString(),
      tipoEstudio: d.tipoEstudio,
      fechaEstudio: d.fechaEstudio
        ? new Date(d.fechaEstudio).toISOString()
        : '',
      resultadoGlobal: d.resultadoGlobal,
    }));
  }

  private async fetchRiesgosTrabajoSummary(
    trabajadorId: string,
  ): Promise<FusionRiesgoTrabajoSummary[]> {
    let model: Model<any>;
    try {
      model = this.connection.model('RiesgoTrabajo');
    } catch {
      return [];
    }
    const docs = await model
      .find({ idTrabajador: new Types.ObjectId(trabajadorId) })
      .select('fechaRiesgo tipoRiesgo naturalezaLesion parteCuerpoAfectada')
      .sort({ fechaRiesgo: -1 })
      .lean()
      .exec();
    return docs.map((d: any) => ({
      _id: d._id?.toString(),
      fechaRiesgo: d.fechaRiesgo
        ? new Date(d.fechaRiesgo).toISOString()
        : '',
      tipoRiesgo: d.tipoRiesgo,
      naturalezaLesion: d.naturalezaLesion,
      parteCuerpoAfectada: d.parteCuerpoAfectada,
    }));
  }

  private consentimientoCollisionKey(
    proveedorSaludId: unknown,
    dateKey: unknown,
  ): string {
    return `${String(proveedorSaludId)}:${String(dateKey)}`;
  }

  private async countConsentimientoCollisions(
    destinoId: string,
    fuenteId: string,
  ): Promise<number> {
    const destinoOid = new Types.ObjectId(destinoId);
    const fuenteOid = new Types.ObjectId(fuenteId);

    const [destConsents, fuenteConsents] = await Promise.all([
      this.consentimientoModel
        .find({ trabajadorId: destinoOid })
        .select('proveedorSaludId dateKey')
        .lean()
        .exec(),
      this.consentimientoModel
        .find({ trabajadorId: fuenteOid })
        .select('proveedorSaludId dateKey')
        .lean()
        .exec(),
    ]);

    const destKeys = new Set(
      destConsents.map((c) =>
        this.consentimientoCollisionKey(
          (c as any).proveedorSaludId,
          (c as any).dateKey,
        ),
      ),
    );

    return fuenteConsents.filter((c) =>
      destKeys.has(
        this.consentimientoCollisionKey(
          (c as any).proveedorSaludId,
          (c as any).dateKey,
        ),
      ),
    ).length;
  }

  private detectMatchCriterio(
    a: Record<string, any>,
    b: Record<string, any>,
  ): DuplicateMatchCriterio | null {
    if (a.folio && b.folio && a.folio === b.folio) {
      return 'FOLIO';
    }
    const curpA = a.curp?.trim().toUpperCase();
    const curpB = b.curp?.trim().toUpperCase();
    if (
      curpA &&
      curpB &&
      !isGenericCURP(curpA) &&
      !isGenericCURP(curpB) &&
      curpA === curpB
    ) {
      return 'CURP';
    }
    return null;
  }

  private buildDuplicateMatch(
    existing: Record<string, any>,
    criterio: DuplicateMatchCriterio,
  ): DuplicateMatch {
    return {
      trabajadorId: existing._id?.toString(),
      criterio,
      trabajador: this.toWorkerSummary(existing),
    };
  }

  private toWorkerSummary(
    doc: Record<string, any>,
    nombreCentroTrabajo?: string,
  ): DuplicateWorkerSummary {
    return {
      _id: doc._id?.toString(),
      nombre: doc.nombre,
      primerApellido: doc.primerApellido,
      segundoApellido: doc.segundoApellido,
      curp: doc.curp,
      folio: doc.folio,
      numeroEmpleado: doc.numeroEmpleado,
      sexo: doc.sexo,
      fechaNacimiento: doc.fechaNacimiento
        ? new Date(doc.fechaNacimiento).toISOString()
        : undefined,
      puesto: doc.puesto,
      fechaIngreso: doc.fechaIngreso
        ? new Date(doc.fechaIngreso).toISOString()
        : undefined,
      idCentroTrabajo: doc.idCentroTrabajo?.toString(),
      nombreCentroTrabajo,
      createdAt: doc.createdAt,
    };
  }

  private async resolveCentrosForFusionPair(
    centroIds: string[],
  ): Promise<Map<string, { nombreCentro: string; idEmpresa: string }>> {
    if (centroIds.length === 0) {
      return new Map();
    }

    const centros = await this.centroTrabajoModel
      .find({ _id: { $in: centroIds.map((id) => new Types.ObjectId(id)) } })
      .select('nombreCentro idEmpresa')
      .lean()
      .exec();

    const map = new Map<string, { nombreCentro: string; idEmpresa: string }>();
    const empresas = new Set<string>();

    for (const centro of centros) {
      const id = (centro as any)._id.toString();
      const idEmpresa =
        (centro as any).idEmpresa?.toString?.() ??
        String((centro as any).idEmpresa ?? '');
      map.set(id, {
        nombreCentro: (centro as any).nombreCentro ?? '',
        idEmpresa,
      });
      if (idEmpresa) empresas.add(idEmpresa);
    }

    if (centroIds.length >= 2 && empresas.size !== 1) {
      throw new BadRequestException(
        'Los trabajadores deben pertenecer a la misma empresa',
      );
    }

    return map;
  }

  async getIdEmpresaFromCentro(
    idCentroTrabajo: string,
  ): Promise<string | null> {
    const centro = await this.centroTrabajoModel
      .findById(idCentroTrabajo)
      .select('idEmpresa')
      .lean()
      .exec();

    if (!centro?.idEmpresa) return null;
    return (
      (centro.idEmpresa as any)?.toString?.() ?? centro.idEmpresa.toString()
    );
  }

  private async getCentroIdsByEmpresa(
    idEmpresa: string,
  ): Promise<Types.ObjectId[]> {
    const centros = await this.centroTrabajoModel
      .find({ idEmpresa: new Types.ObjectId(idEmpresa) })
      .select('_id')
      .lean()
      .exec();

    return centros.map((c) => (c as any)._id);
  }
}
