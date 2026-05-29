/**
 * GIIS Field Formatter
 *
 * Utility functions for formatting individual fields in GIIS export records.
 * Handles null/undefined values, arrays, and special characters.
 */

/**
 * Safely convert any value to a GIIS-safe string
 *
 * Rules:
 * - null/undefined -> empty string
 * - Arrays -> joined with '&'
 * - Numbers -> string representation
 * - Strings -> trimmed
 * - Objects -> empty string (not supported)
 *
 * @param value - Any value to convert
 * @returns GIIS-safe string
 *
 * @example
 * toGIISString(null) // ''
 * toGIISString(123) // '123'
 * toGIISString('test') // 'test'
 * toGIISString([1,2,3]) // '1&2&3'
 */
export function toGIISString(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return toGIISMultiValue(value);
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }

  // Objects and other types are not supported
  return '';
}

/**
 * Convert an array to GIIS multi-value format (joined by '&')
 *
 * @param values - Array of values
 * @returns String with values joined by '&', or empty string if empty/null
 *
 * @example
 * toGIISMultiValue([1, 2, 3]) // '1&2&3'
 * toGIISMultiValue(['a', 'b']) // 'a&b'
 * toGIISMultiValue([]) // ''
 * toGIISMultiValue(null) // ''
 */
export function toGIISMultiValue(values: any[] | null | undefined): string {
  if (!values || !Array.isArray(values) || values.length === 0) {
    return '';
  }

  return values
    .filter((v) => v !== null && v !== undefined)
    .map((v) => String(v).trim())
    .filter((v) => v !== '')
    .join('&');
}

/**
 * Join multiple fields into a GIIS pipe-delimited record
 *
 * @param fields - Array of field values
 * @returns Pipe-delimited string
 *
 * @example
 * joinGIISFields(['A', 'B', '', 'D']) // 'A|B||D'
 * joinGIISFields([null, 'X', undefined]) // '|X|'
 */
export function joinGIISFields(fields: any[]): string {
  return fields.map((f) => toGIISString(f)).join('|');
}

/**
 * Pad a numeric value to a specific length with leading zeros
 *
 * @param value - Numeric value
 * @param length - Desired length
 * @returns Padded string or empty string if null/undefined
 *
 * @example
 * padNumber(5, 2) // '05'
 * padNumber(123, 5) // '00123'
 * padNumber(null, 2) // ''
 */
export function padNumber(
  value: number | string | null | undefined,
  length: number,
): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  return String(value).padStart(length, '0');
}

/**
 * Format a CURP value (uppercase, 18 chars)
 *
 * @param curp - CURP string
 * @returns Formatted CURP or empty string
 */
export function formatCURP(curp: string | null | undefined): string {
  if (!curp) return '';
  const cleaned = curp.trim().toUpperCase();
  // CURP should be exactly 18 characters
  return cleaned.length === 18 ? cleaned : '';
}

/**
 * Format a CLUES value (uppercase, 11 chars)
 *
 * @param clues - CLUES string
 * @returns Formatted CLUES or empty string
 */
export function formatCLUES(clues: string | null | undefined): string {
  if (!clues) return '';
  const cleaned = clues.trim().toUpperCase();
  // CLUES should be exactly 11 characters
  return cleaned.length === 11 ? cleaned : '';
}

/**
 * Format a CIE-10 code (uppercase)
 *
 * @param code - CIE-10 code
 * @returns Formatted code or empty string
 */
export function formatCIE10(code: string | null | undefined): string {
  if (!code) return '';
  return code.trim().toUpperCase();
}

/**
 * Normalize CIE-10 code to 4 characters for GIIS LES export.
 * Removes dot (e.g. S00.0 -> S000), pads or truncates to 4 chars.
 *
 * @param code - CIE-10 code (e.g. S00.0, V01, W17)
 * @returns 4-char code (e.g. S000, V010, W170)
 */
export function normalizeCIE10To4Chars(
  code: string | null | undefined,
): string {
  if (!code || typeof code !== 'string') return '';
  const cleaned = code.trim().toUpperCase().replace(/\./g, '');
  if (!cleaned) return '';
  return cleaned.padEnd(4, '0').slice(0, 4);
}

/**
 * Convert a result enum (0=Positivo, 1=Negativo, -1=NA) to GIIS format
 *
 * @param value - Result value
 * @returns String representation or empty string
 */
export function formatResultEnum(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (value === -1) return ''; // NA -> empty
  return String(value);
}

/** Acentos (sin diéresis) → letra base. Diéresis en vocal (ä, ë, ï, ö, ü) se conservan. */
const GIIS_NAME_ACCENT_MAP: Record<string, string> = {
  á: 'A',
  à: 'A',
  â: 'A',
  Á: 'A',
  À: 'A',
  Â: 'A',
  é: 'E',
  è: 'E',
  ê: 'E',
  É: 'E',
  È: 'E',
  Ê: 'E',
  í: 'I',
  ì: 'I',
  î: 'I',
  Í: 'I',
  Ì: 'I',
  Î: 'I',
  ó: 'O',
  ò: 'O',
  ô: 'O',
  Ó: 'O',
  Ò: 'O',
  Ô: 'O',
  ú: 'U',
  ù: 'U',
  û: 'U',
  Ú: 'U',
  Ù: 'U',
  Û: 'U',
  ñ: 'Ñ',
  Ñ: 'Ñ',
};

/** Caracteres permitidos en nombres GIIS: A-Z, Ñ, diéresis en vocal, espacio, - , . / ' ¨ */
const GIIS_NAME_ALLOWED = /^[A-ZÑÄËÏÖÜ\s\-,\.\/'¨]$/u;

/**
 * Normaliza un nombre o apellido al formato GIIS (NOM-024 validationRaw).
 * - Solo A–Z, Ñ en mayúsculas; sin acentos (sí conserva diéresis en vocal: Ä, Ë, Ï, Ö, Ü).
 * - Especiales permitidos: - , . / ' ¨
 * - No más de un espacio consecutivo; no más de un caracter especial consecutivo.
 *
 * @param value - Nombre o apellido del firmante
 * @returns String listo para nombrePrestador / primerApellidoPrestador / segundoApellidoPrestador
 */
export function normalizeNameForGiis(value: string | null | undefined): string {
  if (value == null || typeof value !== 'string') return '';
  const s = value.trim();
  if (!s) return '';

  // 1) Quitar acentos y normalizar ñ → Ñ
  let out = '';
  for (const c of s) {
    out += GIIS_NAME_ACCENT_MAP[c] ?? c;
  }

  // 2) Mayúsculas
  out = out.toUpperCase();

  // 3) Dejar solo caracteres permitidos
  out = out
    .split('')
    .filter((c) => GIIS_NAME_ALLOWED.test(c))
    .join('');

  // 4) Colapsar espacios consecutivos a uno
  out = out.replace(/\s+/g, ' ').trim();

  // 5) Colapsar el mismo caracter especial repetido (regla: no más de uno consecutivo del mismo)
  out = out.replace(/([\-,\.\/'¨])\1+/g, '$1');

  return out.trim();
}
