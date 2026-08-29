import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { ProveedoresSaludService } from '../proveedores-salud/proveedores-salud.service';
import { RegulatoryPolicyService } from 'src/utils/regulatory-policy.service';
import { WorkerFusionService } from '../trabajadores/worker-fusion.service';
import { NotasMedicasBorradoresService } from '../expedientes/notas-medicas-borradores.service';
import { Trabajador } from '../trabajadores/schemas/trabajador.schema';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from '../empresas/schemas/empresa.schema';
import { DocumentoEstado } from '../expedientes/enums/documento-estado.enum';
import {
  getInicioDocumentTypesForRegime,
  type InicioDocumentTypeConfig,
  type InicioRegimen,
} from './inicio-document-types';
import { getInicioDayBounds, resolveInicioTimezone } from './inicio-timezone';
import { selectInicioTip } from './inicio-tips';
import { applyHoyListCap } from './inicio-hoy-list.util';
import type {
  InicioActivityScope,
  InicioAtencionGrupo,
  InicioClienteReciente,
  InicioExpedienteReciente,
  InicioHoyCentroItem,
  InicioHoyDocumentoItem,
  InicioHoyListResponse,
  InicioHoyTrabajadorItem,
  InicioPendienteItem,
  InicioResumenResponse,
} from './interfaces/inicio-resumen.interface';

const RECENT_LOOKBACK_DAYS = 30;
const RECENT_LIMIT_PER_COLLECTION = 30;
const TODAY_LIMIT_PER_COLLECTION = 500;
const DRAFT_LIMIT_PER_COLLECTION = 50;
const MAX_CLIENTES_RECIENTES = 4;
const MAX_EXPEDIENTES_RECIENTES = 3;
const STALE_DRAFT_MS = 72 * 60 * 60 * 1000;

interface RawDoc {
  _id: Types.ObjectId;
  idTrabajador: Types.ObjectId;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  estado?: string;
  finalizadoPor?: Types.ObjectId;
  nombreDocumento?: string;
  collectionName: string;
  documentType: string;
  etiqueta: string;
}

interface HydratedCentro {
  id: string;
  nombreCentro: string;
  idEmpresa: string;
  nombreComercial: string;
}

interface HydratedTrabajador {
  id: string;
  canonicalId: string;
  nombre: string;
  idCentroTrabajo: string;
}

@Injectable()
export class InicioResumenService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Trabajador.name)
    private readonly trabajadorModel: Model<Trabajador>,
    @InjectModel(CentroTrabajo.name)
    private readonly centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(Empresa.name) private readonly empresaModel: Model<Empresa>,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ProveedoresSaludService))
    private readonly proveedoresSaludService: ProveedoresSaludService,
    @Inject(forwardRef(() => RegulatoryPolicyService))
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
    private readonly workerFusionService: WorkerFusionService,
    @Inject(forwardRef(() => NotasMedicasBorradoresService))
    private readonly notasMedicasBorradoresService: NotasMedicasBorradoresService,
  ) {}

  async getResumen(userId: string): Promise<InicioResumenResponse> {
    const user = await this.usersService.findById(
      userId,
      'username role idProveedorSalud centrosTrabajoAsignados permisos',
    );
    if (!user?.idProveedorSalud) {
      throw new UnauthorizedException(
        'Usuario sin proveedor de salud asociado',
      );
    }

    const proveedorSaludId = String(user.idProveedorSalud);
    const proveedor =
      await this.proveedoresSaludService.findOne(proveedorSaludId);
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    const regimen: InicioRegimen =
      policy.regime === 'SIRES_NOM024' ? 'SIRES_NOM024' : 'SIN_REGIMEN';
    const isPrincipal = user.role === 'Principal';
    const activityScope: InicioActivityScope = isPrincipal ? 'tenant' : 'user';

    const timezone = resolveInicioTimezone(proveedor as any);
    const { start, end, dateKey } = getInicioDayBounds(timezone);
    const lookbackStart = new Date(
      end.getTime() - RECENT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );

    const { actorIds, usernames } = await this.resolveActors(
      proveedorSaludId,
      user,
      isPrincipal,
    );
    const actorIdSet = new Set(actorIds.map((id) => String(id)));

    const types = getInicioDocumentTypesForRegime(regimen);
    const [todayDocs, recentDocs, draftDocs] = await Promise.all([
      this.queryActivity(types, actorIds, start, end, TODAY_LIMIT_PER_COLLECTION),
      this.queryActivity(
        types,
        actorIds,
        lookbackStart,
        end,
        RECENT_LIMIT_PER_COLLECTION,
      ),
      regimen === 'SIRES_NOM024'
        ? this.queryDrafts(types, actorIds)
        : Promise.resolve([] as RawDoc[]),
    ]);

    const workerIds = [
      ...todayDocs,
      ...recentDocs,
      ...draftDocs,
    ].map((doc) => String(doc.idTrabajador));
    const { trabajadores, centros } = await this.hydrateWorkersAndCentros(
      workerIds,
      user,
      proveedorSaludId,
      isPrincipal,
    );

    const createdToday = todayDocs.filter(
      (doc) =>
        this.isInWindow(doc.createdAt, start, end) &&
        this.isActor(doc.createdBy, actorIdSet) &&
        centros.has(trabajadores.get(String(doc.idTrabajador))?.idCentroTrabajo ?? ''),
    );

    const activityToday = todayDocs.filter((doc) => {
      const worker = trabajadores.get(String(doc.idTrabajador));
      if (!worker || !centros.has(worker.idCentroTrabajo)) return false;
      const created =
        this.isInWindow(doc.createdAt, start, end) &&
        this.isActor(doc.createdBy, actorIdSet);
      const updated =
        this.isInWindow(doc.updatedAt, start, end) &&
        this.isActor(doc.updatedBy, actorIdSet);
      return created || updated;
    });

    const uniqueWorkers = new Set(
      activityToday.map(
        (doc) =>
          trabajadores.get(String(doc.idTrabajador))?.canonicalId ??
          String(doc.idTrabajador),
      ),
    );
    const uniqueCentrosHoy = new Set(
      activityToday.map(
        (doc) => trabajadores.get(String(doc.idTrabajador))?.idCentroTrabajo ?? '',
      ),
    );

    const draftsInScope = draftDocs.filter((doc) => {
      const worker = trabajadores.get(String(doc.idTrabajador));
      return Boolean(worker && centros.has(worker.idCentroTrabajo));
    });

    const clientesRecientes = this.buildClientesRecientes(
      recentDocs,
      trabajadores,
      centros,
      actorIdSet,
      usernames,
      activityScope,
    );
    const expedientesRecientes = this.buildExpedientesRecientes(
      recentDocs,
      trabajadores,
      centros,
      actorIdSet,
      usernames,
      activityScope,
    );

    const pendientes = this.buildPendientes(
      draftsInScope,
      trabajadores,
      centros,
      usernames,
      activityScope,
    );

    const atencion = await this.buildAtencion(
      userId,
      regimen,
      isPrincipal,
      pendientes,
    );

    const hoy = {
      trabajadoresUnicos: uniqueWorkers.size,
      documentosCreados: createdToday.length,
      ...(regimen === 'SIN_REGIMEN'
        ? { centrosConActividad: uniqueCentrosHoy.size }
        : {}),
      ...(regimen === 'SIRES_NOM024'
        ? { borradoresPendientes: pendientes.length }
        : {}),
    };

    const hasActivity =
      hoy.trabajadoresUnicos > 0 ||
      hoy.documentosCreados > 0 ||
      (hoy.centrosConActividad ?? 0) > 0 ||
      (hoy.borradoresPendientes ?? 0) > 0 ||
      clientesRecientes.length > 0 ||
      expedientesRecientes.length > 0 ||
      atencion.length > 0;

    const tip = selectInicioTip({
      userId,
      dateKey,
      regimen,
      role: user.role,
      activityScope,
      recentDocumentTypes: expedientesRecientes.map(
        (item) => item.tipoDocumento,
      ),
      hasNmStaleAtencion: atencion.some(
        (grupo) => grupo.tipo === 'borrador_nm_propio',
      ),
    });

    let consejo: InicioResumenResponse['consejo'] = null;
    if (tip) {
      consejo = { id: tip.id, texto: tip.texto };
      if (tip.enlace) {
        consejo.enlace = { ...tip.enlace };
      } else if (tip.id === 'fusion-duplicados' && clientesRecientes[0]) {
        const primero = clientesRecientes[0];
        if (primero.idEmpresa && primero.idCentroTrabajo) {
          consejo.enlace = {
            name: 'trabajadores',
            params: {
              idEmpresa: primero.idEmpresa,
              idCentroTrabajo: primero.idCentroTrabajo,
            },
          };
        }
      }
    }

    const hasTrabajadores = hasActivity
      ? true
      : await this.hasTrabajadoresEnAlcance(
          user,
          proveedorSaludId,
          isPrincipal,
        );

    return {
      hasActivity,
      hasTrabajadores,
      activityScope,
      regimen,
      dateKey,
      hoy,
      clientesRecientes,
      expedientesRecientes,
      atencion,
      pendientes: regimen === 'SIRES_NOM024' ? pendientes : [],
      consejo,
    };
  }

  private async hasTrabajadoresEnAlcance(
    user: {
      permisos?: { accesoCompletoEmpresasCentros?: boolean };
      centrosTrabajoAsignados?: unknown[];
    },
    proveedorSaludId: string,
    isPrincipal: boolean,
  ): Promise<boolean> {
    let centroIds: string[] = [];

    if (isPrincipal || user.permisos?.accesoCompletoEmpresasCentros) {
      const empresas = await this.empresaModel
        .find({ idProveedorSalud: new Types.ObjectId(proveedorSaludId) })
        .select('_id')
        .lean()
        .exec();
      const empresaIds = empresas
        .map((empresa) => String((empresa as any)._id ?? ''))
        .filter((id) => Types.ObjectId.isValid(id));
      if (empresaIds.length === 0) {
        return false;
      }
      const centros = await this.centroTrabajoModel
        .find({
          idEmpresa: {
            $in: empresaIds.map((id) => new Types.ObjectId(id)),
          },
        })
        .select('_id')
        .lean()
        .exec();
      centroIds = centros.map((centro) => String((centro as any)._id ?? ''));
    } else {
      centroIds = (user.centrosTrabajoAsignados ?? []).map((id) => String(id));
    }

    const objectIds = [...new Set(centroIds.filter(Boolean))]
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (objectIds.length === 0) {
      return false;
    }

    const found = await this.trabajadorModel.exists({
      idCentroTrabajo: { $in: objectIds },
    });
    return Boolean(found);
  }

  async listHoyTrabajadores(
    userId: string,
  ): Promise<InicioHoyListResponse<InicioHoyTrabajadorItem>> {
    const scope = await this.loadHoyScope(userId);
    const byCanonical = new Map<
      string,
      {
        at: Date;
        actorId: string;
        etiquetaTipo: string;
        worker: HydratedTrabajador;
        tie: string;
      }
    >();
    for (const doc of scope.activityToday) {
      const worker = scope.trabajadores.get(String(doc.idTrabajador));
      if (!worker) continue;
      const event = this.resolveActorEvent(doc, scope.actorIdSet);
      if (!event) continue;
      const prev = byCanonical.get(worker.canonicalId);
      if (
        !prev ||
        event.at > prev.at ||
        (event.at.getTime() === prev.at.getTime() &&
          String(doc._id) > prev.tie)
      ) {
        byCanonical.set(worker.canonicalId, {
          at: event.at,
          actorId: event.actorId,
          etiquetaTipo: doc.etiqueta,
          worker,
          tie: String(doc._id),
        });
      }
    }

    await this.fillMissingUsernames(
      [...byCanonical.values()].map((row) => row.actorId),
      scope.usernames,
    );

    const items = [...byCanonical.values()]
      .sort(
        (a, b) =>
          b.at.getTime() - a.at.getTime() ||
          a.worker.canonicalId.localeCompare(b.worker.canonicalId),
      )
      .map((row) => {
        const centro = scope.centros.get(row.worker.idCentroTrabajo)!;
        return {
          idEmpresa: centro.idEmpresa,
          idCentroTrabajo: row.worker.idCentroTrabajo,
          idTrabajador: row.worker.canonicalId,
          nombreTrabajador: row.worker.nombre,
          nombreComercial: centro.nombreComercial,
          nombreCentro: centro.nombreCentro,
          etiquetaTipo: row.etiquetaTipo,
          ultimaActividad: row.at.toISOString(),
          ...(scope.activityScope === 'tenant'
            ? { actorUsername: scope.usernames.get(row.actorId) }
            : {}),
        } satisfies InicioHoyTrabajadorItem;
      });

    return applyHoyListCap(items);
  }

  async listHoyDocumentos(
    userId: string,
  ): Promise<InicioHoyListResponse<InicioHoyDocumentoItem>> {
    const scope = await this.loadHoyScope(userId);
    const actorIds = new Set<string>();
    for (const doc of scope.createdToday) {
      if (doc.createdBy) actorIds.add(String(doc.createdBy));
      if (
        scope.regimen === 'SIRES_NOM024' &&
        doc.estado === DocumentoEstado.FINALIZADO &&
        doc.finalizadoPor
      ) {
        actorIds.add(String(doc.finalizadoPor));
      }
    }
    await this.fillMissingUsernames([...actorIds], scope.usernames);

    const items = [...scope.createdToday]
      .sort((a, b) => {
        const aAt = (a.createdAt ?? new Date(0)).getTime();
        const bAt = (b.createdAt ?? new Date(0)).getTime();
        if (bAt !== aAt) return bAt - aAt;
        return String(b._id).localeCompare(String(a._id));
      })
      .map((doc) => {
        const worker = scope.trabajadores.get(String(doc.idTrabajador))!;
        const centro = scope.centros.get(worker.idCentroTrabajo)!;
        const item: InicioHoyDocumentoItem = {
          idDocumento: String(doc._id),
          tipoDocumento: doc.documentType,
          etiquetaTipo: doc.etiqueta,
          idEmpresa: centro.idEmpresa,
          idCentroTrabajo: worker.idCentroTrabajo,
          idTrabajador: worker.canonicalId,
          nombreTrabajador: worker.nombre,
          nombreComercial: centro.nombreComercial,
          nombreCentro: centro.nombreCentro,
          createdAt: (doc.createdAt ?? new Date(0)).toISOString(),
          creadorUsername: scope.usernames.get(String(doc.createdBy ?? '')),
        };
        if (doc.documentType === 'documentoExterno') {
          const nombre = doc.nombreDocumento?.trim();
          if (nombre) item.nombreDocumento = nombre;
        }
        if (scope.regimen === 'SIRES_NOM024') {
          if (doc.estado === DocumentoEstado.FINALIZADO) {
            item.estado = 'finalizado';
            item.finalizadoPorUsername = scope.usernames.get(
              String(doc.finalizadoPor ?? ''),
            );
          } else {
            item.estado = 'borrador';
          }
        }
        return item;
      });

    return applyHoyListCap(items);
  }

  async listHoyCentros(
    userId: string,
  ): Promise<InicioHoyListResponse<InicioHoyCentroItem>> {
    const scope = await this.loadHoyScope(userId);
    if (scope.regimen === 'SIRES_NOM024') {
      throw new BadRequestException(
        'El indicador de centros con actividad hoy no aplica al régimen SIRES',
      );
    }

    const byCentro = new Map<
      string,
      { at: Date; actorId: string; tie: string }
    >();
    for (const doc of scope.activityToday) {
      const worker = scope.trabajadores.get(String(doc.idTrabajador));
      if (!worker) continue;
      const event = this.resolveActorEvent(doc, scope.actorIdSet);
      if (!event) continue;
      const prev = byCentro.get(worker.idCentroTrabajo);
      if (
        !prev ||
        event.at > prev.at ||
        (event.at.getTime() === prev.at.getTime() &&
          String(doc._id) > prev.tie)
      ) {
        byCentro.set(worker.idCentroTrabajo, {
          at: event.at,
          actorId: event.actorId,
          tie: String(doc._id),
        });
      }
    }

    await this.fillMissingUsernames(
      [...byCentro.values()].map((row) => row.actorId),
      scope.usernames,
    );

    const items = [...byCentro.entries()]
      .sort(
        (a, b) =>
          b[1].at.getTime() - a[1].at.getTime() || a[0].localeCompare(b[0]),
      )
      .map(([idCentroTrabajo, row]) => {
        const centro = scope.centros.get(idCentroTrabajo)!;
        return {
          idEmpresa: centro.idEmpresa,
          idCentroTrabajo,
          nombreComercial: centro.nombreComercial,
          nombreCentro: centro.nombreCentro,
          ultimaActividad: row.at.toISOString(),
          ...(scope.activityScope === 'tenant'
            ? { actorUsername: scope.usernames.get(row.actorId) }
            : {}),
        } satisfies InicioHoyCentroItem;
      });

    return applyHoyListCap(items);
  }

  private async loadHoyScope(userId: string): Promise<{
    regimen: InicioRegimen;
    activityScope: InicioActivityScope;
    actorIdSet: Set<string>;
    usernames: Map<string, string>;
    centros: Map<string, HydratedCentro>;
    trabajadores: Map<string, HydratedTrabajador>;
    activityToday: RawDoc[];
    createdToday: RawDoc[];
  }> {
    const user = await this.usersService.findById(
      userId,
      'username role idProveedorSalud centrosTrabajoAsignados permisos',
    );
    if (!user?.idProveedorSalud) {
      throw new UnauthorizedException(
        'Usuario sin proveedor de salud asociado',
      );
    }

    const proveedorSaludId = String(user.idProveedorSalud);
    const proveedor =
      await this.proveedoresSaludService.findOne(proveedorSaludId);
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    const regimen: InicioRegimen =
      policy.regime === 'SIRES_NOM024' ? 'SIRES_NOM024' : 'SIN_REGIMEN';
    const isPrincipal = user.role === 'Principal';
    const activityScope: InicioActivityScope = isPrincipal ? 'tenant' : 'user';
    const timezone = resolveInicioTimezone(proveedor as any);
    const { start, end } = getInicioDayBounds(timezone);
    const { actorIds, usernames } = await this.resolveActors(
      proveedorSaludId,
      user,
      isPrincipal,
    );
    const actorIdSet = new Set(actorIds.map((id) => String(id)));
    const types = getInicioDocumentTypesForRegime(regimen);
    const todayDocs = await this.queryActivity(
      types,
      actorIds,
      start,
      end,
      TODAY_LIMIT_PER_COLLECTION,
    );
    const { trabajadores, centros } = await this.hydrateWorkersAndCentros(
      todayDocs.map((doc) => String(doc.idTrabajador)),
      user,
      proveedorSaludId,
      isPrincipal,
    );

    const createdToday = todayDocs.filter(
      (doc) =>
        this.isInWindow(doc.createdAt, start, end) &&
        this.isActor(doc.createdBy, actorIdSet) &&
        centros.has(
          trabajadores.get(String(doc.idTrabajador))?.idCentroTrabajo ?? '',
        ),
    );

    const activityToday = todayDocs.filter((doc) => {
      const worker = trabajadores.get(String(doc.idTrabajador));
      if (!worker || !centros.has(worker.idCentroTrabajo)) return false;
      const created =
        this.isInWindow(doc.createdAt, start, end) &&
        this.isActor(doc.createdBy, actorIdSet);
      const updated =
        this.isInWindow(doc.updatedAt, start, end) &&
        this.isActor(doc.updatedBy, actorIdSet);
      return created || updated;
    });

    return {
      regimen,
      activityScope,
      actorIdSet,
      usernames,
      centros,
      trabajadores,
      activityToday,
      createdToday,
    };
  }

  private async fillMissingUsernames(
    ids: string[],
    usernames: Map<string, string>,
  ): Promise<void> {
    const missing = [
      ...new Set(ids.filter((id) => id && !usernames.has(id))),
    ].filter((id) => Types.ObjectId.isValid(id));
    if (missing.length === 0) return;
    const db = this.connection.db;
    if (!db) return;
    const rows = await db
      .collection('users')
      .find(
        { _id: { $in: missing.map((id) => new Types.ObjectId(id)) } },
        { projection: { username: 1 } },
      )
      .toArray();
    for (const row of rows) {
      if (row.username) {
        usernames.set(String(row._id), String(row.username));
      }
    }
  }

  private async resolveActors(
    proveedorSaludId: string,
    user: { _id: unknown; username?: string },
    isPrincipal: boolean,
  ): Promise<{
    actorIds: Types.ObjectId[];
    usernames: Map<string, string>;
  }> {
    const usernames = new Map<string, string>();
    if (!isPrincipal) {
      const id = new Types.ObjectId(String(user._id));
      if (user.username) usernames.set(String(id), user.username);
      return { actorIds: [id], usernames };
    }

    const team = await this.usersService.findByProveedorSaludId(
      proveedorSaludId,
      { scope: 'permissions' },
    );
    if (!team?.length) {
      const id = new Types.ObjectId(String(user._id));
      if (user.username) usernames.set(String(id), user.username);
      return { actorIds: [id], usernames };
    }

    const actorIds = team.map((member) => {
      const id = new Types.ObjectId(String(member._id));
      if (member.username) usernames.set(String(id), member.username);
      return id;
    });
    return { actorIds, usernames };
  }

  private async queryActivity(
    types: InicioDocumentTypeConfig[],
    actorIds: Types.ObjectId[],
    start: Date,
    end: Date,
    limit: number,
  ): Promise<RawDoc[]> {
    const filter = {
      estado: { $ne: DocumentoEstado.ANULADO },
      $or: [
        { createdBy: { $in: actorIds }, createdAt: { $gte: start, $lt: end } },
        { updatedBy: { $in: actorIds }, updatedAt: { $gte: start, $lt: end } },
      ],
    };
    const batches = await Promise.all(
      types.map((type) =>
        this.findDocs(type, filter, { updatedAt: -1 }, limit),
      ),
    );
    return batches.flat();
  }

  private async queryDrafts(
    types: InicioDocumentTypeConfig[],
    actorIds: Types.ObjectId[],
  ): Promise<RawDoc[]> {
    const filter: Record<string, unknown> = {
      estado: DocumentoEstado.BORRADOR,
      createdBy: { $in: actorIds },
    };
    const batches = await Promise.all(
      types.map((type) =>
        this.findDocs(type, filter, { createdAt: 1 }, DRAFT_LIMIT_PER_COLLECTION),
      ),
    );
    return batches.flat();
  }

  private async findDocs(
    type: InicioDocumentTypeConfig,
    filter: Record<string, unknown>,
    sort: Record<string, 1 | -1>,
    limit: number,
  ): Promise<RawDoc[]> {
    const db = this.connection.db;
    if (!db) return [];
    try {
      const rows = await db
        .collection(type.collectionName)
        .find(filter, {
          projection: {
            idTrabajador: 1,
            createdBy: 1,
            updatedBy: 1,
            createdAt: 1,
            updatedAt: 1,
            estado: 1,
            finalizadoPor: 1,
            nombreDocumento: 1,
          },
        })
        .sort(sort)
        .limit(limit)
        .toArray();
      return rows
        .filter((row) => row.idTrabajador)
        .map((row) => ({
          _id: row._id as Types.ObjectId,
          idTrabajador: row.idTrabajador as Types.ObjectId,
          createdBy: row.createdBy as Types.ObjectId | undefined,
          updatedBy: row.updatedBy as Types.ObjectId | undefined,
          createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
          updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
          estado: row.estado as string | undefined,
          finalizadoPor: row.finalizadoPor as Types.ObjectId | undefined,
          nombreDocumento:
            typeof row.nombreDocumento === 'string'
              ? row.nombreDocumento
              : undefined,
          collectionName: type.collectionName,
          documentType: type.documentType,
          etiqueta: type.etiqueta,
        }));
    } catch {
      return [];
    }
  }

  private async hydrateWorkersAndCentros(
    workerIds: string[],
    user: {
      role?: string;
      permisos?: { accesoCompletoEmpresasCentros?: boolean };
      centrosTrabajoAsignados?: unknown[];
    },
    proveedorSaludId: string,
    isPrincipal: boolean,
  ): Promise<{
    trabajadores: Map<string, HydratedTrabajador>;
    centros: Map<string, HydratedCentro>;
  }> {
    const uniqueIds = [...new Set(workerIds.filter(Boolean))];
    const trabajadores = new Map<string, HydratedTrabajador>();
    const centros = new Map<string, HydratedCentro>();
    if (uniqueIds.length === 0) {
      return { trabajadores, centros };
    }

    const objectIds = uniqueIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    const workers = await this.trabajadorModel
      .find({ _id: { $in: objectIds } })
      .select('nombre primerApellido segundoApellido idCentroTrabajo idTrabajadorCanonico')
      .lean()
      .exec();

    const canonicalMap = await this.workerFusionService.resolveCanonicalIdMap(
      uniqueIds,
    );

    const centroIds = [
      ...new Set(
        workers
          .map((worker) => String((worker as any).idCentroTrabajo ?? ''))
          .filter(Boolean),
      ),
    ];
    const allowedCentroIds = await this.resolveAllowedCentroIds(
      user,
      proveedorSaludId,
      isPrincipal,
      centroIds,
    );

    const centroObjectIds = [...allowedCentroIds]
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    const centroDocs = await this.centroTrabajoModel
      .find({ _id: { $in: centroObjectIds } })
      .select('nombreCentro idEmpresa')
      .lean()
      .exec();
    const empresaIds = [
      ...new Set(
        centroDocs
          .map((centro) => String((centro as any).idEmpresa ?? ''))
          .filter(Boolean),
      ),
    ];
    const empresas = await this.empresaModel
      .find({
        _id: {
          $in: empresaIds
            .filter((id) => Types.ObjectId.isValid(id))
            .map((id) => new Types.ObjectId(id)),
        },
        idProveedorSalud: new Types.ObjectId(proveedorSaludId),
      })
      .select('nombreComercial')
      .lean()
      .exec();
    const empresaById = new Map(
      empresas.map((empresa) => [
        String((empresa as any)._id),
        String((empresa as any).nombreComercial ?? ''),
      ]),
    );

    for (const centro of centroDocs) {
      const id = String((centro as any)._id);
      const idEmpresa = String((centro as any).idEmpresa ?? '');
      const nombreComercial = empresaById.get(idEmpresa);
      if (!nombreComercial) continue;
      centros.set(id, {
        id,
        nombreCentro: String((centro as any).nombreCentro ?? ''),
        idEmpresa,
        nombreComercial,
      });
    }

    for (const worker of workers) {
      const id = String((worker as any)._id);
      const idCentroTrabajo = String((worker as any).idCentroTrabajo ?? '');
      if (!centros.has(idCentroTrabajo)) continue;
      const nombre = [worker.primerApellido, worker.segundoApellido, worker.nombre]
        .filter(Boolean)
        .join(' ')
        .trim();
      trabajadores.set(id, {
        id,
        canonicalId: canonicalMap.get(id) ?? id,
        nombre,
        idCentroTrabajo,
      });
    }

    return { trabajadores, centros };
  }

  private async resolveAllowedCentroIds(
    user: {
      permisos?: { accesoCompletoEmpresasCentros?: boolean };
      centrosTrabajoAsignados?: unknown[];
    },
    _proveedorSaludId: string,
    isPrincipal: boolean,
    candidateIds: string[],
  ): Promise<Set<string>> {
    if (isPrincipal || user.permisos?.accesoCompletoEmpresasCentros) {
      return new Set(candidateIds);
    }
    const assigned = new Set(
      (user.centrosTrabajoAsignados ?? []).map((id) => String(id)),
    );
    return new Set(candidateIds.filter((id) => assigned.has(id)));
  }

  private buildClientesRecientes(
    docs: RawDoc[],
    trabajadores: Map<string, HydratedTrabajador>,
    centros: Map<string, HydratedCentro>,
    actorIdSet: Set<string>,
    usernames: Map<string, string>,
    activityScope: InicioActivityScope,
  ): InicioClienteReciente[] {
    const byCentro = new Map<
      string,
      { at: Date; actorId: string }
    >();
    for (const doc of docs) {
      const worker = trabajadores.get(String(doc.idTrabajador));
      if (!worker || !centros.has(worker.idCentroTrabajo)) continue;
      const event = this.resolveActorEvent(doc, actorIdSet);
      if (!event) continue;
      const prev = byCentro.get(worker.idCentroTrabajo);
      if (!prev || event.at > prev.at) {
        byCentro.set(worker.idCentroTrabajo, event);
      }
    }
    return [...byCentro.entries()]
      .sort((a, b) => b[1].at.getTime() - a[1].at.getTime())
      .slice(0, MAX_CLIENTES_RECIENTES)
      .map(([idCentroTrabajo, event]) => {
        const centro = centros.get(idCentroTrabajo)!;
        return {
          idEmpresa: centro.idEmpresa,
          nombreComercial: centro.nombreComercial,
          idCentroTrabajo,
          nombreCentro: centro.nombreCentro,
          ultimaActividad: event.at.toISOString(),
          ...(activityScope === 'tenant'
            ? { actorUsername: usernames.get(event.actorId) }
            : {}),
        };
      });
  }

  private buildExpedientesRecientes(
    docs: RawDoc[],
    trabajadores: Map<string, HydratedTrabajador>,
    centros: Map<string, HydratedCentro>,
    actorIdSet: Set<string>,
    usernames: Map<string, string>,
    activityScope: InicioActivityScope,
  ): InicioExpedienteReciente[] {
    const byCanonical = new Map<
      string,
      { at: Date; actorId: string; doc: RawDoc; worker: HydratedTrabajador }
    >();
    for (const doc of docs) {
      const worker = trabajadores.get(String(doc.idTrabajador));
      if (!worker || !centros.has(worker.idCentroTrabajo)) continue;
      const event = this.resolveActorEvent(doc, actorIdSet);
      if (!event) continue;
      const prev = byCanonical.get(worker.canonicalId);
      if (!prev || event.at > prev.at) {
        byCanonical.set(worker.canonicalId, { ...event, doc, worker });
      }
    }
    return [...byCanonical.values()]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, MAX_EXPEDIENTES_RECIENTES)
      .map((row) => {
        const centro = centros.get(row.worker.idCentroTrabajo)!;
        return {
          idEmpresa: centro.idEmpresa,
          idCentroTrabajo: row.worker.idCentroTrabajo,
          idTrabajador: row.worker.canonicalId,
          nombreTrabajador: row.worker.nombre,
          nombreComercial: centro.nombreComercial || undefined,
          nombreCentro: centro.nombreCentro || undefined,
          tipoDocumento: row.doc.documentType,
          etiquetaTipo: row.doc.etiqueta,
          ultimaActividad: row.at.toISOString(),
          ...(activityScope === 'tenant'
            ? { actorUsername: usernames.get(row.actorId) }
            : {}),
        };
      });
  }

  private buildPendientes(
    drafts: RawDoc[],
    trabajadores: Map<string, HydratedTrabajador>,
    centros: Map<string, HydratedCentro>,
    usernames: Map<string, string>,
    activityScope: InicioActivityScope,
  ): InicioPendienteItem[] {
    return drafts
      .map((doc) => {
        const worker = trabajadores.get(String(doc.idTrabajador));
        if (!worker) return null;
        const centro = centros.get(worker.idCentroTrabajo);
        if (!centro) return null;
        return {
          idDocumento: String(doc._id),
          tipoDocumento: doc.documentType,
          etiquetaTipo: doc.etiqueta,
          idEmpresa: centro.idEmpresa,
          idCentroTrabajo: worker.idCentroTrabajo,
          idTrabajador: worker.canonicalId,
          nombreTrabajador: worker.nombre,
          createdAt: (doc.createdAt ?? new Date(0)).toISOString(),
          ...(activityScope === 'tenant'
            ? {
                elaboradorUsername: usernames.get(String(doc.createdBy ?? '')),
              }
            : {}),
        } satisfies InicioPendienteItem;
      })
      .filter((item): item is InicioPendienteItem => item != null)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .slice(0, DRAFT_LIMIT_PER_COLLECTION);
  }

  private async buildAtencion(
    userId: string,
    regimen: InicioRegimen,
    isPrincipal: boolean,
    pendientes: InicioPendienteItem[],
  ): Promise<InicioAtencionGrupo[]> {
    if (regimen !== 'SIRES_NOM024') {
      return [];
    }

    const groups: InicioAtencionGrupo[] = [];
    const nm = await this.notasMedicasBorradoresService.findBorradoresPendientes(
      userId,
    );

    if (nm.propios.length > 0) {
      groups.push({
        tipo: 'borrador_nm_propio',
        count: nm.propios.length,
        titulo:
          nm.propios.length === 1
            ? '1 nota médica con más de 72 horas sin finalizar'
            : `${nm.propios.length} notas médicas con más de 72 horas sin finalizar`,
        subtitulo: 'Pendientes de finalizar',
        items: nm.propios.map((item) => ({
          idDocumento: item.id,
          tipoDocumento: 'notaMedica',
          etiquetaTipo: 'Nota médica',
          idEmpresa: item.idEmpresa,
          idCentroTrabajo: item.idCentroTrabajo,
          idTrabajador: item.idTrabajador,
          nombreTrabajador: item.trabajadorNombre,
          createdAt: item.createdAt,
          elaboradorUsername: item.elaborador?.username,
        })),
      });
    }

    if (isPrincipal && nm.equipo.length > 0) {
      groups.push({
        tipo: 'borrador_nm_equipo',
        count: nm.equipo.length,
        titulo:
          nm.equipo.length === 1
            ? '1 nota médica del equipo con más de 7 días sin finalizar'
            : `${nm.equipo.length} notas médicas del equipo con más de 7 días sin finalizar`,
        subtitulo: 'Pendientes de finalizar',
        items: nm.equipo.map((item) => ({
          idDocumento: item.id,
          tipoDocumento: 'notaMedica',
          etiquetaTipo: 'Nota médica',
          idEmpresa: item.idEmpresa,
          idCentroTrabajo: item.idCentroTrabajo,
          idTrabajador: item.idTrabajador,
          nombreTrabajador: item.trabajadorNombre,
          createdAt: item.createdAt,
          elaboradorUsername: item.elaborador?.username,
        })),
      });
    }

    const nmIds = new Set([
      ...nm.propios.map((item) => item.id),
      ...nm.equipo.map((item) => item.id),
    ]);
    const now = Date.now();
    const otherStale = pendientes.filter((item) => {
      if (item.tipoDocumento === 'notaMedica' && nmIds.has(item.idDocumento)) {
        return false;
      }
      const age = now - new Date(item.createdAt).getTime();
      if (item.tipoDocumento === 'notaMedica') {
        return false;
      }
      return age >= STALE_DRAFT_MS;
    });

    if (otherStale.length > 0) {
      groups.push({
        tipo: 'borrador_otro',
        count: otherStale.length,
        titulo:
          otherStale.length === 1
            ? '1 otro documento con más de 72 horas en borrador'
            : `${otherStale.length} otros documentos con más de 72 horas en borrador`,
        subtitulo: 'Pendientes de finalizar',
        items: otherStale,
      });
    }

    return groups;
  }

  private resolveActorEvent(
    doc: RawDoc,
    actorIdSet: Set<string>,
  ): { at: Date; actorId: string } | null {
    const updatedBy = String(doc.updatedBy ?? '');
    const createdBy = String(doc.createdBy ?? '');
    const updatedAt = doc.updatedAt;
    const createdAt = doc.createdAt;

    const updatedOk = updatedAt && this.isActor(doc.updatedBy, actorIdSet);
    const createdOk = createdAt && this.isActor(doc.createdBy, actorIdSet);

    if (updatedOk && createdOk) {
      if (updatedAt >= createdAt) {
        return { at: updatedAt, actorId: updatedBy };
      }
      return { at: createdAt, actorId: createdBy };
    }
    if (updatedOk) {
      return { at: updatedAt, actorId: updatedBy };
    }
    if (createdOk) {
      return { at: createdAt, actorId: createdBy };
    }
    return null;
  }

  private isInWindow(value: Date | undefined, start: Date, end: Date): boolean {
    if (!value) return false;
    return value >= start && value < end;
  }

  private isActor(
    value: Types.ObjectId | undefined,
    actorIdSet: Set<string>,
  ): boolean {
    if (!value) return false;
    return actorIdSet.has(String(value));
  }
}
