/**
 * Validación de captura de nombres/apellidos según instructivo CURP (RENAPO).
 * Permite caracteres especiales / - . ' y diéresis solo en vocales a, e, i, o, u.
 */

import { isDieresisVowel } from './curp-name-char.util';

const CURP_SPECIAL_CHARS = new Set(["'", '/', '.', '-']);

const UMLAUT_U = new Set(['Ü', 'ü']);

const ACCENTED_VOWELS = new Set([
  'Á',
  'É',
  'Í',
  'Ó',
  'Ú',
  'á',
  'é',
  'í',
  'ó',
  'ú',
]);

export interface CurpNameCaptureValidationResult {
  isValid: boolean;
  errors: string[];
}

function isBasicLetter(char: string): boolean {
  return /^[A-Za-zÑñ]$/.test(char);
}

function isAllowedCurpNameChar(char: string): boolean {
  if (char === ' ') {
    return true;
  }

  if (CURP_SPECIAL_CHARS.has(char)) {
    return true;
  }

  if (isDieresisVowel(char) || UMLAUT_U.has(char)) {
    return true;
  }

  if (ACCENTED_VOWELS.has(char)) {
    return true;
  }

  return isBasicLetter(char);
}

/**
 * Valida que un campo de nombre/apellido solo contenga caracteres permitidos
 * para captura conforme al instructivo CURP (reglas 1.4, 1.6, 1.18).
 */
export function validateCurpNameCaptureField(
  value: string | undefined | null,
  fieldLabel: string,
): CurpNameCaptureValidationResult {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return { isValid: true, errors: [] };
  }

  const errors: string[] = [];
  const invalidChars = new Set<string>();

  for (const char of value) {
    if (!isAllowedCurpNameChar(char)) {
      invalidChars.add(char);
    }
  }

  if (invalidChars.size > 0) {
    errors.push(
      `${fieldLabel} contiene caracteres no permitidos: ${[...invalidChars].join(', ')}. ` +
        'Solo se permiten letras, espacios, / - . \' y diéresis en vocales (a, e, i, o, u).',
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valida nombre y apellidos para captura CURP.
 */
export function validateCurpPersonNameCapture(
  nombre: string | undefined | null,
  primerApellido?: string | undefined | null,
  segundoApellido?: string | undefined | null,
): CurpNameCaptureValidationResult {
  const results = [
    validateCurpNameCaptureField(nombre, 'Nombre'),
    validateCurpNameCaptureField(primerApellido, 'Primer apellido'),
    validateCurpNameCaptureField(segundoApellido, 'Segundo apellido'),
  ];

  const errors = results.flatMap((r) => r.errors);

  return {
    isValid: errors.length === 0,
    errors,
  };
}
