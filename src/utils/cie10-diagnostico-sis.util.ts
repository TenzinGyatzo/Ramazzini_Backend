/**
 * Utilidades DIAGNOSTICO_SIS para validación de códigos CIE-10 (CEX / nota médica).
 */

import {
  addCatalogAgeLimit,
  parseCatalogAgeLimit,
} from './cie10-age-parser.util';
import { extractCIE10Code } from './cie10.util';

/** Parsea lista de tipo personal desde columnas TIPO_PERSONAL_* del catálogo. */
export function parseTipoPersonalCeList(
  raw: string | null | undefined,
): number[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim().toUpperCase();
  if (trimmed === '' || trimmed === 'NO') return [];
  return trimmed
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

/** Código CIE-10 de exactamente 4 caracteres (sin punto), mayúsculas. */
export function isCIE10Exact4Chars(code: string | null | undefined): boolean {
  if (!code) return false;
  const extracted = extractCIE10Code(code);
  if (!extracted) return false;
  const normalized = extracted.replace(/\./g, '').toUpperCase();
  return /^[A-Z0-9]{4}$/.test(normalized);
}

/** Normaliza a CATALOG_KEY de 4 caracteres o cadena vacía si inválido. */
export function normalizeCie10CatalogKey(
  code: string | null | undefined,
): string {
  if (!code) return '';
  let extracted = extractCIE10Code(code);
  if (!extracted) {
    const codePart = code.includes(' - ')
      ? code.split(' - ')[0].trim()
      : code.trim();
    extracted = codePart.split(/\s+/)[0].trim().toUpperCase();
  }
  const normalized = extracted.replace(/\./g, '').toUpperCase();
  return /^[A-Z0-9]{4}$/.test(normalized) ? normalized : '';
}

export type SexoBiologicoGiis = 1 | 2 | 3;

/**
 * Valida restricción LSEX (DIAGNOSTICO_SIS: HOMBRE | MUJER | NO).
 * Si sexoBiologico = 3 (intersexual) o no es mapeable, no aplica.
 */
export function isSexAllowedForLsex(
  lsex: string | null | undefined,
  sexoBiologico: SexoBiologicoGiis | null,
): boolean {
  if (sexoBiologico === 3) return true;
  if (!lsex || lsex.trim().toUpperCase() === 'NO') return true;
  if (sexoBiologico === null) return true;

  const lsexUpper = lsex.trim().toUpperCase();
  const sexoLabel =
    sexoBiologico === 1 ? 'HOMBRE' : sexoBiologico === 2 ? 'MUJER' : null;
  if (!sexoLabel) return true;
  if (lsexUpper === 'HOMBRE' || lsexUpper === 'MUJER') {
    return lsexUpper === sexoLabel;
  }
  return true;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Valida edad contra LINF/LSUP en la unidad del catálogo (D/M/A).
 * Compara fechas de calendario: fechaNotaMedica vs nacimiento + límite.
 * Intervalo cerrado: el día exacto del límite es válido.
 */
export function isAgeAllowedForLinfLsup(
  linf: string | null | undefined,
  lsup: string | null | undefined,
  fechaNacimiento: Date | null | undefined,
  fechaNotaMedica: Date | null | undefined,
): boolean {
  if (!fechaNacimiento || !fechaNotaMedica) return true;
  if (isNaN(fechaNacimiento.getTime()) || isNaN(fechaNotaMedica.getTime())) {
    return true;
  }

  const birth = startOfDay(fechaNacimiento);
  const ref = startOfDay(fechaNotaMedica);
  const linfParsed = parseCatalogAgeLimit(linf);
  const lsupParsed = parseCatalogAgeLimit(lsup);

  if (linfParsed) {
    const minDate = addCatalogAgeLimit(birth, linfParsed);
    if (ref.getTime() < minDate.getTime()) return false;
  }
  if (lsupParsed) {
    const maxDate = addCatalogAgeLimit(birth, lsupParsed);
    if (ref.getTime() > maxDate.getTime()) return false;
  }
  return true;
}

/**
 * Valida tipoPersonal vs TIPO_PERSONAL_1VEZ_CE / TIPO_PERSONAL_SUBSEC_CE
 * según relacionTemporal (0=primera vez, 1=subsecuente) — codigoCIEDiagnostico1.
 */
/** Familia R69 (morbilidad no especificada): permite repetir diag2/diag3 respecto al reference. */
export function isR69XFamily(code: string | null | undefined): boolean {
  const key = normalizeCie10CatalogKey(code);
  if (!key) return false;
  return key.startsWith('R69');
}

/** Normaliza primeraVezDiagnostico2/3: -1=no aplica, 0/1=activo. */
export function normalizePrimeraVezDiagnostico(value: unknown): -1 | 0 | 1 {
  if (value === 0 || value === 1) return value;
  return -1;
}

/** true solo cuando el usuario registró comorbilidad (primera vez 0 o 1). */
export function isPrimeraVezComorbilidadActiva(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
}

export function tieneComorbilidadDiagRegistrada(
  primeraVez: unknown,
  codigo?: string | null,
): boolean {
  if (isPrimeraVezComorbilidadActiva(primeraVez)) return true;
  return !!codigo?.trim();
}

export function isTipoPersonalAllowedForDiagnostico1(
  relacionTemporal: number | null | undefined,
  tipoPersonal: number | null | undefined,
  tipoPersonal1VezCe: number[],
  tipoPersonalSubsecCe: number[],
): {
  allowed: boolean;
  requiresTipoPersonal: boolean;
  emptyAuthorizedList: boolean;
} {
  if (relacionTemporal !== 0 && relacionTemporal !== 1) {
    return {
      allowed: true,
      requiresTipoPersonal: false,
      emptyAuthorizedList: false,
    };
  }
  const list =
    relacionTemporal === 0 ? tipoPersonal1VezCe : tipoPersonalSubsecCe;
  if (list.length === 0) {
    return {
      allowed: false,
      requiresTipoPersonal: true,
      emptyAuthorizedList: true,
    };
  }
  if (tipoPersonal == null) {
    return {
      allowed: false,
      requiresTipoPersonal: true,
      emptyAuthorizedList: false,
    };
  }
  return {
    allowed: list.includes(tipoPersonal),
    requiresTipoPersonal: true,
    emptyAuthorizedList: false,
  };
}
