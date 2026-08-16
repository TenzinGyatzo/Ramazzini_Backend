import { BadRequestException } from '@nestjs/common';
import {
  validateCurpNameCaptureField,
  validateCurpPersonNameCapture,
} from './curp-name-capture-validation.util';
import {
  validatePersonNameCharacters,
} from './person-name-character-validation.util';
import {
  PERSON_NAME_MAX_LENGTH,
  PERSON_NAME_MIN_LENGTH,
  personNameLengthMessage,
} from './constants/person-name.constants';
import {
  collapsePersonNameWhitespace,
  normalizeTrabajadorPersonName,
} from './normalization';

/**
 * NOM-024 Name Validator Utility
 *
 * Validates and normalizes person names according to NOM-024 requirements.
 * Enforces rules for Mexican providers, provides warnings for non-MX.
 */

/**
 * Common abbreviations that are NOT allowed in NOM-024 names
 * These include professional titles, honorifics, and common abbreviations
 */
const FORBIDDEN_ABBREVIATIONS = [
  // Professional titles
  'DR.',
  'DRA.',
  'ING.',
  'LIC.',
  'ARQ.',
  'C.P.',
  'CP.',
  'MTRO.',
  'MTRA.',
  'PROF.',
  'PROFA.',
  // Honorifics
  'SR.',
  'SRA.',
  'SRTA.',
  'DON',
  'DOÑA',
  // Military/Police ranks
  'GRAL.',
  'CNEL.',
  'CAP.',
  'TTE.',
  'CMTE.',
  // Religious
  'PBRO.',
  'HNA.',
  'FRAY',
  // Other common abbreviations
  'JR.',
  'JR',
  'III',
  'II',
  'IV',
];

/**
 * Patterns that indicate abbreviations (ending with period after short text)
 */
const ABBREVIATION_PATTERNS = [
  /^[A-Z]{1,4}\.\s*/i, // Starts with 1-4 letters followed by period
  /\s[A-Z]{1,4}\.\s*/i, // Word with 1-4 letters followed by period
  /\s[A-Z]{1,4}\.$/i, // Ends with 1-4 letters followed by period
];

export interface NameValidationResult {
  isValid: boolean;
  normalizedValue: string;
  errors: string[];
  warnings: string[];
}

/**
 * Detects if a name contains forbidden abbreviations
 *
 * @param name - Name string to check
 * @returns Array of found abbreviations
 */
export function detectAbbreviations(name: string): string[] {
  if (!name || typeof name !== 'string') {
    return [];
  }

  const upperName = name.toUpperCase().trim();
  const foundAbbreviations: string[] = [];

  // Check against known abbreviations
  for (const abbr of FORBIDDEN_ABBREVIATIONS) {
    // Check if name starts with abbreviation
    if (upperName.startsWith(abbr + ' ') || upperName === abbr) {
      foundAbbreviations.push(abbr);
      continue;
    }
    // Check if name contains abbreviation as separate word
    if (
      upperName.includes(' ' + abbr + ' ') ||
      upperName.endsWith(' ' + abbr)
    ) {
      foundAbbreviations.push(abbr);
    }
  }

  // Check for pattern-based abbreviations
  for (const pattern of ABBREVIATION_PATTERNS) {
    if (pattern.test(upperName)) {
      // Extract the abbreviation that matched
      const match = upperName.match(pattern);
      if (match && match[0]) {
        const abbr = match[0].trim();
        if (!foundAbbreviations.includes(abbr)) {
          foundAbbreviations.push(abbr);
        }
      }
    }
  }

  return foundAbbreviations;
}

/**
 * Removes detected abbreviations from a name
 *
 * @param name - Name string to clean
 * @returns Cleaned name without abbreviations
 */
export function removeAbbreviations(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  let cleaned = name.toUpperCase().trim();

  // Remove known abbreviations
  for (const abbr of FORBIDDEN_ABBREVIATIONS) {
    // Remove from start
    const startPattern = new RegExp(`^${escapeRegex(abbr)}\\s+`, 'i');
    cleaned = cleaned.replace(startPattern, '');
    // Remove from middle/end
    const middlePattern = new RegExp(`\\s+${escapeRegex(abbr)}(\\s+|$)`, 'gi');
    cleaned = cleaned.replace(middlePattern, ' ');
  }

  // Clean up multiple spaces and trim
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates a name field according to NOM-024 rules
 *
 * @param name - Name value to validate
 * @param fieldName - Human-readable field name for error messages
 * @param maxLength - Maximum allowed length (default 50)
 * @returns NameValidationResult with validation status and normalized value
 */
export function validatePersonNameFields(
  nombre: string | undefined | null,
  primerApellido: string | undefined | null,
  segundoApellido?: string | undefined | null,
  regime?: string | null,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const checkLength = (
    value: string | undefined | null,
    fieldLabel: string,
    required: boolean,
  ) => {
    const trimmed = value == null ? '' : String(value).trim();
    if (trimmed === '') {
      if (required) {
        errors.push(`${fieldLabel} es requerido`);
      }
      return;
    }

    if (
      trimmed.length < PERSON_NAME_MIN_LENGTH ||
      trimmed.length > PERSON_NAME_MAX_LENGTH
    ) {
      errors.push(personNameLengthMessage(fieldLabel));
    }
  };

  checkLength(nombre, 'Nombre', true);
  checkLength(primerApellido, 'Primer apellido', false);
  checkLength(segundoApellido, 'Segundo apellido', false);

  const primerTrimmed =
    primerApellido == null ? '' : String(primerApellido).trim();
  const segundoTrimmed =
    segundoApellido == null ? '' : String(segundoApellido).trim();
  if (segundoTrimmed !== '' && primerTrimmed === '') {
    errors.push(
      'No puede registrar segundo apellido sin primer apellido',
    );
  }

  const characterResults = [
    validatePersonNameCharacters(nombre, 'Nombre', regime),
    validatePersonNameCharacters(primerApellido, 'Primer apellido', regime),
    validatePersonNameCharacters(segundoApellido, 'Segundo apellido', regime),
  ];
  errors.push(...characterResults.flatMap((result) => result.errors));

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateNameField(
  name: string | undefined | null,
  fieldName: string,
  maxLength: number = PERSON_NAME_MAX_LENGTH,
  regime?: string | null,
): NameValidationResult {
  const result: NameValidationResult = {
    isValid: true,
    normalizedValue: '',
    errors: [],
    warnings: [],
  };

  // Handle empty/null
  if (!name || typeof name !== 'string' || name.trim() === '') {
    result.normalizedValue = '';
    return result; // Empty is handled separately (required vs optional)
  }

  const normalizedName =
    normalizeTrabajadorPersonName(name, regime) ??
    collapsePersonNameWhitespace(name);
  result.normalizedValue = normalizedName;

  if (normalizedName.length < PERSON_NAME_MIN_LENGTH) {
    result.isValid = false;
    result.errors.push(personNameLengthMessage(fieldName));
  }

  // Check max length
  if (normalizedName.length > maxLength) {
    result.isValid = false;
    result.errors.push(personNameLengthMessage(fieldName));
  }

  // Check for abbreviations
  const abbreviations = detectAbbreviations(normalizedName);
  if (abbreviations.length > 0) {
    result.isValid = false;
    result.errors.push(
      `${fieldName} contiene abreviaciones no permitidas: ${abbreviations.join(', ')}. ` +
        'NOM-024 requiere nombres completos sin abreviaciones.',
    );
    // Provide cleaned version
    result.normalizedValue = removeAbbreviations(normalizedName);
  }

  // Check for trailing periods (often leftover from abbreviations)
  if (normalizedName.endsWith('.')) {
    result.isValid = false;
    result.errors.push(
      `${fieldName} no debe terminar con punto (posible abreviación)`,
    );
    result.normalizedValue = normalizedName.replace(/\.+$/, '').trim();
  }

  const curpCapture = validateCurpNameCaptureField(
    normalizedName,
    fieldName,
    regime,
  );
  if (!curpCapture.isValid) {
    result.isValid = false;
    result.errors.push(...curpCapture.errors);
  }

  return result;
}

/**
 * Validates all name fields for a Trabajador
 *
 * @param nombre - First name(s)
 * @param primerApellido - First surname (paternal)
 * @param segundoApellido - Second surname (maternal, optional)
 * @returns Combined validation result
 */
export function validateTrabajadorNames(
  nombre: string | undefined | null,
  primerApellido: string | undefined | null,
  segundoApellido: string | undefined | null,
  regime?: string | null,
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalized: {
    nombre: string;
    primerApellido: string;
    segundoApellido: string;
  };
} {
  const nombreResult = validateNameField(nombre, 'Nombre', PERSON_NAME_MAX_LENGTH, regime);
  const primerApellidoResult = validateNameField(
    primerApellido,
    'Primer apellido',
    PERSON_NAME_MAX_LENGTH,
    regime,
  );
  const segundoApellidoResult = validateNameField(
    segundoApellido,
    'Segundo apellido',
    PERSON_NAME_MAX_LENGTH,
    regime,
  );

  return {
    isValid:
      nombreResult.isValid &&
      primerApellidoResult.isValid &&
      segundoApellidoResult.isValid,
    errors: [
      ...nombreResult.errors,
      ...primerApellidoResult.errors,
      ...segundoApellidoResult.errors,
    ],
    warnings: [
      ...nombreResult.warnings,
      ...primerApellidoResult.warnings,
      ...segundoApellidoResult.warnings,
    ],
    normalized: {
      nombre: nombreResult.normalizedValue,
      primerApellido: primerApellidoResult.normalizedValue,
      segundoApellido: segundoApellidoResult.normalizedValue,
    },
  };
}

export function assertValidPersonNameFields(
  nombre: string | undefined | null,
  primerApellido: string | undefined | null,
  segundoApellido?: string | undefined | null,
  regime?: string | null,
): void {
  const validation = validatePersonNameFields(
    nombre,
    primerApellido,
    segundoApellido,
    regime,
  );

  if (!validation.isValid) {
    throw new BadRequestException(validation.errors.join('. '));
  }
}
