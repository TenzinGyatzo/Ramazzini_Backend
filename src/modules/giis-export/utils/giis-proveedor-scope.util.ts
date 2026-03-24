import { Model, Types } from 'mongoose';
import { Empresa } from '../../empresas/schemas/empresa.schema';
import { CentroTrabajo } from '../../centros-trabajo/schemas/centro-trabajo.schema';
import { Trabajador } from '../../trabajadores/schemas/trabajador.schema';

/**
 * IDs de trabajadores bajo el proveedor (tenant).
 * Cadena: ProveedorSalud → Empresas → CentrosTrabajo → Trabajadores.
 */
export async function getTrabajadorIdsForProveedor(
  proveedorSaludId: string,
  empresaModel: Model<Empresa>,
  centroTrabajoModel: Model<CentroTrabajo>,
  trabajadorModel: Model<Trabajador>,
): Promise<Types.ObjectId[]> {
  const empresas = await empresaModel
    .find({ idProveedorSalud: proveedorSaludId })
    .select('_id')
    .lean()
    .exec();
  const empresaIds = empresas.map((e) => e._id);
  if (empresaIds.length === 0) return [];

  const centros = await centroTrabajoModel
    .find({ idEmpresa: { $in: empresaIds } })
    .select('_id')
    .lean()
    .exec();
  const centroIds = centros.map((c) => c._id);
  if (centroIds.length === 0) return [];

  const trabajadores = await trabajadorModel
    .find({ idCentroTrabajo: { $in: centroIds } })
    .select('_id')
    .lean()
    .exec();
  return trabajadores.map((t) => t._id as unknown as Types.ObjectId);
}
