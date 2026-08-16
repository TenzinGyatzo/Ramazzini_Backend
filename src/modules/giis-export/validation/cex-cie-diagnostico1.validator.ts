/**
 * Validación CEX de codigoCIEDiagnostico1 al exportar (post-mapper).
 */

import { CatalogsService } from '../../catalogs/catalogs.service';
import { CatalogType, CIE10Entry } from '../../catalogs/interfaces/catalog-entry.interface';
import {
  isAgeAllowedForLinfLsup,
  isCIE10Exact4Chars,
  isSexAllowedForLsex,
  isTipoPersonalAllowedForDiagnostico1,
  normalizeCie10CatalogKey,
  SexoBiologicoGiis,
} from '../../../utils/cie10-diagnostico-sis.util';

function getNum(
  row: Record<string, string | number>,
  field: string,
): number | null {
  const v = row[field];
  if (v === undefined || v === null) return null;
  const n = typeof v === 'number' ? v : parseInt(String(v).trim(), 10);
  return Number.isNaN(n) ? null : n;
}

function getStr(row: Record<string, string | number>, field: string): string {
  const v = row[field];
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

export async function validateCexCodigoCIEDiagnostico1Row(
  row: Record<string, string | number>,
  catalogsService: CatalogsService,
): Promise<string | null> {
  const raw = getStr(row, 'codigoCIEDiagnostico1');
  if (!raw) return 'Campo obligatorio vacío';

  if (!isCIE10Exact4Chars(raw)) {
    return 'El código debe tener exactamente 4 caracteres (CATALOG_KEY DIAGNOSTICO_SIS)';
  }

  const catalogKey = normalizeCie10CatalogKey(raw);
  const entry = (await catalogsService.getCatalogEntry(
    CatalogType.CIE10,
    catalogKey,
  )) as CIE10Entry | null;

  if (!entry) {
    return `Código ${catalogKey} no encontrado en catálogo DIAGNOSTICO_SIS`;
  }

  const sexoBiologico = getNum(row, 'sexoBiologico') as SexoBiologicoGiis | null;
  const relacionTemporal = getNum(row, 'relacionTemporal');
  const tipoPersonal = getNum(row, 'tipoPersonal');

  if (
    sexoBiologico != null &&
    !isSexAllowedForLsex(entry.lsex, sexoBiologico)
  ) {
    return `Código ${catalogKey}: restricción LSEX no cumplida para sexoBiologico=${sexoBiologico}`;
  }

  // Edad: requiere fechaNacimiento + fechaConsulta en fila CEX; si no hay edad, omitir
  // La validación de edad en export se delega a pre-validación de nota médica;
  // aquí solo validamos si el catálogo tiene límites y tenemos edad implícita vía row — no disponible.
  // Se valida tipo personal vs temporalidad (regla principal CEX diag1).

  if (tipoPersonal != null || relacionTemporal === 0 || relacionTemporal === 1) {
    const tpCheck = isTipoPersonalAllowedForDiagnostico1(
      relacionTemporal,
      tipoPersonal,
      entry.tipoPersonal1VezCe ?? [],
      entry.tipoPersonalSubsecCe ?? [],
    );
    if (!tpCheck.allowed) {
      if (tpCheck.requiresTipoPersonal && tipoPersonal == null) {
        return `tipoPersonal requerido para validar ${catalogKey}`;
      }
      const temporal =
        relacionTemporal === 1 ? 'subsecuente' : 'primera vez';
      return `tipoPersonal ${tipoPersonal} no autorizado para ${catalogKey} (${temporal})`;
    }
  }

  return null;
}

/** Valida edad en export con fechas de nacimiento y consulta. */
export function validateCexCodigoCIEDiagnostico1Age(
  catalogKey: string,
  entry: CIE10Entry,
  fechaNacimiento: Date | null,
  fechaNotaMedica: Date | null,
  sexoBiologico: SexoBiologicoGiis | null,
): string | null {
  if (
    sexoBiologico != null &&
    !isSexAllowedForLsex(entry.lsex, sexoBiologico)
  ) {
    return `Código ${catalogKey}: restricción LSEX`;
  }
  if (
    !isAgeAllowedForLinfLsup(
      entry.linfRaw,
      entry.lsupRaw,
      fechaNacimiento,
      fechaNotaMedica,
    )
  ) {
    return `Código ${catalogKey}: edad fuera de rango LINF/LSUP`;
  }
  return null;
}
