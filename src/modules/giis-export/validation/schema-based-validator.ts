/**
 * Schema-based row validator for GIIS Phase 2A.
 * Translates validationRaw + schema metadata into executable rules.
 * Uses CatalogsService via optional catalogLookup for catalog validation.
 */

import { GiisSchema, GiisSchemaField } from '../schema-loader';
import { ValidationError } from './validation.types';
import {
  validateCURPFormat,
  isGenericCURP,
} from '../../../utils/curp-validator.util';

/** Optional async catalog validation; when not provided, catalog checks are skipped. */
export interface CatalogLookup {
  validatePais?(code: string): Promise<boolean>;
  validateEntidadFederativa?(code: string): Promise<boolean>;
  validateClues?(clues: string): Promise<boolean>;
  validateTipoPersonal?(code: string): Promise<boolean>;
  validateAfiliacion?(code: string): Promise<boolean>;
}

function getStr(
  row: Record<string, string | number>,
  fieldName: string,
): string {
  const v = row[fieldName];
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function getNum(
  row: Record<string, string | number>,
  fieldName: string,
): number | null {
  const v = row[fieldName];
  if (v === undefined || v === null) return null;
  const n = typeof v === 'number' ? v : parseInt(String(v).trim(), 10);
  return Number.isNaN(n) ? null : n;
}

/** Allowed characters for names (validationRaw: A–Z Ñ, mayúsculas; especiales: - , . / ' ¨) */
const NAME_REGEX = /^[A-ZÑ\s\-,\.\/'¨]+$/;

function hasConsecutiveSpecial(s: string): boolean {
  const specials = s.replace(/\s/g, '').replace(/[A-ZÑ]/g, '');
  for (let i = 1; i < specials.length; i++) {
    if (specials[i] === specials[i - 1]) return true;
  }
  return false;
}

/** dd/mm/aaaa, 8 digits + 2 slashes */
const DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function parseDateDDMMYYYY(
  value: string,
): { d: number; m: number; y: number } | null {
  const m = value.match(DATE_REGEX);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  if (month < 1 || month > 12 || d < 1 || d > 31) return null;
  const daysInMonth = new Date(y, month, 0).getDate();
  if (d > daysInMonth) return null;
  return { d, m: month, y };
}

/**
 * Validate a single row against schema. Returns list of ValidationErrors.
 * When catalogLookup is provided, catalog checks are performed (async).
 */
export async function validateRowAgainstSchema(
  guide: string,
  schema: GiisSchema,
  row: Record<string, string | number>,
  rowIndex: number,
  catalogLookup?: CatalogLookup,
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  for (const field of schema.fields) {
    const raw = getStr(row, field.name);
    const isEmpty = raw === '';

    // Required (excepciones CEX: codigoCIEDiagnostico2/3 vacíos cuando primeraVezDiagnostico2/3 = -1)
    if (field.requiredColumn && isEmpty) {
      const allowEmptyCie3 =
        guide === 'CEX' &&
        field.name === 'codigoCIEDiagnostico3' &&
        getNum(row, 'primeraVezDiagnostico3') === -1;
      const allowEmptyCie2 =
        guide === 'CEX' &&
        field.name === 'codigoCIEDiagnostico2' &&
        getNum(row, 'primeraVezDiagnostico2') === -1;
      if (!allowEmptyCie3 && !allowEmptyCie2) {
        errors.push({
          guide,
          rowIndex,
          field: field.name,
          cause: 'Campo obligatorio vacío',
          severity: 'blocker',
        });
      }
      continue;
    }

    if (isEmpty && !field.requiredColumn) continue;

    // Max length from schema
    const maxLen = field.type?.maxLength;
    if (maxLen !== undefined && raw.length > maxLen) {
      errors.push({
        guide,
        rowIndex,
        field: field.name,
        cause: `Longitud máxima ${maxLen} caracteres`,
        severity: 'blocker',
      });
    }

    // Field-specific rules (from validationRaw semantics)
    const fieldErrors = await validateFieldByRule(
      guide,
      field,
      row,
      rowIndex,
      catalogLookup,
    );
    errors.push(...fieldErrors);
  }

  return errors;
}

async function validateFieldByRule(
  guide: string,
  field: GiisSchemaField,
  row: Record<string, string | number>,
  rowIndex: number,
  catalogLookup?: CatalogLookup,
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  const raw = getStr(row, field.name);
  const name = field.name;

  // CURP (format + generic allowed)
  if (name === 'curpPaciente' || name === 'curpPrestador') {
    if (raw.length !== 18) {
      errors.push({
        guide,
        rowIndex,
        field: name,
        cause: 'CURP debe tener 18 caracteres',
        severity: 'blocker',
      });
    } else if (!validateCURPFormat(raw)) {
      errors.push({
        guide,
        rowIndex,
        field: name,
        cause: 'CURP con formato inválido',
        severity: 'blocker',
      });
    }
    return errors;
  }

  // CLUES: 11 chars or 9998; catalog when not 9998
  if (name === 'clues') {
    if (raw !== '9998' && raw.length !== 11) {
      errors.push({
        guide,
        rowIndex,
        field: name,
        cause: 'CLUES debe ser 11 caracteres o 9998',
        severity: 'blocker',
      });
    } else if (raw !== '9998' && catalogLookup?.validateClues) {
      const valid = await catalogLookup.validateClues(raw);
      if (!valid) {
        errors.push({
          guide,
          rowIndex,
          field: name,
          cause: 'CLUES no encontrada en catálogo o no en operación',
          severity: 'blocker',
        });
      }
    }
    return errors;
  }

  // Names: min 2 chars (except XX for apellidos), allowed chars, no consecutive special.
  // If CURP is generic (XXXX999999XXXXXX99), omit name validation per validationRaw.
  const nameFields = [
    'nombre',
    'nombrePrestador',
    'primerApellido',
    'primerApellidoPrestador',
    'segundoApellido',
    'segundoApellidoPrestador',
    // LES (GIIS-B013): responsable de la atención
    'nombreResponsable',
    'primerApellidoResponsable',
    'segundoApellidoResponsable',
  ];
  if (nameFields.includes(name)) {
    const curpKey = name.includes('Prestador')
      ? 'curpPrestador'
      : name.includes('Responsable')
        ? 'curpResponsable'
        : 'curpPaciente';
    const curpVal = getStr(row, curpKey);
    if (curpVal && isGenericCURP(curpVal)) return errors;
    if (raw !== 'XX' && raw.length < 2) {
      errors.push({
        guide,
        rowIndex,
        field: name,
        cause: 'Longitud mínima 2 caracteres',
        severity: 'blocker',
      });
    }
    if (raw !== 'XX' && !NAME_REGEX.test(raw)) {
      errors.push({
        guide,
        rowIndex,
        field: name,
        cause: "Solo caracteres A-Z, Ñ y especiales permitidos (- , . / ' ¨)",
        severity: 'blocker',
      });
    }
    if (raw !== 'XX' && hasConsecutiveSpecial(raw)) {
      errors.push({
        guide,
        rowIndex,
        field: name,
        cause: 'No se permite más de un caracter especial consecutivo',
        severity: 'blocker',
      });
    }
    return errors;
  }

  // fechaNacimiento: dd/mm/aaaa
  if (
    name === 'fechaNacimiento' ||
    name === 'fechaConsulta' ||
    name === 'fechaNotaMedica' ||
    name === 'fechaAtencion' ||
    name === 'fechaDeteccion'
  ) {
    if (raw.length !== 10 || !DATE_REGEX.test(raw)) {
      errors.push({
        guide,
        rowIndex,
        field: name,
        cause: 'Formato de fecha debe ser dd/mm/aaaa',
        severity: 'blocker',
      });
    } else {
      const parsed = parseDateDDMMYYYY(raw);
      if (!parsed) {
        errors.push({
          guide,
          rowIndex,
          field: name,
          cause: 'Fecha inválida',
          severity: 'blocker',
        });
      }
    }
    return errors;
  }

  // PAIS (numeric catalog)
  if (
    name === 'paisNacimiento' ||
    name === 'paisNacPaciente' ||
    name === 'paisProcedencia'
  ) {
    if (catalogLookup?.validatePais) {
      const code = String(getNum(row, name) ?? raw).trim();
      if (code !== '' && code !== '-1') {
        const valid = await catalogLookup.validatePais(code);
        if (!valid) {
          errors.push({
            guide,
            rowIndex,
            field: name,
            cause: 'Valor no encontrado en catálogo PAIS',
            severity: 'blocker',
          });
        }
      }
    }
    return errors;
  }

  // ENTIDAD FEDERATIVA: si paisNacPaciente !== 142 (extranjero) debe ser 88 (NO APLICA)
  if (name === 'entidadNacimiento') {
    const code = getStr(row, name);
    const paisNac = getNum(row, 'paisNacPaciente');
    const esExtranjero = paisNac !== null && paisNac !== 142;
    if (esExtranjero) {
      if (code !== '88') {
        errors.push({
          guide,
          rowIndex,
          field: name,
          cause:
            'Para paciente extranjero (paisNacPaciente ≠ 142) debe ser 88 (NO APLICA)',
          severity: 'blocker',
        });
      }
      return errors;
    }
    if (['99', '00', '88'].includes(code)) return errors;
    if (catalogLookup?.validateEntidadFederativa) {
      const valid = await catalogLookup.validateEntidadFederativa(code);
      if (!valid) {
        errors.push({
          guide,
          rowIndex,
          field: name,
          cause: 'Valor no encontrado en catálogo ENTIDAD FEDERATIVA',
          severity: 'blocker',
        });
      }
    }
    return errors;
  }

  // TIPO PERSONAL
  if (name === 'tipoPersonal') {
    if (catalogLookup?.validateTipoPersonal) {
      const code = String(getNum(row, name) ?? raw).trim();
      const valid = await catalogLookup.validateTipoPersonal(code);
      if (!valid) {
        errors.push({
          guide,
          rowIndex,
          field: name,
          cause: 'Valor no encontrado en catálogo TIPO PERSONAL',
          severity: 'blocker',
        });
      }
    }
    return errors;
  }

  // AFILIACION
  if (name === 'afiliacion') {
    if (catalogLookup?.validateAfiliacion) {
      const code = String(getNum(row, name) ?? raw).trim();
      const valid = await catalogLookup.validateAfiliacion(code);
      if (!valid) {
        errors.push({
          guide,
          rowIndex,
          field: name,
          cause: 'Valor no encontrado en catálogo AFILIACION',
          severity: 'blocker',
        });
      }
    }
    return errors;
  }

  // CEX: rangos de signos vitales según schema
  if (guide === 'CEX') {
    const n = getNum(row, name);
    if (name === 'sistolica') {
      const diast = getNum(row, 'diastolica');
      if (n !== null && n !== 0) {
        if (diast === 0) {
          errors.push({
            guide,
            rowIndex,
            field: name,
            cause: 'CEX: si diastólica=0, sistólica debe ser 0',
            severity: 'blocker',
          });
        } else if (n < 50 || n > 300) {
          errors.push({
            guide,
            rowIndex,
            field: name,
            cause: 'CEX: sistólica debe estar entre 50 y 300 mmHg',
            severity: 'blocker',
          });
        }
      }
      if (n !== null && diast !== null && n > 0 && diast > 0 && n < diast) {
        errors.push({
          guide,
          rowIndex,
          field: name,
          cause: 'CEX: sistólica debe ser >= diastólica',
          severity: 'blocker',
        });
      }
    }
    if (name === 'diastolica') {
      const sist = getNum(row, 'sistolica');
      if (n !== null && n !== 0) {
        if (sist === 0) {
          errors.push({
            guide,
            rowIndex,
            field: name,
            cause: 'CEX: si sistólica=0, diastólica debe ser 0',
            severity: 'blocker',
          });
        } else if (n < 20 || n > 200) {
          errors.push({
            guide,
            rowIndex,
            field: name,
            cause: 'CEX: diastólica debe estar entre 20 y 200 mmHg',
            severity: 'blocker',
          });
        }
      }
    }
    if (
      name === 'frecuenciaCardiaca' &&
      n !== null &&
      n !== 0 &&
      (n < 40 || n > 220)
    ) {
      errors.push({
        guide,
        rowIndex,
        field: name,
        cause: 'CEX: frecuencia cardíaca debe estar entre 40 y 220 lpm',
        severity: 'blocker',
      });
    }
    if (
      name === 'frecuenciaRespiratoria' &&
      n !== null &&
      n !== 0 &&
      (n < 10 || n > 99)
    ) {
      errors.push({
        guide,
        rowIndex,
        field: name,
        cause: 'CEX: frecuencia respiratoria debe estar entre 10 y 99 rpm',
        severity: 'blocker',
      });
    }
    if (name === 'temperatura' && n !== null && n !== 0 && (n < 30 || n > 44)) {
      errors.push({
        guide,
        rowIndex,
        field: name,
        cause: 'CEX: temperatura debe estar entre 30 y 44 °C',
        severity: 'blocker',
      });
    }
    if (
      name === 'saturacionOxigeno' &&
      n !== null &&
      n !== 0 &&
      (n < 1 || n > 100)
    ) {
      errors.push({
        guide,
        rowIndex,
        field: name,
        cause: 'CEX: saturación de oxígeno debe estar entre 1 y 100 %',
        severity: 'blocker',
      });
    }
    if (name === 'peso' && n !== null && n !== 999 && (n < 1 || n > 400)) {
      errors.push({
        guide,
        rowIndex,
        field: name,
        cause: 'CEX: peso debe estar entre 1 y 400 kg (999=desconoce)',
        severity: 'blocker',
      });
    }
    if (name === 'talla' && n !== null && n !== 999 && (n < 30 || n > 220)) {
      errors.push({
        guide,
        rowIndex,
        field: name,
        cause: 'CEX: talla debe estar entre 30 y 220 cm (999=desconoce)',
        severity: 'blocker',
      });
    }
  }

  // Numeric enums from validationRaw (0/1, 0/1/2/3/-1, etc.)
  if (field.type?.kind === 'numeric' && !catalogLookup) {
    const n = getNum(row, name);
    if (n !== null && !Number.isFinite(n)) {
      errors.push({
        guide,
        rowIndex,
        field: name,
        cause: 'Valor numérico inválido',
        severity: 'blocker',
      });
    }
  }

  return errors;
}

/**
 * Synchronous validation for required + maxLength + format only (no catalog).
 * Used when catalog lookup is not needed (e.g. quick checks).
 */
export function validateRowSync(
  guide: string,
  schema: GiisSchema,
  row: Record<string, string | number>,
  rowIndex: number,
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const field of schema.fields) {
    const raw = getStr(row, field.name);
    if (field.requiredColumn && raw === '') {
      errors.push({
        guide,
        rowIndex,
        field: field.name,
        cause: 'Campo obligatorio vacío',
        severity: 'blocker',
      });
    }
    const maxLen = field.type?.maxLength;
    if (maxLen !== undefined && raw.length > maxLen) {
      errors.push({
        guide,
        rowIndex,
        field: field.name,
        cause: `Longitud máxima ${maxLen} caracteres`,
        severity: 'blocker',
      });
    }
  }
  return errors;
}
