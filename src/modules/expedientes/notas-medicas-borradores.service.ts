import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotaMedica } from './schemas/nota-medica.schema';
import { DocumentoEstado } from './enums/documento-estado.enum';
import { UsersService } from '../users/users.service';
import { Trabajador } from '../trabajadores/schemas/trabajador.schema';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from '../empresas/schemas/empresa.schema';
import { WorkerFusionService } from '../trabajadores/worker-fusion.service';
import { OrganizationalAccessService } from '../../utils/organizational-access.service';
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';
import { CatalogsService } from '../catalogs/catalogs.service';
import { ProveedoresSaludService } from '../proveedores-salud/proveedores-salud.service';
import { formatCLUES } from '../giis-export/formatters/field.formatter';
import {
  calendarYearBounds,
  esPrimeraVezAnioSiNoHayOtraFinalizada,
} from '../giis-export/utils/primera-vez-anio.util';
import {
  isCluesSentinelOrEmpty,
  isEstablecimientoEspecializadoSis,
} from '../giis-export/utils/primera-vez-uneme.util';
import {
  BorradorPendienteItem,
  BorradorPendienteNivelUrgencia,
  BorradoresPendientesResponse,
} from './interfaces/borrador-pendiente.interface';

const STALE_HOURS = Number(process.env.BORRADORES_NM_STALE_HOURS ?? 72);
const PRINCIPAL_DAYS = Number(process.env.BORRADORES_NM_PRINCIPAL_DAYS ?? 7);
const CRITICAL_DAYS = Number(process.env.BORRADORES_NM_CRITICAL_DAYS ?? 14);
const MAX_ITEMS = 50;

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

@Injectable()
export class NotasMedicasBorradoresService {
  constructor(
    @InjectModel(NotaMedica.name)
    private readonly notaMedicaModel: Model<NotaMedica>,
    @InjectModel(Trabajador.name)
    private readonly trabajadorModel: Model<Trabajador>,
    @InjectModel(CentroTrabajo.name)
    private readonly centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(Empresa.name)
    private readonly empresaModel: Model<Empresa>,
    private readonly usersService: UsersService,
    private readonly workerFusionService: WorkerFusionService,
    private readonly organizationalAccessService: OrganizationalAccessService,
    @Inject(forwardRef(() => RegulatoryPolicyService))
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
    private readonly catalogsService: CatalogsService,
    private readonly proveedoresSaludService: ProveedoresSaludService,
  ) {}

  private buildEmptyResponse(): BorradoresPendientesResponse {
    return {
      propios: [],
      equipo: [],
      resumen: {
        totalPropios: 0,
        totalEquipo: 0,
        nivelMaximo: 'info',
      },
    };
  }

  async findBorradoresPendientes(userId: string): Promise<BorradoresPendientesResponse> {
    const user = await this.usersService.findById(
      userId,
      'role idProveedorSalud centrosTrabajoAsignados permisos',
    );
    if (!user?.idProveedorSalud) {
      throw new UnauthorizedException(
        'Usuario sin proveedor de salud asociado',
      );
    }

    const proveedorSaludId = String(user.idProveedorSalud);

    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    if (policy.regime !== 'SIRES_NOM024') {
      return this.buildEmptyResponse();
    }

    const now = Date.now();
    const staleCutoff = new Date(now - STALE_HOURS * MS_PER_HOUR);
    const principalCutoff = new Date(now - PRINCIPAL_DAYS * MS_PER_DAY);

    const propiosDocs = await this.notaMedicaModel
      .find({
        createdBy: new Types.ObjectId(userId),
        estado: DocumentoEstado.BORRADOR,
        createdAt: { $lt: staleCutoff },
      })
      .sort({ createdAt: 1 })
      .limit(MAX_ITEMS)
      .populate('createdBy', '_id username')
      .lean()
      .exec();

    let equipoDocs: any[] = [];
    if (user.role === 'Principal') {
      const trabajadorIds = await this.getTrabajadorIdsForTenant(proveedorSaludId);
      if (trabajadorIds.length > 0) {
        equipoDocs = await this.notaMedicaModel
          .find({
            idTrabajador: { $in: trabajadorIds },
            estado: DocumentoEstado.BORRADOR,
            createdAt: { $lt: principalCutoff },
            createdBy: { $ne: new Types.ObjectId(userId) },
          })
          .sort({ createdAt: 1 })
          .limit(MAX_ITEMS)
          .populate('createdBy', '_id username')
          .lean()
          .exec();
      }
    }

    const propios = await this.mapDocumentsToItems(
      propiosDocs,
      userId,
      now,
      false,
    );
    const equipo = await this.mapDocumentsToItems(
      equipoDocs,
      userId,
      now,
      true,
    );

    const nivelMaximo = this.resolveNivelMaximo([
      ...propios.map((item) => item.nivelUrgencia),
      ...equipo.map((item) => item.nivelUrgencia),
    ]);

    return {
      propios,
      equipo,
      resumen: {
        totalPropios: propios.length,
        totalEquipo: equipo.length,
        nivelMaximo,
      },
    };
  }

  private async getTrabajadorIdsForTenant(
    proveedorSaludId: string,
  ): Promise<Types.ObjectId[]> {
    const empresas = await this.empresaModel
      .find({ idProveedorSalud: proveedorSaludId })
      .select('_id')
      .lean()
      .exec();
    if (empresas.length === 0) {
      return [];
    }

    const empresaIds = empresas.map((empresa) => empresa._id);
    const centros = await this.centroTrabajoModel
      .find({ idEmpresa: { $in: empresaIds } })
      .select('_id')
      .lean()
      .exec();
    if (centros.length === 0) {
      return [];
    }

    const centroIds = centros.map((centro) => centro._id);
    const trabajadores = await this.trabajadorModel
      .find({ idCentroTrabajo: { $in: centroIds } })
      .select('_id')
      .lean()
      .exec();

    return trabajadores.map(
      (trabajador) => new Types.ObjectId(String(trabajador._id)),
    );
  }

  private async mapDocumentsToItems(
    docs: any[],
    actorUserId: string,
    now: number,
    includeElaborador: boolean,
  ): Promise<BorradorPendienteItem[]> {
    const items: BorradorPendienteItem[] = [];

    for (const doc of docs) {
      const item = await this.buildItem(doc, now, includeElaborador);
      if (!item) {
        continue;
      }

      try {
        await this.organizationalAccessService.assertUserCanAccessTrabajador(
          actorUserId,
          item.idEmpresa,
          item.idTrabajador,
        );
        items.push(item);
      } catch {
        // Defensa en profundidad: omitir ítems fuera del alcance del actor.
      }
    }

    return items;
  }

  async getContextoCex(params: {
    userId: string;
    trabajadorId: string;
    fechaNotaMedica: string;
    excludeDocumentoId?: string;
  }): Promise<{
    establecimientoEspecializado: boolean;
    esPrimeraVezAnio: boolean;
  }> {
    const { userId, trabajadorId, fechaNotaMedica, excludeDocumentoId } =
      params;

    if (!Types.ObjectId.isValid(trabajadorId)) {
      throw new BadRequestException('trabajadorId inválido');
    }
    if (
      excludeDocumentoId &&
      !Types.ObjectId.isValid(excludeDocumentoId)
    ) {
      throw new BadRequestException('excludeDocumentoId inválido');
    }

    const fecha = this.parseFechaNotaMedica(fechaNotaMedica);
    if (!fecha) {
      throw new BadRequestException('fechaNotaMedica inválida');
    }

    const user = await this.usersService.findById(userId, 'idProveedorSalud');
    if (!user?.idProveedorSalud) {
      throw new UnauthorizedException(
        'Usuario sin proveedor de salud asociado',
      );
    }

    const trabajador = await this.trabajadorModel.findById(trabajadorId).exec();
    if (!trabajador) {
      throw new ForbiddenException('Trabajador no encontrado');
    }
    const centro = await this.centroTrabajoModel
      .findById(trabajador.idCentroTrabajo)
      .select('idEmpresa')
      .exec();
    if (!centro) {
      throw new ForbiddenException(
        'No tiene permiso para acceder a este recurso',
      );
    }
    await this.organizationalAccessService.assertUserCanAccessTrabajador(
      userId,
      String(centro.idEmpresa),
      trabajadorId,
    );

    const proveedor = await this.proveedoresSaludService.findOne(
      String(user.idProveedorSalud),
    );
    const cluesRaw = proveedor?.clues?.trim() ?? '';
    const clues =
      formatCLUES(cluesRaw) ||
      (cluesRaw.length === 11 ? cluesRaw.toUpperCase() : '') ||
      '9998';
    const cluesEntry = isCluesSentinelOrEmpty(clues)
      ? null
      : await this.catalogsService.getCLUESEntry(clues);
    const establecimientoEspecializado =
      isEstablecimientoEspecializadoSis(cluesEntry);

    const year = fecha.getFullYear();
    const { start: startOfYear, end: endOfYear } = calendarYearBounds(year);
    const notasDelAnio = await this.notaMedicaModel
      .find({
        estado: DocumentoEstado.FINALIZADO,
        fechaNotaMedica: { $gte: startOfYear, $lte: endOfYear },
        idTrabajador: new Types.ObjectId(trabajadorId),
      })
      .select('_id')
      .lean()
      .exec();

    const esPrimeraVezAnio = esPrimeraVezAnioSiNoHayOtraFinalizada({
      existingIds: notasDelAnio.map((n) => n._id),
      candidateId: excludeDocumentoId ?? null,
    });

    return { establecimientoEspecializado, esPrimeraVezAnio };
  }

  private parseFechaNotaMedica(value: string): Date | null {
    if (!value || typeof value !== 'string') return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private async buildItem(
    doc: any,
    now: number,
    includeElaborador: boolean,
  ): Promise<BorradorPendienteItem | null> {
    const trabajadorId = String(doc.idTrabajador?._id ?? doc.idTrabajador ?? '');
    if (!trabajadorId) {
      return null;
    }

    let canonicalTrabajadorId: string;
    try {
      canonicalTrabajadorId =
        await this.workerFusionService.getCanonicalTrabajadorId(trabajadorId);
    } catch {
      return null;
    }

    const trabajador = await this.trabajadorModel
      .findById(canonicalTrabajadorId)
      .select('nombre primerApellido idCentroTrabajo')
      .lean()
      .exec();
    if (!trabajador) {
      return null;
    }

    const centro = await this.centroTrabajoModel
      .findById(trabajador.idCentroTrabajo)
      .select('idEmpresa')
      .lean()
      .exec();
    if (!centro) {
      return null;
    }

    const createdAt = new Date(doc.createdAt);
    const updatedAt = new Date(doc.updatedAt ?? doc.createdAt);
    const diasEnBorrador = this.daysBetween(createdAt.getTime(), now);
    const diasSinEdicion = this.daysBetween(updatedAt.getTime(), now);
    const nivelUrgencia = this.computeNivelUrgencia(
      diasEnBorrador,
      diasSinEdicion,
    );
    const trabajadorNombre = [trabajador.nombre, trabajador.primerApellido]
      .filter(Boolean)
      .join(' ')
      .trim();

    const createdBy = doc.createdBy;
    const elaborador =
      includeElaborador && createdBy
        ? {
            id: String(createdBy._id ?? createdBy),
            username: String(createdBy.username ?? 'Usuario'),
          }
        : undefined;

    const mensajeContextual = this.buildMensajeContextual(
      diasEnBorrador,
      diasSinEdicion,
      nivelUrgencia,
      trabajadorNombre,
      elaborador?.username,
      includeElaborador,
    );

    return {
      id: String(doc._id),
      idTrabajador: canonicalTrabajadorId,
      idCentroTrabajo: String(trabajador.idCentroTrabajo),
      idEmpresa: String(centro.idEmpresa),
      trabajadorNombre,
      fechaNotaMedica: new Date(doc.fechaNotaMedica).toISOString(),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      diasEnBorrador,
      diasSinEdicion,
      nivelUrgencia,
      mensajeContextual,
      elaborador,
    };
  }

  private daysBetween(fromMs: number, toMs: number): number {
    return Math.max(0, Math.floor((toMs - fromMs) / MS_PER_DAY));
  }

  private computeNivelUrgencia(
    diasEnBorrador: number,
    diasSinEdicion: number,
  ): BorradorPendienteNivelUrgencia {
    if (diasEnBorrador >= CRITICAL_DAYS) {
      return 'critical';
    }
    if (diasEnBorrador >= PRINCIPAL_DAYS) {
      return 'warning';
    }
    if (diasSinEdicion < 1) {
      return 'info';
    }
    return 'warning';
  }

  private buildMensajeContextual(
    diasEnBorrador: number,
    diasSinEdicion: number,
    nivelUrgencia: BorradorPendienteNivelUrgencia,
    trabajadorNombre: string,
    elaboradorUsername: string | undefined,
    includeElaborador: boolean,
  ): string {
    const diasLabel = diasEnBorrador === 1 ? '1 día' : `${diasEnBorrador} días`;

    if (includeElaborador && elaboradorUsername) {
      if (nivelUrgencia === 'critical') {
        return `Nota de ${trabajadorNombre}, elaborada por ${elaboradorUsername}, en borrador hace ${diasLabel} — requiere atención`;
      }
      return `Nota de ${trabajadorNombre}, elaborada por ${elaboradorUsername}, en borrador hace ${diasLabel}`;
    }

    if (diasEnBorrador < PRINCIPAL_DAYS && diasSinEdicion < 1) {
      return `Borrador de hace ${diasLabel}; última edición hoy`;
    }
    if (diasEnBorrador < PRINCIPAL_DAYS && diasSinEdicion === 1) {
      return `Borrador de hace ${diasLabel}; última edición ayer`;
    }
    if (nivelUrgencia === 'critical') {
      return `Borrador pendiente desde hace ${diasLabel} — requiere atención`;
    }
    if (diasEnBorrador >= PRINCIPAL_DAYS) {
      return `Borrador pendiente desde hace ${diasLabel}`;
    }
    return `Borrador sin finalizar desde hace ${diasLabel}`;
  }

  private resolveNivelMaximo(
    niveles: BorradorPendienteNivelUrgencia[],
  ): BorradorPendienteNivelUrgencia {
    if (niveles.includes('critical')) {
      return 'critical';
    }
    if (niveles.includes('warning')) {
      return 'warning';
    }
    return 'info';
  }
}
