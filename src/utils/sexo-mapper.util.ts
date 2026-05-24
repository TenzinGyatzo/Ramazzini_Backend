/**
 * Utility functions for mapping sexo values to numeric codes
 * NOM-024 GIIS-B015: Sexo biológico mapping
 * - "Masculino" → 1 (Hombre)
 * - "Femenino" → 2 (Mujer)
 * - "Intersexual" → 3
 */

/**
 * Maps sexo string to numeric code according to NOM-024 GIIS-B015
 * @param sexo - Sexo string value
 * @returns 1 Masculino, 2 Femenino, 3 Intersexual, null si desconocido
 */
export function mapSexoToGiisBiologico(sexo: string): 1 | 2 | 3 | null {
  if (!sexo) {
    return null;
  }

  const normalizedSexo = sexo.trim().toLowerCase();

  if (
    normalizedSexo === 'masculino' ||
    normalizedSexo === 'hombre' ||
    normalizedSexo === 'm' ||
    normalizedSexo === 'h'
  ) {
    return 1;
  }

  if (
    normalizedSexo === 'femenino' ||
    normalizedSexo === 'mujer' ||
    normalizedSexo === 'f' ||
    normalizedSexo === 'f'
  ) {
    return 2;
  }

  if (
    normalizedSexo === 'intersexual' ||
    normalizedSexo === 'otro' ||
    normalizedSexo === 'other' ||
    normalizedSexo === '3'
  ) {
    return 3;
  }

  return null;
}

/**
 * @deprecated Prefer mapSexoToGiisBiologico para validaciones CEX completas.
 */
export function mapSexoToNumeric(sexo: string): 1 | 2 | null {
  const giis = mapSexoToGiisBiologico(sexo);
  return giis === 1 || giis === 2 ? giis : null;
}

/**
 * Maps numeric code to sexo string (reverse mapping)
 * @param codigo - Numeric code (1, 2, or 3)
 * @returns "Masculino" for 1, "Femenino" for 2, null for others
 */
export function mapNumericToSexo(codigo: number): string | null {
  switch (codigo) {
    case 1:
      return 'Masculino';
    case 2:
      return 'Femenino';
    case 3:
      // Intersexual - not currently in schema but may be added in future
      return null;
    default:
      return null;
  }
}
