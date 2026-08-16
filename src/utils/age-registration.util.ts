/**
 * Validación de edad para registro (trabajadores/firmantes).
 * Regla: duración calendario exacta desde fecha de nacimiento.
 * (referencia − maxYears) ≤ fechaNacimiento ≤ (referencia − minYears)
 */

const DATE_ONLY_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

function toLocalDateOnly(year: number, month: number, day: number): Date {
  const local = new Date(year, month - 1, day);
  if (
    local.getFullYear() !== year ||
    local.getMonth() !== month - 1 ||
    local.getDate() !== day
  ) {
    throw new Error('Fecha inválida');
  }
  return local;
}

function isUtcDateOnlyStorage(date: Date): boolean {
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

function dateComponentsFromDateOnlyValue(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  if (isUtcDateOnlyStorage(date)) {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  }

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export function parseDateOnlyValue(date: Date | string): Date {
  if (date instanceof Date) {
    if (isNaN(date.getTime())) {
      throw new Error('Fecha inválida');
    }
    const { year, month, day } = dateComponentsFromDateOnlyValue(date);
    return toLocalDateOnly(year, month, day);
  }

  const trimmed = date.trim();
  const match = DATE_ONLY_PREFIX.exec(trimmed);
  if (match) {
    return toLocalDateOnly(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
    );
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    throw new Error('Fecha inválida');
  }
  const { year, month, day } = dateComponentsFromDateOnlyValue(parsed);
  return toLocalDateOnly(year, month, day);
}

export function normalizeDateOnly(date: Date | string): Date {
  return parseDateOnlyValue(date);
}

export function subtractCalendarYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() - years);
  return result;
}

export interface BirthDateBounds {
  min: Date;
  max: Date;
}

export interface ExactAgeDuration {
  years: number;
  months: number;
  days: number;
}

export function getBirthDateBounds(
  fechaReferencia: Date | string,
  minYears: number,
  maxYears: number,
): BirthDateBounds {
  const referencia = normalizeDateOnly(fechaReferencia);
  return {
    min: normalizeDateOnly(subtractCalendarYears(referencia, maxYears)),
    max: normalizeDateOnly(subtractCalendarYears(referencia, minYears)),
  };
}

export function isBirthDateInRegistrationRange(
  fechaNacimiento: Date | string,
  fechaReferencia: Date | string,
  minYears: number,
  maxYears: number,
): boolean {
  const birth = normalizeDateOnly(fechaNacimiento);
  const { min, max } = getBirthDateBounds(fechaReferencia, minYears, maxYears);
  return birth >= min && birth <= max;
}

export function calculateExactAgeDuration(
  fechaNacimiento: Date | string,
  fechaReferencia: Date | string = new Date(),
): ExactAgeDuration {
  const birth = normalizeDateOnly(fechaNacimiento);
  const ref = normalizeDateOnly(fechaReferencia);

  let years = ref.getFullYear() - birth.getFullYear();
  let months = ref.getMonth() - birth.getMonth();
  let days = ref.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(ref.getFullYear(), ref.getMonth(), 0).getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
}

export function formatExactAgeDuration(duration: ExactAgeDuration): string {
  return `${duration.years} años, ${duration.months} meses y ${duration.days} días`;
}

export function buildRegistrationAgeRangeMessage(
  minYears: number,
  maxYears: number,
  fechaNacimiento: Date | string,
  fechaReferencia: Date | string = new Date(),
): string {
  const duration = calculateExactAgeDuration(
    fechaNacimiento,
    fechaReferencia,
  );
  return `Edad fuera de rango (${minYears} a ${maxYears} años, incluyendo meses y días). Edad calculada: ${formatExactAgeDuration(duration)}.`;
}
