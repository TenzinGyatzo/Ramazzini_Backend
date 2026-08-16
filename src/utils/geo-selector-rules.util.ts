import {
  GIIS_ENTIDAD_NO_APLICA,
  GIIS_ENTIDAD_NO_ESPECIFICADO,
  GIIS_ENTIDAD_SE_IGNORA,
  GIIS_LOCALIDAD_NO_ESPECIFICADO,
  GIIS_LOCALIDAD_SE_IGNORA,
  GIIS_MUNICIPIO_NO_ESPECIFICADO,
  GIIS_MUNICIPIO_SE_IGNORA,
  PAIS_RESIDENCIA_MEXICO,
  PAIS_RESIDENCIA_NO_ESPECIFICADO,
  isEntidadEstatalResidencia,
  normalizeEntidadResidencia,
} from './giis-residencia-geo.util';

export type GeoFormContext = 'trabajador' | 'firmante';

/** CATALOG_KEY cat_pais: OTRO */
export const PAIS_OTRO = 246;

/** CATALOG_KEY cat_pais: SE IGNORA */
export const PAIS_SE_IGNORA = 247;

const MEXICAN_ENTIDAD_CODES = Array.from({ length: 32 }, (_, index) =>
  String(index + 1).padStart(2, '0'),
);

/**
 * País ≠ México (nacimiento): solo NO APLICA, igual que residencia.
 * Literal '88' (no importar GIIS_ENTIDAD_NO_APLICA aquí): evita ciclo con giis-residencia-geo.util.
 */
const NON_MEXICO_ENTIDAD_CODES = ['88'];

const EXCLUDED_ENTIDAD_CODES_FIRMANTE = [
  GIIS_ENTIDAD_NO_ESPECIFICADO,
  GIIS_ENTIDAD_SE_IGNORA,
];

const EXCLUDED_PAIS_CODES_FIRMANTE = [String(PAIS_SE_IGNORA), String(PAIS_RESIDENCIA_NO_ESPECIFICADO)];

const EXCLUDED_MUNICIPIO_CODES_FIRMANTE = [
  GIIS_MUNICIPIO_NO_ESPECIFICADO,
  GIIS_MUNICIPIO_SE_IGNORA,
];

const EXCLUDED_LOCALIDAD_CODES_FIRMANTE = [
  GIIS_LOCALIDAD_NO_ESPECIFICADO,
  GIIS_LOCALIDAD_SE_IGNORA,
];

export function normalizePaisCode(
  value: string | number | null | undefined,
): number | null {
  if (value === '' || value == null) return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(num) ? null : num;
}

export function isMexicoPais(pais: number | null | undefined): boolean {
  return pais === PAIS_RESIDENCIA_MEXICO;
}

export function isNonMexicoPais(pais: number | null | undefined): boolean {
  return pais != null && pais !== PAIS_RESIDENCIA_MEXICO;
}

export function getMexicanEntidadCodes(): string[] {
  return [...MEXICAN_ENTIDAD_CODES];
}

export function getNonMexicoEntidadCodes(_context?: GeoFormContext): string[] {
  return [...NON_MEXICO_ENTIDAD_CODES];
}

export function isEntidadNacimientoEspecialForFirmante(
  entidad: string | undefined | null,
): boolean {
  const normalized = normalizeEntidadResidencia(entidad);
  if (!normalized) return false;
  return NON_MEXICO_ENTIDAD_CODES.includes(
    normalized as (typeof NON_MEXICO_ENTIDAD_CODES)[number],
  );
}

export function getExcludedPaisCodes(context: GeoFormContext): string[] {
  return context === 'firmante' ? [...EXCLUDED_PAIS_CODES_FIRMANTE] : [];
}

export function getExcludedEntidadCodes(context: GeoFormContext): string[] {
  return context === 'firmante' ? [...EXCLUDED_ENTIDAD_CODES_FIRMANTE] : [];
}

export function getAllowedEntidadCodesForPais(
  pais: number | null,
  context: GeoFormContext,
): string[] | undefined {
  return getAllowedEntidadCodesForPaisNacimiento(pais, context);
}

export function getMexicoEntidadResidenciaAllowedCodes(
  context: GeoFormContext,
): string[] {
  if (context === 'firmante') {
    return getMexicanEntidadCodes();
  }
  return [
    GIIS_ENTIDAD_NO_ESPECIFICADO,
    GIIS_ENTIDAD_SE_IGNORA,
    ...getMexicanEntidadCodes(),
  ];
}

/** México → 00/99/01-32 (trabajador) o 01-32 (firmante); extranjero → solo 88 */
export function getAllowedEntidadCodesForPaisNacimiento(
  pais: number | null,
  context: GeoFormContext,
): string[] | undefined {
  if (pais == null) return undefined;
  if (isMexicoPais(pais)) {
    return getMexicoEntidadResidenciaAllowedCodes(context);
  }
  return getNonMexicoEntidadCodes(context);
}

export function getAllowedEntidadCodesForPaisResidencia(
  pais: number | null,
  context: GeoFormContext,
): string[] | undefined {
  if (pais == null) return undefined;
  if (isMexicoPais(pais)) {
    return getMexicoEntidadResidenciaAllowedCodes(context);
  }
  return [GIIS_ENTIDAD_NO_APLICA];
}

export function isEntidadAllowedForPaisNacimiento(
  entidad: string | undefined | null,
  pais: number | null,
  context: GeoFormContext,
): boolean {
  const normalized = normalizeEntidadResidencia(entidad);
  if (!normalized) return false;
  const allowed = getAllowedEntidadCodesForPaisNacimiento(pais, context);
  if (!allowed) return true;
  return allowed.includes(normalized);
}

export function isEntidadAllowedForPaisResidencia(
  entidad: string | undefined | null,
  pais: number | null,
  context: GeoFormContext,
): boolean {
  const normalized = normalizeEntidadResidencia(entidad);
  if (!normalized) return false;
  const allowed = getAllowedEntidadCodesForPaisResidencia(pais, context);
  if (!allowed) return true;
  return allowed.includes(normalized);
}

export function isEntidadAllowedForPais(
  entidad: string | undefined | null,
  pais: number | null,
  context: GeoFormContext,
): boolean {
  return isEntidadAllowedForPaisNacimiento(entidad, pais, context);
}

export function getMunicipioSentinelCodesForSelector(
  context: GeoFormContext,
  entidad: string,
  pais: number | null,
): string[] {
  if (context === 'firmante') return [];
  if (!isMexicoPais(pais) || !isEntidadEstatalResidencia(entidad)) return [];
  return [GIIS_MUNICIPIO_NO_ESPECIFICADO, GIIS_MUNICIPIO_SE_IGNORA];
}

export function getLocalidadSentinelCodesForSelector(
  context: GeoFormContext,
  entidad: string,
  municipio: string,
  pais: number | null,
): string[] {
  if (context === 'firmante') return [];
  if (!isMexicoPais(pais) || !isEntidadEstatalResidencia(entidad)) return [];
  const mun = String(municipio ?? '').trim();
  if (!mun || mun === GIIS_MUNICIPIO_NO_ESPECIFICADO || mun === GIIS_MUNICIPIO_SE_IGNORA) {
    return [];
  }
  return [GIIS_LOCALIDAD_NO_ESPECIFICADO, GIIS_LOCALIDAD_SE_IGNORA];
}

export function validatePaisEntidadCoherence(
  pais: number,
  entidad: string,
  context: GeoFormContext,
  fieldPrefix: 'nacimiento' | 'residencia',
): string[] {
  const errors: string[] = [];
  const normalized = normalizeEntidadResidencia(entidad);
  if (!normalized) return errors;

  const excludedPais = getExcludedPaisCodes(context);
  if (excludedPais.includes(String(pais))) {
    errors.push(
      `País de ${fieldPrefix} ${pais} no está permitido para ${context === 'firmante' ? 'firmantes' : 'trabajadores'}`,
    );
  }

  const excludedEntidad = getExcludedEntidadCodes(context);
  if (excludedEntidad.includes(normalized)) {
    errors.push(
      `Entidad de ${fieldPrefix} ${normalized} no está permitida para ${context === 'firmante' ? 'firmantes' : 'trabajadores'}`,
    );
    return errors;
  }

  const isAllowed =
    fieldPrefix === 'nacimiento'
      ? isEntidadAllowedForPaisNacimiento(normalized, pais, context)
      : isEntidadAllowedForPaisResidencia(normalized, pais, context);

  if (!isAllowed) {
    if (fieldPrefix === 'nacimiento') {
      if (isMexicoPais(pais)) {
        errors.push(
          context === 'firmante'
            ? 'Con país México (142) la entidad de nacimiento debe ser una entidad federativa (01-32)'
            : 'Con país México (142) la entidad de nacimiento debe ser 00, 99 o una entidad federativa (01-32)',
        );
      } else {
        errors.push(
          'País de nacimiento distinto de México requiere entidad 88 (NO APLICA)',
        );
      }
    } else if (isMexicoPais(pais)) {
      errors.push(
        context === 'firmante'
          ? 'Con país México (142) la entidad de residencia debe ser una entidad federativa (01-32)'
          : 'Con país México (142) la entidad de residencia debe ser 00, 99 o una entidad federativa (01-32)',
      );
    } else {
      errors.push(
        'País de residencia distinto de México requiere entidad 88 (NO APLICA)',
      );
    }
  }

  return errors;
}

export function validateFirmanteResidenciaSentinels(
  entidad: string,
  municipio: string,
  localidad: string,
): string[] {
  const errors: string[] = [];
  const ent = normalizeEntidadResidencia(entidad);
  const mun = String(municipio ?? '').trim();
  const loc = String(localidad ?? '').trim();

  if (EXCLUDED_ENTIDAD_CODES_FIRMANTE.includes(ent)) {
    errors.push(`Entidad de residencia ${ent} no está permitida para firmantes`);
  }
  if (EXCLUDED_MUNICIPIO_CODES_FIRMANTE.includes(mun)) {
    errors.push(`Municipio de residencia ${mun} no está permitido para firmantes`);
  }
  if (EXCLUDED_LOCALIDAD_CODES_FIRMANTE.includes(loc)) {
    errors.push(`Localidad de residencia ${loc} no está permitida para firmantes`);
  }

  return errors;
}
