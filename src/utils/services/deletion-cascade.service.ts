import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { CentroTrabajo } from 'src/modules/centros-trabajo/entities/centros-trabajo.entity';
import { Trabajador } from 'src/modules/trabajadores/schemas/trabajador.schema';
import {
  EXPEDIENTE_DOCUMENT_MODEL_NAMES,
  WORKER_LINKED_COLLECTIONS,
} from 'src/modules/trabajadores/constants/worker-linked-collections.constant';
import { DocumentoEstado } from 'src/modules/expedientes/enums/documento-estado.enum';

const RESGUARDED_ESTADOS = [
  DocumentoEstado.FINALIZADO,
  DocumentoEstado.ANULADO,
];

/** Modelos con ciclo de vida BORRADOR/FINALIZADO/ANULADO a considerar en el gate. */
const RESGUARDED_MODEL_NAMES = new Set<string>([
  ...EXPEDIENTE_DOCUMENT_MODEL_NAMES,
  'Deteccion',
]);

@Injectable()
export class DeletionCascadeService {
  private readonly logger = new Logger(DeletionCascadeService.name);

  constructor(
    @InjectModel(CentroTrabajo.name)
    private readonly centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(Trabajador.name)
    private readonly trabajadorModel: Model<Trabajador>,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

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

  async countResguardedDocsByCentro(centroId: string): Promise<number> {
    const trabajadores = await this.trabajadorModel
      .find({ idCentroTrabajo: centroId })
      .select('_id')
      .lean()
      .exec();
    return this.countResguardedDocsForTrabajadorIds(
      this.toObjectIds(trabajadores.map((t) => t._id)),
    );
  }

  async countResguardedDocsByEmpresa(empresaId: string): Promise<number> {
    const centros = await this.centroTrabajoModel
      .find({ idEmpresa: empresaId })
      .select('_id')
      .lean()
      .exec();
    if (centros.length === 0) {
      return 0;
    }
    const centroIds = this.toObjectIds(centros.map((c) => c._id));
    const trabajadores = await this.trabajadorModel
      .find({ idCentroTrabajo: { $in: centroIds } })
      .select('_id')
      .lean()
      .exec();
    return this.countResguardedDocsForTrabajadorIds(
      this.toObjectIds(trabajadores.map((t) => t._id)),
    );
  }

  private async countResguardedDocsForTrabajadorIds(
    trabajadorIds: Types.ObjectId[],
  ): Promise<number> {
    if (trabajadorIds.length === 0) {
      return 0;
    }

    const configs = WORKER_LINKED_COLLECTIONS.filter((c) =>
      RESGUARDED_MODEL_NAMES.has(c.modelName),
    );

    const counts = await Promise.all(
      configs.map(async (config) => {
        const filter = {
          [config.fkField]: { $in: trabajadorIds },
          estado: { $in: RESGUARDED_ESTADOS },
        };

        const registered = this.connection.models?.[config.modelName];
        if (registered) {
          return registered.countDocuments(filter).exec();
        }

        // Fallback si el modelo aún no está registrado en esta conexión
        try {
          return await this.connection
            .collection(config.collectionName)
            .countDocuments(filter);
        } catch (err) {
          this.logger.warn(
            `No se pudo contar docs resguardados en ${config.collectionName}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
          return 0;
        }
      }),
    );

    const total = counts.reduce((sum, n) => sum + n, 0);
    if (total > 0) {
      this.logger.debug(
        `Docs resguardados encontrados: ${total} (trabajadores=${trabajadorIds.length})`,
      );
    }
    return total;
  }

  private toObjectIds(ids: unknown[]): Types.ObjectId[] {
    return ids
      .map((id) => {
        try {
          return new Types.ObjectId(String(id));
        } catch {
          return null;
        }
      })
      .filter((id): id is Types.ObjectId => id != null);
  }
}
