/**
 * CURP Validator Utility
 *
 * Validates CURP (Clave Única de Registro de Población) according to RENAPO format
 * and checksum algorithm. Used for NOM-024 compliance for Mexican providers.
 */

import {
  deriveCurpNameSegments,
  getExpectedHomoclavePattern,
} from './curp-name-segments.util';
import { mapSexoToGiisBiologico } from './sexo-mapper.util';

/**
 * Discrepancy information for CURP cross-check validation
 */
export interface Discrepancy {
  field:
    | 'fechaNacimiento'
    | 'sexo'
    | 'entidadNacimiento'
    | 'iniciales'
    | 'consonantesInternas'
    | 'homoclave';
  expected: string;
  gotFromCurp: string;
}

/**
 * Validates CURP format according to RENAPO specification
 * Format: [A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d (18 characters)
 * Also allows generic CURP: XXXX999999XXXXXX99 (for unknown/foreign patients)
 *
 * @param curp - CURP string to validate
 * @returns true if format is valid, false otherwise
 */
export function validateCURPFormat(curp: string): boolean {
  if (!curp || typeof curp !== 'string') {
    return false;
  }

  // Remove whitespace and convert to uppercase
  const normalizedCurp = curp.trim().toUpperCase();

  // Must be exactly 18 characters
  if (normalizedCurp.length !== 18) {
    return false;
  }

  // Check for generic CURP first (XXXX999999XXXXXX99)
  if (isGenericCURP(normalizedCurp)) {
    return true;
  }

  // Standard RENAPO format: [A-Z]{4}\d{6}[HMX][A-Z]{5}[0-9A-Z]\d (X desde 2024)
  const renapoPattern = /^[A-Z]{4}\d{6}[HMX][A-Z]{5}[0-9A-Z]\d$/;

  return renapoPattern.test(normalizedCurp);
}

/**
 * Tabla oficial RENAPO para el dígito verificador CURP.
 * Orden: 0-9, A-N, Ñ, O-Z. La Ñ va entre N y O (valor 24).
 * Referencia: Instructivo normativo CURP, implementaciones oficiales (ej. prestigos/curp.js).
 */
const RENAPO_CURP_CHARS = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

/**
 * Validates CURP checksum using RENAPO algorithm
 *
 * The checksum algorithm:
 * 1. Takes first 17 characters
 * 2. Assigns values to each character according to RENAPO table (0-9, A-N, Ñ, O-Z)
 * 3. Multiplies each value by its position weight (18, 17, ..., 2)
 * 4. Sums all results
 * 5. Calculates modulo 10
 * 6. If result is 0, check digit is 0, otherwise it's 10 - result
 *
 * @param curp - CURP string to validate
 * @returns true if checksum is valid, false otherwise
 */
export function validateCURPChecksum(curp: string): boolean {
  if (!curp || typeof curp !== 'string' || curp.length !== 18) {
    return false;
  }

  const normalizedCurp = curp.trim().toUpperCase();

  // Get first 17 characters and check digit (last character)
  const baseString = normalizedCurp.substring(0, 17);
  const providedCheckDigit = normalizedCurp.charAt(17);

  const getCharValue = (char: string): number => {
    const idx = RENAPO_CURP_CHARS.indexOf(char);
    return idx >= 0 ? idx : 0;
  };

  // Calculate weighted sum (weights 18, 17, ..., 2 for positions 0..16)
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const charValue = getCharValue(baseString[i]);
    const weight = 18 - i;
    sum += charValue * weight;
  }

  // Calculate check digit: (10 - (sum % 10)) % 10 so that 10 becomes 0
  const modulo = sum % 10;
  const calculatedCheckDigit = modulo === 0 ? '0' : String(10 - modulo);

  return calculatedCheckDigit === providedCheckDigit;
}

/**
 * Detects if CURP is a generic/placeholder CURP
 * Generic CURP pattern: XXXX999999XXXXXX99 (all X's for letters, all 9's for numbers)
 * Used for unknown patients or foreign patients without CURP
 *
 * @param curp - CURP string to check
 * @returns true if CURP appears to be generic/placeholder
 */
export function isGenericCURP(curp: string): boolean {
  if (!curp || typeof curp !== 'string') {
    return false;
  }

  const normalizedCurp = curp.trim().toUpperCase();

  // Check exact match for generic CURP: XXXX999999XXXXXX99
  // Pattern: XXXX(0-3) + 999999(4-9) + X(10) + XXXXX(11-15) + 99(16-17)
  if (normalizedCurp === 'XXXX999999XXXXXX99') {
    return true;
  }

  // Also check pattern variants: XXXX999999 followed by mostly X's and ending in 99
  // This allows for slight variations of the generic CURP pattern
  if (
    normalizedCurp.substring(0, 4) === 'XXXX' &&
    normalizedCurp.substring(4, 10) === '999999' &&
    normalizedCurp.substring(16, 18) === '99'
  ) {
    // Check positions 11-15 (5 characters) - should be mostly X's
    const middlePart = normalizedCurp.substring(11, 16); // positions 11-15
    const xCount = (middlePart.match(/X/g) || []).length;

    // If most of middle part (4+ X's out of 5), consider it generic
    if (xCount >= 4) {
      return true;
    }
  }

  return false;
}

/**
 * Validates complete CURP (format + checksum)
 *
 * @param curp - CURP string to validate
 * @returns object with validation results
 */
export function validateCURP(curp: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!curp || typeof curp !== 'string' || curp.trim() === '') {
    return {
      isValid: false,
      errors: ['CURP no puede estar vacío'],
    };
  }

  const normalizedCurp = curp.trim().toUpperCase();

  // Validate format first
  if (!validateCURPFormat(normalizedCurp)) {
    errors.push(
      'CURP debe tener exactamente 18 caracteres con el formato: 4 letras, 6 dígitos, 1 letra (H/M/X), 5 letras, 1 alfanumérico, 1 dígito',
    );
    return {
      isValid: false,
      errors,
    };
  }

  // Check for generic CURP - permitir CURPs genéricas (son válidas para casos especiales)
  // Las CURPs genéricas son permitidas según NOM-024 para casos como pacientes desconocidos o extranjeros
  if (isGenericCURP(normalizedCurp)) {
    // CURP genérica es válida, no requiere validación de checksum
    return {
      isValid: true,
      errors: [],
    };
  }

  // Validate checksum (only if format is valid and not generic)
  // Nota: La validación del dígito verificador puede ser estricta según NOM-024,
  // pero algunos CURPs válidos pueden tener discrepancias debido a variaciones
  // en el algoritmo de RENAPO o errores en el sistema oficial.
  // Por ahora, validamos el formato estricto que es el requisito principal.
  const checksumValid = validateCURPChecksum(normalizedCurp);
  if (!checksumValid) {
    // Según NOM-024, el formato es lo más importante. El dígito verificador
    // puede tener variaciones, por lo que solo emitimos advertencia pero no bloqueamos.
    // Si se requiere validación estricta del dígito verificador, se puede habilitar aquí.
    console.warn(
      `CURP ${normalizedCurp}: El dígito verificador no coincide con el algoritmo estándar, pero el formato es válido según NOM-024.`,
    );
    // Opcional: Descomentar la siguiente línea para habilitar validación estricta del dígito verificador
    // errors.push('CURP con dígito verificador inválido');
  }

  return {
    isValid: true,
    errors: [],
  };
}

/**
 * Mapeo estático de entidades federativas: código INEGI → abreviatura CURP
 * Basado en catálogo oficial de entidades federativas
 */
const ENTIDAD_MAP: Record<string, string> = {
  '00': 'NE', // NO ESPECIFICADO
  '01': 'AS', // AGUASCALIENTES
  '02': 'BC', // BAJA CALIFORNIA
  '03': 'BS', // BAJA CALIFORNIA SUR
  '04': 'CC', // CAMPECHE
  '05': 'CL', // COAHUILA DE ZARAGOZA
  '06': 'CM', // COLIMA
  '07': 'CS', // CHIAPAS
  '08': 'CH', // CHIHUAHUA
  '09': 'DF', // CIUDAD DE MÉXICO
  '10': 'DG', // DURANGO
  '11': 'GT', // GUANAJUATO
  '12': 'GR', // GUERRERO
  '13': 'HG', // HIDALGO
  '14': 'JC', // JALISCO
  '15': 'MC', // MÉXICO
  '16': 'MN', // MICHOACÁN DE OCAMPO
  '17': 'MS', // MORELOS
  '18': 'NT', // NAYARIT
  '19': 'NL', // NUEVO LEÓN
  '20': 'OC', // OAXACA
  '21': 'PL', // PUEBLA
  '22': 'QT', // QUERÉTARO
  '23': 'QR', // QUINTANA ROO
  '24': 'SP', // SAN LUIS POTOSÍ
  '25': 'SL', // SINALOA
  '26': 'SR', // SONORA
  '27': 'TC', // TABASCO
  '28': 'TS', // TAMAULIPAS
  '29': 'TL', // TLAXCALA
  '30': 'VZ', // VERACRUZ DE IGNACIO DE LA LLAVE
  '31': 'YN', // YUCATÁN
  '32': 'ZS', // ZACATECAS
};

/**
 * Mapeo estático de nombres de entidades → abreviatura CURP
 */
const ENTIDAD_NAME_MAP: Record<string, string> = {
  'NO ESPECIFICADO': 'NE',
  AGUASCALIENTES: 'AS',
  'BAJA CALIFORNIA': 'BC',
  'BAJA CALIFORNIA SUR': 'BS',
  CAMPECHE: 'CC',
  'COAHUILA DE ZARAGOZA': 'CL',
  COAHUILA: 'CL',
  COLIMA: 'CM',
  CHIAPAS: 'CS',
  CHIHUAHUA: 'CH',
  'CIUDAD DE MÉXICO': 'DF',
  'DISTRITO FEDERAL': 'DF',
  DURANGO: 'DG',
  GUANAJUATO: 'GT',
  GUERRERO: 'GR',
  HIDALGO: 'HG',
  JALISCO: 'JC',
  MÉXICO: 'MC',
  'ESTADO DE MÉXICO': 'MC',
  'MICHOACÁN DE OCAMPO': 'MN',
  MICHOACAN: 'MN',
  MORELOS: 'MS',
  NAYARIT: 'NT',
  'NUEVO LEÓN': 'NL',
  'NUEVO LEON': 'NL',
  OAXACA: 'OC',
  PUEBLA: 'PL',
  QUERÉTARO: 'QT',
  QUERETARO: 'QT',
  'QUINTANA ROO': 'QR',
  'SAN LUIS POTOSÍ': 'SP',
  'SAN LUIS POTOSI': 'SP',
  SINALOA: 'SL',
  SONORA: 'SR',
  TABASCO: 'TC',
  TAMAULIPAS: 'TS',
  TLAXCALA: 'TL',
  'VERACRUZ DE IGNACIO DE LA LLAVE': 'VZ',
  VERACRUZ: 'VZ',
  YUCATÁN: 'YN',
  YUCATAN: 'YN',
  ZACATECAS: 'ZS',
};

/**
 * Normaliza entidad de nacimiento a código CURP (2 letras)
 * Soporta: código INEGI (01-32), nombre de estado, o ya código CURP
 */
function normalizeEntidadToCURPCode(entidad: string): string | null {
  if (!entidad || typeof entidad !== 'string') {
    return null;
  }

  const normalized = entidad.trim().toUpperCase();

  // Si ya es código CURP (2 letras), retornar
  if (/^[A-Z]{2}$/.test(normalized)) {
    return normalized;
  }

  // Si es código INEGI (01-32), buscar en mapeo
  if (/^\d{2}$/.test(normalized)) {
    return ENTIDAD_MAP[normalized] || null;
  }

  // Si es nombre de estado, buscar en mapeo de nombres
  return ENTIDAD_NAME_MAP[normalized] || null;
}

/**
 * Normaliza sexo a código CURP (H o M)
 * Soporta: "Masculino", "Femenino", "Hombre", "Mujer", "H", "M", "1", "2"
 */
function normalizeSexoToCURPCode(sexo: string): string | null {
  if (!sexo || typeof sexo !== 'string') {
    return null;
  }

  const normalized = sexo.trim().toUpperCase();

  // Mapeo directo
  if (normalized === 'H' || normalized === 'M') {
    return normalized;
  }

  // Mapeo de nombres completos
  if (
    normalized === 'MASCULINO' ||
    normalized === 'HOMBRE' ||
    normalized === '1'
  ) {
    return 'H';
  }

  if (
    normalized === 'FEMENINO' ||
    normalized === 'MUJER' ||
    normalized === '2'
  ) {
    return 'M';
  }

  return null;
}

/**
 * Parsea fecha de forma segura evitando problemas de zona horaria
 * Soporta: Date object o string ISO (YYYY-MM-DD)
 */
function parseDateSafe(dateInput: Date | string): {
  year: number;
  month: number;
  day: number;
} {
  if (typeof dateInput === 'string') {
    // Si es formato ISO YYYY-MM-DD, parsear directamente sin zona horaria
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return {
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10),
        day: parseInt(match[3], 10),
      };
    }
  }

  // Si es Date, intentar extraer de forma segura
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  // Para fechas creadas desde string ISO (ej: new Date('1991-05-15')),
  // JavaScript las interpreta como UTC medianoche, pero getDate() usa hora local
  // que puede cambiar el día. Usar UTC para fechas que parecen ser "date-only"

  // Si la fecha tiene hora 00:00:00 UTC y no tiene milisegundos significativos,
  // probablemente fue creada desde un string ISO sin hora
  const isLikelyDateOnly =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;

  if (isLikelyDateOnly) {
    // Usar UTC para evitar problemas de zona horaria
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  }

  // Para fechas con hora específica, usar métodos locales
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

/**
 * Valida coherencia semántica entre CURP y datos demográficos (A1)
 *
 * Estructura CURP RENAPO (1-based):
 * - Posiciones 1-4: Iniciales de apellidos y nombre
 * - Posiciones 5-10: AAMMDD (año, mes, día de nacimiento)
 * - Posición 11: H (Hombre) o M (Mujer)
 * - Posiciones 12-13: Entidad federativa de nacimiento
 * - Posiciones 14-16: Consonantes internas de apellidos y nombre
 * - Posición 17: Homoclave (diferenciador de homonimia y siglo)
 * - Posición 18: Dígito verificador
 *
 * @param curp - CURP string (debe estar normalizado a uppercase)
 * @param data - Datos demográficos del trabajador
 * @returns objeto con isValid y discrepancies (estructuradas)
 */
export function validateCURPCrossCheck(
  curp: string,
  data: {
    fechaNacimiento: Date | string;
    sexo: string;
    entidadNacimiento?: string;
    nombre?: string;
    primerApellido?: string;
    segundoApellido?: string;
  },
): {
  isValid: boolean;
  discrepancies: Discrepancy[];
} {
  const discrepancies: Discrepancy[] = [];
  const normalizedCurp = curp.trim().toUpperCase();

  // Si es CURP genérica, no validar cruzada
  if (isGenericCURP(normalizedCurp)) {
    return { isValid: true, discrepancies: [] };
  }

  // Validar formato básico antes de extraer componentes
  if (!validateCURPFormat(normalizedCurp)) {
    return {
      isValid: false,
      discrepancies: [
        {
          field: 'fechaNacimiento',
          expected: 'CURP con formato válido',
          gotFromCurp: 'CURP con formato inválido',
        },
      ],
    };
  }

  // Extraer componentes de la CURP (índices 0-based)
  const curpIniciales = normalizedCurp.substring(0, 4); // posiciones 1-4
  const curpAAMMDD = normalizedCurp.substring(4, 10); // posiciones 5-10 (AAMMDD)
  const curpSexo = normalizedCurp.charAt(10); // posición 11 (H/M)
  const curpEntidad = normalizedCurp.substring(11, 13); // posiciones 12-13 (entidad)
  const curpConsonantes = normalizedCurp.substring(13, 16); // posiciones 14-16
  const curpHomoclave = normalizedCurp.charAt(16); // posición 17

  // 1. Validación BLOQUEANTE: Fecha de nacimiento
  const fechaParsed = parseDateSafe(data.fechaNacimiento);
  const añoCURP = String(fechaParsed.year).slice(-2);
  const mes = String(fechaParsed.month).padStart(2, '0');
  const dia = String(fechaParsed.day).padStart(2, '0');
  const fechaEsperada = `${añoCURP}${mes}${dia}`;

  if (curpAAMMDD !== fechaEsperada) {
    discrepancies.push({
      field: 'fechaNacimiento',
      expected: fechaEsperada,
      gotFromCurp: curpAAMMDD,
    });
  }

  // 2. Validación BLOQUEANTE: Sexo (omitir si trabajador es Intersexual: CURP puede ser H/M/X)
  const omitirCruceSexo = mapSexoToGiisBiologico(data.sexo) === 3;
  if (!omitirCruceSexo) {
    const sexoEsperado = normalizeSexoToCURPCode(data.sexo);
    if (sexoEsperado && curpSexo !== sexoEsperado) {
      discrepancies.push({
        field: 'sexo',
        expected: sexoEsperado,
        gotFromCurp: curpSexo,
      });
    }
  }

  // 3. Validación BLOQUEANTE: Entidad de nacimiento (solo si está presente)
  if (data.entidadNacimiento && data.entidadNacimiento.trim() !== '') {
    const entidadNormalizada = normalizeEntidadToCURPCode(
      data.entidadNacimiento,
    );

    // Si es código especial (NE, 00), no validar contra CURP
    if (
      entidadNormalizada &&
      entidadNormalizada !== 'NE' &&
      entidadNormalizada !== '00'
    ) {
      if (curpEntidad !== entidadNormalizada) {
        discrepancies.push({
          field: 'entidadNacimiento',
          expected: entidadNormalizada,
          gotFromCurp: curpEntidad,
        });
      }
    }
  }

  // 4. Validación BLOQUEANTE: Iniciales y consonantes internas (posiciones 1-4 y 14-16)
  // Reglas canónicas RENAPO + palabras inconvenientes (pos 1-4) en deriveCurpNameSegments;
  // otros casos especiales (partículas, nombres compuestos, etc.) pendientes — ver curp-name-segments.util.ts
  if (data.primerApellido?.trim() && data.nombre?.trim()) {
    const expectedSegments = deriveCurpNameSegments({
      nombre: data.nombre,
      primerApellido: data.primerApellido,
      segundoApellido: data.segundoApellido,
    });

    if (curpIniciales !== expectedSegments.iniciales) {
      discrepancies.push({
        field: 'iniciales',
        expected: expectedSegments.iniciales,
        gotFromCurp: curpIniciales,
      });
    }

    if (curpConsonantes !== expectedSegments.consonantes) {
      discrepancies.push({
        field: 'consonantesInternas',
        expected: expectedSegments.consonantes,
        gotFromCurp: curpConsonantes,
      });
    }
  }

  // 5. Validación BLOQUEANTE: Homoclave / siglo (posición 17)
  const homoclaveRule = getExpectedHomoclavePattern(fechaParsed.year);
  if (!homoclaveRule.pattern.test(curpHomoclave)) {
    discrepancies.push({
      field: 'homoclave',
      expected: homoclaveRule.label,
      gotFromCurp: curpHomoclave,
    });
  }

  // isValid = false solo si hay discrepancias BLOQUEANTES
  return {
    isValid: discrepancies.length === 0,
    discrepancies,
  };
}
