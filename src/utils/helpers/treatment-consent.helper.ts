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

export async function getProveedorSaludIdFromTrabajador(
  trabajadorId: string,
  trabajadorModel: Model<Trabajador>,
  centroTrabajoModel: Model<CentroTrabajo>,
  empresaModel: Model<Empresa>,
): Promise<string | null> {
  try {
    const trabajador = await trabajadorModel.findById(trabajadorId).lean();
    if (!trabajador || !trabajador.idCentroTrabajo) {
      return null;
    }

    const centroTrabajo = await centroTrabajoModel
      .findById(trabajador.idCentroTrabajo)
      .lean();
    if (!centroTrabajo || !centroTrabajo.idEmpresa) {
      return null;
    }

    const empresa = await empresaModel.findById(centroTrabajo.idEmpresa).lean();
    if (!empresa || !empresa.idProveedorSalud) {
      return null;
    }

    return empresa.idProveedorSalud.toString();
  } catch {
    return null;
  }
}
