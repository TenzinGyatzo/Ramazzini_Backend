import {
  GeoFormContext,
  validateFirmanteResidenciaSentinels,
  validatePaisEntidadCoherence,
} from './geo-selector-rules.util';

/** CATALOG_KEY cat_pais: México */
export const PAIS_RESIDENCIA_MEXICO = 142;

/** CATALOG_KEY cat_pais: NO ESPECIFICADO */
export const PAIS_RESIDENCIA_NO_ESPECIFICADO = 248;

/** Entidades especiales GIIS / Renapo */
export const GIIS_ENTIDAD_NO_APLICA = '88';
export const GIIS_ENTIDAD_SE_IGNORA = '99';
export const GIIS_ENTIDAD_NO_ESPECIFICADO = '00';
export const RENAPO_ENTIDAD_EXTRANJERO = 'NE';

/** Municipios especiales GIIS */
export const GIIS_MUNICIPIO_NO_APLICA = '997';
export const GIIS_MUNICIPIO_SE_IGNORA = '998';
export const GIIS_MUNICIPIO_NO_ESPECIFICADO = '999';
export const INEGI_MUNICIPIO_NO_DISPONIBLE = '000';

/** Localidades especiales GIIS */
export const GIIS_LOCALIDAD_NO_APLICA = '9997';
export const GIIS_LOCALIDAD_SE_IGNORA = '9998';
export const GIIS_LOCALIDAD_NO_ESPECIFICADO = '9999';
export const INEGI_LOCALIDAD_NO_DISPONIBLE = '0000';

export const ENTIDADES_RESIDENCIA_ESPECIALES = [
  RENAPO_ENTIDAD_EXTRANJERO,
  GIIS_ENTIDAD_NO_ESPECIFICADO,
  GIIS_ENTIDAD_NO_APLICA,
  GIIS_ENTIDAD_SE_IGNORA,
] as const;

export const MUNICIPIOS_RESIDENCIA_ESPECIALES = [
  INEGI_MUNICIPIO_NO_DISPONIBLE,
  GIIS_MUNICIPIO_NO_APLICA,
  GIIS_MUNICIPIO_SE_IGNORA,
  GIIS_MUNICIPIO_NO_ESPECIFICADO,
] as const;

export const LOCALIDADES_RESIDENCIA_ESPECIALES = [
  INEGI_LOCALIDAD_NO_DISPONIBLE,
  GIIS_LOCALIDAD_NO_APLICA,
  GIIS_LOCALIDAD_SE_IGNORA,
  GIIS_LOCALIDAD_NO_ESPECIFICADO,
] as const;

export function normalizeEntidadResidencia(
  value: string | undefined | null,
): string {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

export function isEntidadResidenciaEspecial(
  code: string | undefined | null,
): boolean {
  return ENTIDADES_RESIDENCIA_ESPECIALES.includes(
    normalizeEntidadResidencia(code) as (typeof ENTIDADES_RESIDENCIA_ESPECIALES)[number],
  );
}

/** Trabajadores: entidad 00/99 exige CURP genérica XXXX999999XXXXXX99. */
export function requiresGenericCurpForEntidadNacimiento(
  entidad: string | undefined | null,
): boolean {
  const normalized = normalizeEntidadResidencia(entidad);
  return (
    normalized === GIIS_ENTIDAD_NO_ESPECIFICADO ||
    normalized === GIIS_ENTIDAD_SE_IGNORA
  );
}

export function isEntidadEstatalResidencia(
  entidad: string | undefined | null,
): boolean {
  const normalized = normalizeEntidadResidencia(entidad);
  const num = parseInt(normalized, 10);
  return !Number.isNaN(num) && num >= 1 && num <= 32;
}

export function isMunicipioGiisSentinel(code: string | undefined | null): boolean {
  const value = String(code ?? '').trim();
  return MUNICIPIOS_RESIDENCIA_ESPECIALES.includes(
    value as (typeof MUNICIPIOS_RESIDENCIA_ESPECIALES)[number],
  );
}

export function isLocalidadGiisSentinel(code: string | undefined | null): boolean {
  const value = String(code ?? '').trim();
  return LOCALIDADES_RESIDENCIA_ESPECIALES.includes(
    value as (typeof LOCALIDADES_RESIDENCIA_ESPECIALES)[number],
  );
}

export function getGiisGeoForEntidadResidencia(entidad: string): {
  municipio: string;
  localidad: string;
} | null {
  switch (normalizeEntidadResidencia(entidad)) {
    case GIIS_ENTIDAD_NO_APLICA:
    case RENAPO_ENTIDAD_EXTRANJERO:
      return {
        municipio: GIIS_MUNICIPIO_NO_APLICA,
        localidad: GIIS_LOCALIDAD_NO_APLICA,
      };
    case GIIS_ENTIDAD_SE_IGNORA:
      return {
        municipio: GIIS_MUNICIPIO_SE_IGNORA,
        localidad: GIIS_LOCALIDAD_SE_IGNORA,
      };
    case GIIS_ENTIDAD_NO_ESPECIFICADO:
      return {
        municipio: GIIS_MUNICIPIO_NO_ESPECIFICADO,
        localidad: GIIS_LOCALIDAD_NO_ESPECIFICADO,
      };
    default:
      return null;
  }
}

export function getGiisGeoForMunicipioResidencia(municipio: string): {
  localidad: string;
} | null {
  switch (String(municipio ?? '').trim()) {
    case GIIS_MUNICIPIO_NO_ESPECIFICADO:
    case INEGI_MUNICIPIO_NO_DISPONIBLE:
      return { localidad: GIIS_LOCALIDAD_NO_ESPECIFICADO };
    case GIIS_MUNICIPIO_SE_IGNORA:
      return { localidad: GIIS_LOCALIDAD_SE_IGNORA };
    case GIIS_MUNICIPIO_NO_APLICA:
      return { localidad: GIIS_LOCALIDAD_NO_APLICA };
    default:
      return null;
  }
}

export interface ResidenciaGeoGiisPayload {
  paisResidencia?: number | null;
  entidadResidencia?: string;
  municipioResidencia?: string;
  localidadResidencia?: string;
}

/**
 * Validación cruzada GIIS: país ↔ entidad ↔ municipio ↔ localidad de residencia.
 */
export function validateResidenciaGeoGiisCoherence(
  payload: ResidenciaGeoGiisPayload,
  geoContext: GeoFormContext = 'trabajador',
): string[] {
  const errors: string[] = [];
  const entidad = normalizeEntidadResidencia(payload.entidadResidencia);
  const municipio = String(payload.municipioResidencia ?? '').trim();
  const localidad = String(payload.localidadResidencia ?? '').trim();
  const paisRaw = payload.paisResidencia;
  const pais =
    paisRaw == null || Number.isNaN(Number(paisRaw)) ? null : Number(paisRaw);

  if (!entidad) return errors;

  if (pais != null) {
    errors.push(
      ...validatePaisEntidadCoherence(pais, entidad, geoContext, 'residencia'),
    );
  }

  if (geoContext === 'firmante') {
    errors.push(...validateFirmanteResidenciaSentinels(entidad, municipio, localidad));
  }

  const isMexico = pais === PAIS_RESIDENCIA_MEXICO;
  const isForeign = pais !== null && pais !== PAIS_RESIDENCIA_MEXICO;

  if (isForeign) {
    if (entidad !== GIIS_ENTIDAD_NO_APLICA && entidad !== RENAPO_ENTIDAD_EXTRANJERO) {
      errors.push(
        'País de residencia distinto de México requiere entidad 88 (NO APLICA)',
      );
    }
    if (municipio && municipio !== GIIS_MUNICIPIO_NO_APLICA) {
      errors.push(
        'País de residencia distinto de México requiere municipio 997 (NO APLICA)',
      );
    }
    if (localidad && localidad !== GIIS_LOCALIDAD_NO_APLICA) {
      errors.push(
        'País de residencia distinto de México requiere localidad 9997 (NO APLICA)',
      );
    }
    return errors;
  }

  if (isMexico) {
    if (
      entidad === GIIS_ENTIDAD_NO_APLICA ||
      entidad === RENAPO_ENTIDAD_EXTRANJERO
    ) {
      errors.push(
        'Entidad 88 (NO APLICA) o NE (Extranjero) no aplica cuando el país de residencia es México (142)',
      );
      return errors;
    }

    if (
      geoContext === 'firmante' &&
      (entidad === GIIS_ENTIDAD_NO_ESPECIFICADO ||
        entidad === GIIS_ENTIDAD_SE_IGNORA)
    ) {
      errors.push(
        'Entidad 00 (NO ESPECIFICADO) y 99 (SE IGNORA) no están permitidas para firmantes con país México',
      );
      return errors;
    }

    const allowedMexicoEntidades = new Set([
      ...(geoContext === 'trabajador'
        ? [GIIS_ENTIDAD_NO_ESPECIFICADO, GIIS_ENTIDAD_SE_IGNORA]
        : []),
      ...Array.from({ length: 32 }, (_, index) =>
        String(index + 1).padStart(2, '0'),
      ),
    ]);

    if (!allowedMexicoEntidades.has(entidad)) {
      errors.push(
        geoContext === 'firmante'
          ? 'Con país México (142) la entidad debe ser una entidad federativa (01-32)'
          : 'Con país México (142) la entidad debe ser 00, 99 o una entidad federativa (01-32)',
      );
    }
  }

  const expectedEntidadGeo = getGiisGeoForEntidadResidencia(entidad);
  if (expectedEntidadGeo) {
    if (municipio && municipio !== expectedEntidadGeo.municipio) {
      errors.push(
        `Con entidad ${entidad} el municipio de residencia debe ser ${expectedEntidadGeo.municipio}`,
      );
    }
    if (localidad && localidad !== expectedEntidadGeo.localidad) {
      errors.push(
        `Con entidad ${entidad} la localidad de residencia debe ser ${expectedEntidadGeo.localidad}`,
      );
    }
    return errors;
  }

  if (isEntidadEstatalResidencia(entidad) && municipio) {
    if (
      municipio === GIIS_MUNICIPIO_NO_APLICA ||
      municipio === INEGI_MUNICIPIO_NO_DISPONIBLE
    ) {
      errors.push(
        `Con entidad ${entidad} el municipio no puede ser ${municipio}`,
      );
      return errors;
    }

    if (
      geoContext === 'firmante' &&
      (municipio === GIIS_MUNICIPIO_NO_ESPECIFICADO ||
        municipio === GIIS_MUNICIPIO_SE_IGNORA)
    ) {
      errors.push(
        `Municipio ${municipio} no está permitido para firmantes`,
      );
      return errors;
    }

    const expectedMunGeo = getGiisGeoForMunicipioResidencia(municipio);
    if (expectedMunGeo) {
      if (localidad && localidad !== expectedMunGeo.localidad) {
        errors.push(
          `Con municipio ${municipio} la localidad de residencia debe ser ${expectedMunGeo.localidad}`,
        );
      }
      return errors;
    }

    if (localidad && isLocalidadGiisSentinel(localidad)) {
      if (geoContext === 'firmante') {
        errors.push(
          `Localidad ${localidad} no está permitida para firmantes`,
        );
        return errors;
      }
      const allowed = new Set([
        GIIS_LOCALIDAD_NO_ESPECIFICADO,
        GIIS_LOCALIDAD_SE_IGNORA,
        INEGI_LOCALIDAD_NO_DISPONIBLE,
      ]);
      if (!allowed.has(localidad)) {
        errors.push(
          'Con municipio real la localidad debe ser 9999, 9998 o una localidad del catálogo',
        );
      }
    }
  }

  return errors;
}
