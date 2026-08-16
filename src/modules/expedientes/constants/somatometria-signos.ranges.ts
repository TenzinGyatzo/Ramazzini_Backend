/**
 * Rangos canónicos de somatometría y signos vitales para Exploración Física
 * y Certificado Expedito.
 * Debe mantenerse alineado con frontend/src/helpers/somatometriaSignosRanges.ts
 * No reutilizar notaMedicaCexRanges.
 *
 * Altura se persiste en metros (1.00–2.20 ≡ 100–220 cm).
 */
export const SOMATOMETRIA_SIGNOS_RANGES = {
  peso: { min: 30, max: 400, maxDecimalPlaces: 1 },
  altura: { min: 1.0, max: 2.2, maxDecimalPlaces: 2 },
  circunferenciaCintura: { min: 30, max: 300, maxDecimalPlaces: 0 },
  tensionArterialSistolica: { min: 50, max: 300, maxDecimalPlaces: 0 },
  tensionArterialDiastolica: { min: 20, max: 200, maxDecimalPlaces: 0 },
  frecuenciaCardiaca: { min: 40, max: 220, maxDecimalPlaces: 0 },
  frecuenciaRespiratoria: { min: 10, max: 99, maxDecimalPlaces: 0 },
  saturacionOxigeno: { min: 50, max: 100, maxDecimalPlaces: 0 },
  temperaturaCorporal: { min: 30, max: 44, maxDecimalPlaces: 1 },
} as const;
