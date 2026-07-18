import { Model } from 'mongoose';
import { Trabajador } from '../../trabajadores/schemas/trabajador.schema';
import { CentroTrabajo } from '../../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from '../../empresas/schemas/empresa.schema';
import {
  RegulatoryPolicy,
  RegulatoryPolicyService,
} from '../../../utils/regulatory-policy.service';
import { getProveedorSaludIdFromTrabajador } from '../../../utils/helpers/treatment-consent.helper';
import { validateFechaDocumento } from './date-validators';

export interface DocumentDateE1Deps {
  trabajadorModel: Model<Trabajador>;
  centroTrabajoModel: Model<CentroTrabajo>;
  empresaModel: Model<Empresa>;
  regulatoryPolicyService: RegulatoryPolicyService;
}

/**
 * Valida regla E1 (fecha no futura y coherencia con nacimiento) según régimen.
 * - SIRES_NOM024: bloquea fecha futura y fecha anterior a nacimiento.
 * - SIN_REGIMEN + notaMedica: solo coherencia con nacimiento (permite futura).
 * - SIN_REGIMEN + otros: sin validación E1.
 */
export async function validateDocumentDateE1ForRegime(
  deps: DocumentDateE1Deps,
  params: {
    trabajadorId: string;
    fechaDocumento: Date | string;
    documentType?: string;
    /** Pre-resueltos para evitar lecturas duplicadas en el mismo request */
    proveedorSaludId?: string | null;
    policy?: Pick<RegulatoryPolicy, 'regime'> | null;
    fechaNacimiento?: Date | null;
  },
): Promise<void> {
  const { trabajadorId, fechaDocumento, documentType } = params;

  const proveedorSaludId =
    params.proveedorSaludId !== undefined
      ? params.proveedorSaludId
      : await getProveedorSaludIdFromTrabajador(
          trabajadorId,
          deps.trabajadorModel,
          deps.centroTrabajoModel,
          deps.empresaModel,
        );

  if (!proveedorSaludId) {
    return;
  }

  const policy =
    params.policy ??
    (await deps.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId));

  let fechaNacimiento: Date | null;
  if (params.fechaNacimiento !== undefined) {
    fechaNacimiento = params.fechaNacimiento;
  } else {
    const trabajador = await deps.trabajadorModel
      .findById(trabajadorId)
      .lean();
    fechaNacimiento = trabajador?.fechaNacimiento ?? null;
  }

  if (policy.regime === 'SIRES_NOM024') {
    validateFechaDocumento(fechaDocumento, fechaNacimiento);
    return;
  }

  if (documentType === 'notaMedica' && fechaNacimiento) {
    validateFechaDocumento(fechaDocumento, fechaNacimiento, {
      rejectFuture: false,
    });
  }
}
