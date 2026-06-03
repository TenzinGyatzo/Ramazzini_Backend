/**
 * CIE-10 Sex and Age Validator
 *
 * Validador reutilizable que verifica que los diagnósticos CIE-10 en Nota Médica
 * cumplan con las restricciones de sexo y/o edad del trabajador.
 *
 * Bloque C3/C4: Validaciones determinísticas por SEXO y/o EDAD
 */

import { calculateAge } from '../../../utils/age-calculator.util';
import {
  getCIE10Restriction,
  getPrefixFromCode,
} from '../../../utils/cie10-restrictions.util';
import { mapSexoToGiisBiologico } from '../../../utils/sexo-mapper.util';

export interface CIE10ValidationIssue {
  field: string;
  cie10: string;
  ruleId: 'C3' | 'C4';
  reason: string;
  sexo: string;
  edad: number;
}

export interface CIE10ValidationParams {
  trabajadorSexo: string; // "Masculino" | "Femenino"
  trabajadorFechaNacimiento: Date;
  fechaNotaMedica?: Date;
  cie10Fields: Array<{ field: string; value: string | string[] }>;
}

export interface CIE10ValidationResult {
  ok: boolean;
  issues: CIE10ValidationIssue[];
}

type SexoValidacion = 'MUJER' | 'HOMBRE' | 'INTERSEXUAL';

/**
 * Normaliza el sexo del trabajador a formato de validación.
 * Intersexual (GIIS 3): no aplica restricciones LSEX del catálogo manual.
 */
function normalizeSexo(sexo: string): SexoValidacion | null {
  if (!sexo) {
    return null;
  }

  const giis = mapSexoToGiisBiologico(sexo);
  if (giis === 1) return 'HOMBRE';
  if (giis === 2) return 'MUJER';
  if (giis === 3) return 'INTERSEXUAL';

  return null;
}

/**
 * Recolecta todos los códigos CIE-10 de los campos especificados
 */
function collectCIE10Codes(
  cie10Fields: Array<{ field: string; value: string | string[] }>,
): Array<{ field: string; value: string }> {
  const codes: Array<{ field: string; value: string }> = [];

  for (const field of cie10Fields) {
    if (!field.value) {
      continue;
    }

    if (Array.isArray(field.value)) {
      // Array de códigos complementarios
      for (const code of field.value) {
        if (code && code.trim() !== '') {
          codes.push({ field: field.field, value: code });
        }
      }
    } else {
      // Código único
      if (field.value.trim() !== '') {
        codes.push({ field: field.field, value: field.value });
      }
    }
  }

  return codes;
}

/**
 * Valida un código CIE-10 contra las restricciones de sexo y edad
 */
function validateSingleCIE10Code(
  cie10Code: string,
  field: string,
  trabajadorSexo: string,
  edad: number,
): CIE10ValidationIssue | null {
  // Obtener restricción del catálogo
  const restriction = getCIE10Restriction(cie10Code);

  if (!restriction) {
    // No hay restricciones para este código
    return null;
  }

  // Normalizar sexo del trabajador
  const sexoTrabajador = normalizeSexo(trabajadorSexo);

  if (!sexoTrabajador) {
    // Sexo no reconocido, no validar (fallback)
    return null;
  }

  if (sexoTrabajador === 'INTERSEXUAL') {
    return null;
  }

  // Validar sexo
  if (sexoTrabajador !== restriction.sexoPermitido) {
    const reason =
      restriction.edadMin !== undefined || restriction.edadMax !== undefined
        ? `Solo permitido para ${restriction.sexoPermitido}${restriction.edadMin !== undefined ? ` desde ${restriction.edadMin} años` : ''}${restriction.edadMax !== undefined ? ` hasta ${restriction.edadMax} años` : ''}`
        : `Solo permitido para ${restriction.sexoPermitido}`;

    return {
      field,
      cie10: getPrefixFromCode(cie10Code) || cie10Code,
      ruleId: restriction.ruleId,
      reason,
      sexo: trabajadorSexo,
      edad,
    };
  }

  // Validar edad mínima
  if (restriction.edadMin !== undefined && edad < restriction.edadMin) {
    const reason =
      restriction.edadMax !== undefined
        ? `Solo permitido para ${restriction.sexoPermitido} entre ${restriction.edadMin} y ${restriction.edadMax} años`
        : `Solo permitido para ${restriction.sexoPermitido} desde ${restriction.edadMin} años`;

    return {
      field,
      cie10: getPrefixFromCode(cie10Code) || cie10Code,
      ruleId: restriction.ruleId,
      reason,
      sexo: trabajadorSexo,
      edad,
    };
  }

  // Validar edad máxima
  if (restriction.edadMax !== undefined && edad > restriction.edadMax) {
    const reason = `Solo permitido para ${restriction.sexoPermitido} entre ${restriction.edadMin} y ${restriction.edadMax} años`;

    return {
      field,
      cie10: getPrefixFromCode(cie10Code) || cie10Code,
      ruleId: restriction.ruleId,
      reason,
      sexo: trabajadorSexo,
      edad,
    };
  }

  // Todas las validaciones pasaron
  return null;
}

/**
 * Valida que todos los diagnósticos CIE-10 en una Nota Médica cumplan
 * con las restricciones de sexo y/o edad del trabajador.
 *
 * @param params - Parámetros de validación
 * @returns Resultado de la validación con lista de issues encontrados
 *
 * @example
 * const result = validateNotaMedicaCIE10SexAgeRules({
 *   trabajadorSexo: 'MUJER',
 *   trabajadorFechaNacimiento: new Date('1990-01-01'),
 *   fechaNotaMedica: new Date('2024-01-01'),
 *   cie10Fields: [
 *     { field: 'codigoCIE10Principal', value: 'C53' },
 *     { field: 'codigosCIE10Complementarios', value: ['C50'] }
 *   ]
 * });
 */
export function validateNotaMedicaCIE10SexAgeRules(
  params: CIE10ValidationParams,
): CIE10ValidationResult {
  const {
    trabajadorSexo,
    trabajadorFechaNacimiento,
    fechaNotaMedica,
    cie10Fields,
  } = params;

  // Calcular edad del trabajador
  // Usar fechaNotaMedica si existe, sino fecha actual
  const fechaReferencia = fechaNotaMedica || new Date();
  let edad: number;

  try {
    edad = calculateAge(trabajadorFechaNacimiento, fechaReferencia);
  } catch (error) {
    // Si hay error calculando la edad, no validar (fallback)
    console.warn('Error calculando edad para validación CIE-10:', error);
    return { ok: true, issues: [] };
  }

  // Recolectar todos los códigos CIE-10
  const codes = collectCIE10Codes(cie10Fields);

  if (codes.length === 0) {
    // No hay códigos para validar
    return { ok: true, issues: [] };
  }

  // Validar cada código
  const issues: CIE10ValidationIssue[] = [];

  for (const { field, value } of codes) {
    const issue = validateSingleCIE10Code(value, field, trabajadorSexo, edad);
    if (issue) {
      issues.push(issue);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
