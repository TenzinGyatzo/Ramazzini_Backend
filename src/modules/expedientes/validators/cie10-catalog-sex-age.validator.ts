/**
 * CIE-10 Catalog-Based Sex and Age Validator
 *
 * Validador que verifica que los diagnósticos CIE-10 en Nota Médica
 * cumplan con las restricciones de sexo (LSEX) y edad (LINF/LSUP)
 * usando el catálogo oficial de diagnósticos.
 */

import { mapSexoToGiisBiologico } from '../../../utils/sexo-mapper.util';

import { calculateAge } from '../../../utils/age-calculator.util';
import { extractCIE10Code } from '../../../utils/cie10.util';
import { isAgeAllowedForLinfLsup } from '../../../utils/cie10-diagnostico-sis.util';
import { DiagnosisRule } from '../services/cie10-catalog-lookup.service';

/**
 * Validation issue for a single CIE-10 code
 */
export interface CIE10CatalogValidationIssue {
  field: string;
  cie10: string;
  catalogKeyUsed: string;
  lsex: string;
  linf: string | null;
  lsup: string | null;
  sexoTrabajador: 'HOMBRE' | 'MUJER' | 'INTERSEXUAL';
  edadTrabajador: number;
  reason: 'Sexo no permitido' | 'Edad fuera de rango';
}

/**
 * Validation result
 */
export interface CIE10CatalogValidationResult {
  ok: boolean;
  issues: CIE10CatalogValidationIssue[];
}

/**
 * Validation parameters
 */
export interface CIE10CatalogValidationParams {
  trabajadorSexo: string; // "Masculino" | "Femenino" | "HOMBRE" | "MUJER"
  trabajadorFechaNacimiento: Date;
  fechaNotaMedica?: Date;
  cie10Fields: Array<{ field: string; value: string | string[] }>;
  lookup: (code: string) => Promise<DiagnosisRule | null>;
}

/**
 * Normalizes sex to HOMBRE/MUJER/INTERSEXUAL format
 */
function normalizeSexo(
  sexo: string,
): 'MUJER' | 'HOMBRE' | 'INTERSEXUAL' | null {
  const giis = mapSexoToGiisBiologico(sexo);
  if (giis === 1) return 'HOMBRE';
  if (giis === 2) return 'MUJER';
  if (giis === 3) return 'INTERSEXUAL';
  return null;
}

/**
 * Collects all CIE-10 codes from fields
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
      // Array of complementary codes
      for (const code of field.value) {
        if (code && code.trim() !== '') {
          codes.push({ field: field.field, value: code });
        }
      }
    } else {
      // Single code
      if (field.value.trim() !== '') {
        codes.push({ field: field.field, value: field.value });
      }
    }
  }

  return codes;
}

/**
 * Validates sex restriction (LSEX)
 */
function validateSex(
  lsex: string,
  sexoTrabajador: 'HOMBRE' | 'MUJER',
): boolean {
  if (!lsex || lsex === 'NO') {
    return true;
  }

  const lsexUpper = lsex.trim().toUpperCase();
  if (lsexUpper === 'MUJER' || lsexUpper === 'HOMBRE') {
    return lsexUpper === sexoTrabajador;
  }
  return true;
}

/**
 * Validates a single CIE-10 code against catalog rules
 */
async function validateSingleCIE10Code(
  cie10Code: string,
  field: string,
  sexoTrabajador: 'HOMBRE' | 'MUJER' | 'INTERSEXUAL',
  edadTrabajador: number,
  fechaNacimiento: Date,
  fechaNotaMedica: Date,
  lookup: (code: string) => Promise<DiagnosisRule | null>,
): Promise<CIE10CatalogValidationIssue | null> {
  // Extract normalized code
  const normalizedCode = extractCIE10Code(cie10Code);
  if (!normalizedCode) {
    // Invalid code format, skip (don't block)
    return null;
  }

  // Lookup rule in catalog
  const rule = await lookup(normalizedCode);
  if (!rule) {
    // No rule in catalog, don't block (conservative approach)
    return null;
  }

  // Validate sex (omit for intersexual — solo aplica LINF/LSUP)
  if (sexoTrabajador !== 'INTERSEXUAL') {
    const sexValid = validateSex(rule.lsex, sexoTrabajador);
    if (!sexValid) {
      return {
        field,
        cie10: normalizedCode,
        catalogKeyUsed: rule.key,
        lsex: rule.lsex,
        linf: rule.linf,
        lsup: rule.lsup,
        sexoTrabajador,
        edadTrabajador,
        reason: 'Sexo no permitido',
      };
    }
  }

  if (
    !isAgeAllowedForLinfLsup(
      rule.linf,
      rule.lsup,
      fechaNacimiento,
      fechaNotaMedica,
    )
  ) {
    return {
      field,
      cie10: normalizedCode,
      catalogKeyUsed: rule.key,
      lsex: rule.lsex,
      linf: rule.linf,
      lsup: rule.lsup,
      sexoTrabajador,
      edadTrabajador,
      reason: 'Edad fuera de rango',
    };
  }

  // All validations passed
  return null;
}

/**
 * Validates that all CIE-10 diagnoses in a Nota Médica comply
 * with sex and age restrictions from the official catalog.
 *
 * @param params - Validation parameters
 * @returns Validation result with list of issues found
 *
 * @example
 * const result = await validateCie10SexAgeAgainstCatalog({
 *   trabajadorSexo: 'MUJER',
 *   trabajadorFechaNacimiento: new Date('1990-01-01'),
 *   fechaNotaMedica: new Date('2024-01-01'),
 *   cie10Fields: [
 *     { field: 'codigoCIE10Principal', value: 'C53' },
 *     { field: 'codigosCIE10Complementarios', value: ['C50'] }
 *   ],
 *   lookup: lookupService.findDiagnosisRule.bind(lookupService)
 * });
 */
export async function validateCie10SexAgeAgainstCatalog(
  params: CIE10CatalogValidationParams,
): Promise<CIE10CatalogValidationResult> {
  const {
    trabajadorSexo,
    trabajadorFechaNacimiento,
    fechaNotaMedica,
    cie10Fields,
    lookup,
  } = params;

  // Normalize sex
  const sexoTrabajador = normalizeSexo(trabajadorSexo);
  if (!sexoTrabajador) {
    // Sex not recognized, don't validate (fallback)
    return { ok: true, issues: [] };
  }

  // Calculate age
  const fechaReferencia = fechaNotaMedica || new Date();
  let edadTrabajador: number;

  try {
    edadTrabajador = calculateAge(trabajadorFechaNacimiento, fechaReferencia);
  } catch (error) {
    // Error calculating age, don't validate (fallback)
    console.warn('Error calculando edad para validación CIE-10:', error);
    return { ok: true, issues: [] };
  }

  // Collect all CIE-10 codes
  const codes = collectCIE10Codes(cie10Fields);

  if (codes.length === 0) {
    // No codes to validate
    return { ok: true, issues: [] };
  }

  // Validate each code
  const issues: CIE10CatalogValidationIssue[] = [];

  for (const { field, value } of codes) {
    const issue = await validateSingleCIE10Code(
      value,
      field,
      sexoTrabajador,
      edadTrabajador,
      trabajadorFechaNacimiento,
      fechaReferencia,
      lookup,
    );
    if (issue) {
      issues.push(issue);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
