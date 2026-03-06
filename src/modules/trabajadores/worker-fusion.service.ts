/**
 * Worker Fusion Service
 *
 * Handles detection and linking of duplicate worker registrations within the same company.
 * Used for NOM-024-SSA3-2012 compliance: when the same person is registered multiple
 * times (by omission or error), all records share the same unified expediente.
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Trabajador } from './schemas/trabajador.schema';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { isGenericCURP } from 'src/utils/curp-validator.util';
import { CreateTrabajadorDto } from './dto/create-trabajador.dto';

export const CURP_GENERICA = 'XXXX999999XXXXXX99';

@Injectable()
export class WorkerFusionService {
  constructor(
    @InjectModel(Trabajador.name) private trabajadorModel: Model<Trabajador>,
    @InjectModel(CentroTrabajo.name)
    private centroTrabajoModel: Model<CentroTrabajo>,
  ) {}

  /**
   * Finds a duplicate worker in the same company.
   * Match 1: CURP (both non-generic and equal)
   * Match 2: Folio (both have folio and equal)
   *
   * @returns The canonical worker (oldest in group) if duplicate found, null otherwise
   */
  async findDuplicateInEmpresa(
    trabajadorDto: CreateTrabajadorDto & { folio?: string },
    idCentroTrabajo: string,
  ): Promise<Trabajador | null> {
    const idEmpresa = await this.getIdEmpresaFromCentro(idCentroTrabajo);
    if (!idEmpresa) return null;

    const centroIds = await this.getCentroIdsByEmpresa(idEmpresa);
    if (centroIds.length === 0) return null;

    const workersInEmpresa = await this.trabajadorModel
      .find({ idCentroTrabajo: { $in: centroIds } })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    const newCurp = trabajadorDto.curp?.trim().toUpperCase();
    const newCurpIsReal = newCurp && !isGenericCURP(newCurp);
    const newFolio = trabajadorDto.folio;

    for (const existing of workersInEmpresa) {
      const existingId = (existing as any)._id?.toString();
      const existingCanonicalId = (existing as any).idTrabajadorCanonico?.toString();
      const canonicalId = existingCanonicalId || existingId;

      // Match 1: CURP (both non-generic and equal)
      if (newCurpIsReal) {
        const existingCurp = (existing as any).curp?.trim().toUpperCase();
        if (existingCurp && !isGenericCURP(existingCurp) && existingCurp === newCurp) {
          return (await this.trabajadorModel.findById(canonicalId).exec()) as Trabajador;
        }
      }

      // Match 2: Folio (both have folio and equal)
      if (newFolio) {
        const existingFolio = (existing as any).folio;
        if (existingFolio && existingFolio === newFolio) {
          return (await this.trabajadorModel.findById(canonicalId).exec()) as Trabajador;
        }
      }
    }

    return null;
  }

  /**
   * Resolves trabajadorId to the canonical worker ID.
   * If the worker has idTrabajadorCanonico, returns that; otherwise returns the given ID.
   */
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

  private async getIdEmpresaFromCentro(
    idCentroTrabajo: string,
  ): Promise<string | null> {
    const centro = await this.centroTrabajoModel
      .findById(idCentroTrabajo)
      .select('idEmpresa')
      .lean()
      .exec();

    if (!centro?.idEmpresa) return null;
    return (centro.idEmpresa as any)?.toString?.() ?? centro.idEmpresa.toString();
  }

  private async getCentroIdsByEmpresa(idEmpresa: string): Promise<Types.ObjectId[]> {
    const centros = await this.centroTrabajoModel
      .find({ idEmpresa: new Types.ObjectId(idEmpresa) })
      .select('_id')
      .lean()
      .exec();

    return centros.map((c) => (c as any)._id);
  }
}
