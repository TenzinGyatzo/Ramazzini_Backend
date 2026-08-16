import { BadRequestException } from '@nestjs/common';
import {
  isBirthDateInRegistrationRange,
  normalizeDateOnly,
  buildRegistrationAgeRangeMessage,
} from '../../../utils/age-registration.util';

// Constantes de política
export const AGE_MIN_YEARS = 18;
export const AGE_MAX_YEARS = 100;

/**
 * Normaliza una fecha a objeto Date (date-only, sin hora)
 * Acepta Date o string ISO
 */
function normalizeDate(date: Date | string): Date {
  const fecha = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(fecha.getTime())) {
    throw new BadRequestException('Fecha inválida');
  }
  // Normalizar a medianoche (date-only)
  const normalized = new Date(fecha);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Valida fechaNacimiento con rango de edad configurable (duración calendario exacta).
 */
function normalizeBirthDate(date: Date | string): Date {
  try {
    return normalizeDateOnly(date);
  } catch {
    throw new BadRequestException('Fecha inválida');
  }
}

export function validateFechaNacimientoWithRange(
  fechaNacimiento: Date | string,
  minYears: number,
  maxYears: number,
): void {
  const fecha = normalizeBirthDate(fechaNacimiento);
  const hoy = normalizeDateOnly(new Date());

  if (fecha > hoy) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      ruleId: 'A2',
      message: 'La fecha de nacimiento no puede ser futura',
    });
  }

  if (
    !isBirthDateInRegistrationRange(fecha, hoy, minYears, maxYears)
  ) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      ruleId: 'A2',
      message: buildRegistrationAgeRangeMessage(
        minYears,
        maxYears,
        fecha,
        hoy,
      ),
    });
  }
}

/**
 * Valida fechaNacimiento (A2):
 * - No puede ser futura
 * - La edad resultante debe estar entre AGE_MIN_YEARS y AGE_MAX_YEARS
 *
 * @param fechaNacimiento - Fecha de nacimiento (Date o string ISO)
 * @returns void - Lanza BadRequestException si es inválida
 */
export function validateFechaNacimiento(fechaNacimiento: Date | string): void {
  validateFechaNacimientoWithRange(
    fechaNacimiento,
    AGE_MIN_YEARS,
    AGE_MAX_YEARS,
  );
}

export const FIRMANTE_AGE_MIN_YEARS = 18;
export const FIRMANTE_AGE_MAX_YEARS = 90;

export function validateFechaNacimientoFirmante(
  fechaNacimiento: Date | string,
): void {
  validateFechaNacimientoWithRange(
    fechaNacimiento,
    FIRMANTE_AGE_MIN_YEARS,
    FIRMANTE_AGE_MAX_YEARS,
  );
}

/**
 * Valida fechaDocumento contra fechaNacimiento y hoy (E1 genérico):
 * - fechaDocumento <= hoy
 * - fechaDocumento >= fechaNacimiento (si se proporciona)
 *
 * @param fechaDocumento - Fecha del documento (Date o string ISO)
 * @param fechaNacimiento - Fecha de nacimiento del trabajador (Date, string ISO, o null)
 * @returns void - Lanza BadRequestException si es inválida
 */
export function validateFechaDocumento(
  fechaDocumento: Date | string,
  fechaNacimiento?: Date | string | null,
  options?: { rejectFuture?: boolean },
): void {
  const rejectFuture = options?.rejectFuture !== false;
  const fechaDoc = normalizeDate(fechaDocumento);
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999); // Permitir hasta fin del día actual

  // Validar que no sea futura
  if (rejectFuture && fechaDoc > hoy) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      ruleId: 'E1',
      message: 'La fecha del documento no puede ser futura',
    });
  }

  // Validar que no sea anterior a fechaNacimiento (si se proporciona)
  if (fechaNacimiento) {
    const fechaNac = normalizeDate(fechaNacimiento);
    if (fechaDoc < fechaNac) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        ruleId: 'E1',
        message:
          'La fecha del documento no puede ser anterior a la fecha de nacimiento del trabajador',
      });
    }
  }
}
