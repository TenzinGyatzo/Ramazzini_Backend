/**
 * CIE-10 Age Limit Parser Utility
 *
 * Parses age limit values from the CIE-10 catalog (LINF/LSUP columns)
 * Format: 3 digits + unit code (A/D/M/Y)
 * Examples: "010A" (10 years), "028D" (28 days), "120A" (120 years), "NO" (no limit)
 */

export type CatalogAgeUnit = 'D' | 'M' | 'A';

export interface CatalogAgeLimit {
  value: number;
  unit: CatalogAgeUnit;
}

/**
 * Parses LINF/LSUP into native catalog units (days, months, years).
 * "NO" / empty / invalid → null (no limit).
 */
export function parseCatalogAgeLimit(
  value: string | null | undefined,
): CatalogAgeLimit | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().toUpperCase();
  if (trimmed === 'NO' || trimmed === '') {
    return null;
  }

  const match = trimmed.match(/^(\d{3})([ADMY])$/);
  if (!match) {
    return null;
  }

  const numericValue = parseInt(match[1], 10);
  if (isNaN(numericValue) || numericValue < 0) {
    return null;
  }

  const rawUnit = match[2];
  const unit: CatalogAgeUnit = rawUnit === 'Y' ? 'A' : (rawUnit as CatalogAgeUnit);
  return { value: numericValue, unit };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Adds a catalog age limit to a birth date (calendar arithmetic). */
export function addCatalogAgeLimit(birthDate: Date, limit: CatalogAgeLimit): Date {
  const result = startOfDay(birthDate);
  if (limit.unit === 'D') {
    result.setDate(result.getDate() + limit.value);
    return result;
  }
  if (limit.unit === 'M') {
    result.setMonth(result.getMonth() + limit.value);
    return result;
  }
  result.setFullYear(result.getFullYear() + limit.value);
  return result;
}

/**
 * Parses an age limit value from the catalog format to years (number).
 * Prefer parseCatalogAgeLimit + calendar comparison for SIS validation.
 */
export function parseAgeLimit(value: string | null | undefined): number | null {
  const parsed = parseCatalogAgeLimit(value);
  if (!parsed) {
    if (!value || typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim().toUpperCase();
    if (trimmed === 'NO' || trimmed === '') {
      return null;
    }
    const numValue = parseInt(trimmed, 10);
    if (!isNaN(numValue) && numValue >= 0 && /^\d+$/.test(trimmed)) {
      return numValue;
    }
    return null;
  }

  switch (parsed.unit) {
    case 'A':
      return parsed.value;
    case 'D':
      return parsed.value / 365.25;
    case 'M':
      return parsed.value / 12;
    default:
      return parsed.value;
  }
}
