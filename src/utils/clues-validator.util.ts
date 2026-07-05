/**
 * CLUES Validator Utility
 *
 * Validates CLUES (Clave Única de Establecimiento de Salud) format for NOM-024.
 * Accepts 11 alphanumeric characters or sentinel 9998 (servicios médicos privados).
 */

/** Sentinel CLUES for private medical services without a registered establishment */
export const CLUES_SERVICIOS_MEDICOS_PRIVADOS = '9998';

const CLUES_FORMAT_REGEX = /^[A-Z0-9]{11}$/;

/** Regex for class-validator: empty, 9998, or 11 alphanumeric chars */
export const CLUES_VALIDATION_REGEX = /^$|^9998$|^[A-Z0-9]{11}$/;

export const CLUES_VALIDATION_MESSAGE =
  'CLUES debe tener exactamente 11 caracteres alfanuméricos (solo letras mayúsculas y números) o el código 9998 (servicios médicos privados)';

export function normalizeClues(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidCluesFormat(clues: string): boolean {
  const normalized = normalizeClues(clues);
  return (
    normalized === CLUES_SERVICIOS_MEDICOS_PRIVADOS ||
    CLUES_FORMAT_REGEX.test(normalized)
  );
}

export function requiresCluesCatalogValidation(clues: string): boolean {
  return normalizeClues(clues) !== CLUES_SERVICIOS_MEDICOS_PRIVADOS;
}
