export enum TendenciaLongitudinal {
  MEJORIA = 'Mejoría',
  ESTABLE = 'Estable',
  EMPEORAMIENTO = 'Empeoramiento',
  VARIABLE = 'Variable',
  NO_VALORABLE = 'No valorable',
}

export enum GraficaLongitudinalCardiometabolica {
  TENSION_ARTERIAL = 'Tensión arterial',
  PESO_IMC = 'Peso / IMC',
  GLUCOSA_HBA1C = 'Glucosa / HbA1c',
  LIPIDOS = 'Lípidos',
}

export enum NivelRiesgoLongitudinal {
  MUY_BAJO = 'Muy Bajo',
  BAJO = 'Bajo',
  MODERADO = 'Moderado',
  ALTO = 'Alto',
  CRITICO = 'Crítico',
  NO_VALORABLE = 'No valorable',
}

export enum ConsistenciaSeguimientoLongitudinal {
  ADECUADO = 'Adecuado',
  IRREGULAR = 'Irregular',
  INSUFICIENTE = 'Insuficiente',
  NO_VALORABLE = 'No valorable',
}

/** Trayectoria agregada del informe (periodo completo); distinta de `TendenciaLongitudinal` por eje. */
export enum TrayectoriaLongitudinalInforme {
  FAVORABLE = 'Favorable',
  ESTABLE = 'Estable',
  DESFAVORABLE = 'Desfavorable',
  MIXTA = 'Mixta',
  INSUFICIENTE_INFORMACION = 'Insuficiente información',
}

export const VALORES_TENDENCIA_LONGITUDINAL = Object.values(TendenciaLongitudinal);
export const VALORES_TRAYECTORIA_LONGITUDINAL_INFORME = Object.values(TrayectoriaLongitudinalInforme);
export const VALORES_GRAFICA_LONGITUDINAL_CARDIOMETABOLICA = Object.values(
  GraficaLongitudinalCardiometabolica,
);
export const VALORES_NIVEL_RIESGO_LONGITUDINAL = Object.values(NivelRiesgoLongitudinal);
export const VALORES_CONSISTENCIA_SEGUIMIENTO_LONGITUDINAL = Object.values(
  ConsistenciaSeguimientoLongitudinal,
);

export const GRAFICAS_LONGITUDINAL_DEFAULT: GraficaLongitudinalCardiometabolica[] = [
  GraficaLongitudinalCardiometabolica.TENSION_ARTERIAL,
  GraficaLongitudinalCardiometabolica.PESO_IMC,
  GraficaLongitudinalCardiometabolica.GLUCOSA_HBA1C,
];
