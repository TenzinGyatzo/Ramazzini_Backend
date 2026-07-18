import { ExecutionContext } from '@nestjs/common';
import { Model } from 'mongoose';
import { Trabajador } from '../../modules/trabajadores/schemas/trabajador.schema';
import { CentroTrabajo } from '../../modules/centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from '../../modules/empresas/schemas/empresa.schema';

/**
 * Extrae trabajadorId desde route params, body o query.
 */
export function extractTrabajadorId(context: ExecutionContext): string | null {
  const request = context.switchToHttp().getRequest();

  if (request.params?.trabajadorId) {
    return request.params.trabajadorId;
  }

  if (request.body?.trabajadorId) {
    return request.body.trabajadorId;
  }

  if (request.body?.idTrabajador) {
    return request.body.idTrabajador;
  }

  if (request.query?.trabajadorId) {
    return request.query.trabajadorId;
  }

  return null;
}

export interface TrabajadorProveedorChain {
  trabajador: Record<string, any> | null;
  centroTrabajo: Record<string, any> | null;
  empresa: Record<string, any> | null;
  proveedorSaludId: string | null;
}

/**
 * Resuelve trabajador → centro → empresa → proveedorSaludId en una sola pasada.
 */
export async function resolveTrabajadorProveedorChain(
  trabajadorId: string,
  trabajadorModel: Model<Trabajador>,
  centroTrabajoModel: Model<CentroTrabajo>,
  empresaModel: Model<Empresa>,
): Promise<TrabajadorProveedorChain> {
  try {
    const trabajador = await trabajadorModel.findById(trabajadorId).lean();
    if (!trabajador || !trabajador.idCentroTrabajo) {
      return {
        trabajador: trabajador ?? null,
        centroTrabajo: null,
        empresa: null,
        proveedorSaludId: null,
      };
    }

    const centroTrabajo = await centroTrabajoModel
      .findById(trabajador.idCentroTrabajo)
      .lean();
    if (!centroTrabajo || !centroTrabajo.idEmpresa) {
      return {
        trabajador,
        centroTrabajo: centroTrabajo ?? null,
        empresa: null,
        proveedorSaludId: null,
      };
    }

    const empresa = await empresaModel.findById(centroTrabajo.idEmpresa).lean();
    if (!empresa || !empresa.idProveedorSalud) {
      return {
        trabajador,
        centroTrabajo,
        empresa: empresa ?? null,
        proveedorSaludId: null,
      };
    }

    return {
      trabajador,
      centroTrabajo,
      empresa,
      proveedorSaludId: empresa.idProveedorSalud.toString(),
    };
  } catch {
    return {
      trabajador: null,
      centroTrabajo: null,
      empresa: null,
      proveedorSaludId: null,
    };
  }
}

export async function getProveedorSaludIdFromTrabajador(
  trabajadorId: string,
  trabajadorModel: Model<Trabajador>,
  centroTrabajoModel: Model<CentroTrabajo>,
  empresaModel: Model<Empresa>,
): Promise<string | null> {
  const chain = await resolveTrabajadorProveedorChain(
    trabajadorId,
    trabajadorModel,
    centroTrabajoModel,
    empresaModel,
  );
  return chain.proveedorSaludId;
}
