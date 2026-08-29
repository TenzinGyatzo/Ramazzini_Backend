const moment = require('moment-timezone');

export const DEFAULT_INICIO_TIMEZONE = 'America/Mexico_City';

const PAIS_TO_TIMEZONE: Record<string, string> = {
  MX: 'America/Mexico_City',
  GT: 'America/Guatemala',
};

export function isValidIanaTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }
  return moment.tz.zone(timezone.trim()) != null;
}

export function resolveInicioTimezone(proveedor: {
  timezone?: string;
  pais?: string;
} | null | undefined): string {
  const legacy = proveedor?.timezone?.trim();
  if (legacy && isValidIanaTimezone(legacy)) {
    return legacy;
  }

  const pais = proveedor?.pais?.trim().toUpperCase();
  if (pais && PAIS_TO_TIMEZONE[pais]) {
    return PAIS_TO_TIMEZONE[pais];
  }

  return DEFAULT_INICIO_TIMEZONE;
}

export function getInicioDateKey(
  timezone: string,
  referenceDate: Date = new Date(),
): string {
  const tz = isValidIanaTimezone(timezone)
    ? timezone
    : DEFAULT_INICIO_TIMEZONE;
  return moment(referenceDate).tz(tz).format('YYYY-MM-DD');
}

export function getInicioDayBounds(
  timezone: string,
  referenceDate: Date = new Date(),
): { start: Date; end: Date; dateKey: string } {
  const tz = isValidIanaTimezone(timezone)
    ? timezone
    : DEFAULT_INICIO_TIMEZONE;
  const dateKey = moment(referenceDate).tz(tz).format('YYYY-MM-DD');
  const start = moment.tz(dateKey, tz).startOf('day').toDate();
  const end = moment.tz(dateKey, tz).add(1, 'day').startOf('day').toDate();
  return { start, end, dateKey };
}
