export enum CriterioComparacionAudiometrica {
  SOLO_DIFERENCIAS = 'solo_diferencias',
}

export enum RolAudiometriaEnInforme {
  BASAL = 'basal',
  SUBSECUENTE = 'subsecuente',
}

export const VERSION_CRITERIO_AUDIOMETRICO_V1 = 'v1.0-deltas';

export const VALORES_CRITERIO_COMPARACION_AUDIOMETRICA = Object.values(
  CriterioComparacionAudiometrica,
);

export const VALORES_ROL_AUDIOMETRIA_EN_INFORME = Object.values(
  RolAudiometriaEnInforme,
);

export const FRECUENCIAS_MATRIZ_AUDIOMETRICA = [
  500, 1000, 2000, 3000, 4000, 6000, 8000,
] as const;

export const FRECUENCIAS_AUDIOGRAMA_COMPLETO = [
  125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000,
] as const;
