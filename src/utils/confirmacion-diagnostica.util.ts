/**
 * Reglas CEX confirmacionDiagnostica1/2/3 (Fe de Erratas GIIS-B015).
 */

/** tipoPersonal médico autorizado para confirmación diagnóstica */
export const TIPO_PERSONAL_MEDICO_CONFIRMACION = [
  1, 2, 3, 4, 19, 24,
] as const;

export interface DiagCatalogFlags {
  diaCronicos: boolean;
  diaCaInfantil: boolean;
}

export function parseCatalogSiFlag(
  raw: string | boolean | null | undefined,
): boolean {
  if (typeof raw === 'boolean') return raw;
  if (raw == null) return false;
  return String(raw).trim().toUpperCase() === 'SI';
}

export function isTipoPersonalMedicoConfirmacion(
  tipoPersonal: number | null | undefined,
): boolean {
  if (tipoPersonal == null) return false;
  return (TIPO_PERSONAL_MEDICO_CONFIRMACION as readonly number[]).includes(
    tipoPersonal,
  );
}

export function calcularEdadAnios(
  fechaNacimiento?: Date | null,
  fechaReferencia?: Date | null,
): number | null {
  if (!fechaNacimiento || !fechaReferencia) return null;
  const fn = new Date(fechaNacimiento);
  const fr = new Date(fechaReferencia);
  if (isNaN(fn.getTime()) || isNaN(fr.getTime())) return null;
  let edad = fr.getFullYear() - fn.getFullYear();
  const m = fr.getMonth() - fn.getMonth();
  if (m < 0 || (m === 0 && fr.getDate() < fn.getDate())) edad--;
  return edad;
}

export interface AplicaConfirmacionDiagnostico1Params {
  tipoPersonal: number | null | undefined;
  edad: number | null;
  flags: DiagCatalogFlags | null | undefined;
  relacionTemporal: number | null | undefined;
}

export interface AplicaConfirmacionDiagnostico23Params {
  tipoPersonal: number | null | undefined;
  edad: number | null;
  flags: DiagCatalogFlags | null | undefined;
  primeraVezDiagnostico: number | null | undefined;
}

function aplicaPorEdadYFlags(
  edad: number,
  flags: DiagCatalogFlags,
  requierePrimeraVez: boolean,
  primeraVezActiva: boolean,
): boolean {
  if (edad < 18) return flags.diaCaInfantil;
  if (edad >= 20) {
    return requierePrimeraVez && primeraVezActiva && flags.diaCronicos;
  }
  return false;
}

/** confirmacionDiagnostica1 — relacionTemporal = 0 (primera vez) */
export function aplicaConfirmacionDiagnostico1(
  params: AplicaConfirmacionDiagnostico1Params,
): boolean {
  if (!isTipoPersonalMedicoConfirmacion(params.tipoPersonal)) return false;
  if (params.edad == null || !params.flags) return false;
  return aplicaPorEdadYFlags(
    params.edad,
    params.flags,
    true,
    params.relacionTemporal === 0,
  );
}

/** confirmacionDiagnostica2/3 — primeraVezDiagnosticoN = 1 */
export function aplicaConfirmacionDiagnostico23(
  params: AplicaConfirmacionDiagnostico23Params,
): boolean {
  if (!isTipoPersonalMedicoConfirmacion(params.tipoPersonal)) return false;
  if (params.edad == null || !params.flags) return false;
  return aplicaPorEdadYFlags(
    params.edad,
    params.flags,
    true,
    params.primeraVezDiagnostico === 1,
  );
}

export function toCexConfirmacionDiagnosticaValue(
  aplica: boolean,
  valor: boolean | null | undefined,
): -1 | 0 | 1 {
  if (!aplica) return -1;
  return valor === true ? 1 : 0;
}

export function isConfirmacionDiagnosticaValorValido(
  aplica: boolean,
  valor: boolean | null | undefined,
): boolean {
  if (!aplica) return valor === undefined || valor === null;
  return valor === true || valor === false;
}
