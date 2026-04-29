/** Categorías clínicas compartidas (exploración física, seguimiento cardiometabólico, informes). */

export enum CategoriaIMC {
  BAJO_PESO = 'Bajo peso',
  NORMAL = 'Normal',
  SOBREPESO = 'Sobrepeso',
  OBESIDAD_CLASE_I = 'Obesidad clase I',
  OBESIDAD_CLASE_II = 'Obesidad clase II',
  OBESIDAD_CLASE_III = 'Obesidad clase III',
}

export enum CategoriaCircunferenciaCintura {
  BAJO_RIESGO = 'Bajo Riesgo',
  RIESGO_AUMENTADO = 'Riesgo Aumentado',
  ALTO_RIESGO = 'Alto Riesgo',
}

export enum CategoriaTensionArterial {
  OPTIMA = 'Óptima',
  NORMAL = 'Normal',
  ALTA = 'Alta',
  HIPERTENSION_GRADO_1 = 'Hipertensión grado 1',
  HIPERTENSION_GRADO_2 = 'Hipertensión grado 2',
  HIPERTENSION_GRADO_3 = 'Hipertensión grado 3',
}

export enum CategoriaFrecuenciaCardiaca {
  EXCELENTE = 'Excelente',
  BUENA = 'Buena',
  NORMAL = 'Normal',
  ELEVADA = 'Elevada',
  ALTA = 'Alta',
  MUY_ALTA = 'Muy alta',
}

/** Incluye opción vacía para formularios de exploración física legados. */
export const CATEGORIAS_IMC_EXPLORACION_FISICA = ['', ...Object.values(CategoriaIMC)];

export const CATEGORIAS_CIRCUNFERENCIA_EXPLORACION_FISICA = [
  '',
  ...Object.values(CategoriaCircunferenciaCintura),
];

export const CATEGORIAS_TENSION_EXPLORACION_FISICA = [
  '',
  ...Object.values(CategoriaTensionArterial),
];

export const CATEGORIAS_FRECUENCIA_CARDIACA_EXPLORACION_FISICA = [
  '',
  ...Object.values(CategoriaFrecuenciaCardiaca),
];
