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

/** Laboratorio — evento seguimiento cardiometabólico (interpretación orientativa). */
export enum CategoriaGlucosa {
  NORMAL = 'Normal',
  ALTERADA = 'Alterada',
  ELEVADA = 'Elevada',
  NO_VALORABLE = 'No valorable',
}

export enum CategoriaHbA1c {
  NORMAL = 'Normal',
  PREDIABETES = 'Prediabetes',
  COMPATIBLE_CON_DIABETES = 'Compatible con diabetes',
  NO_VALORABLE = 'No valorable',
}

export enum CategoriaColesterolTotal {
  DESEABLE = 'Deseable',
  LIMITE_ALTO = 'Límite alto',
  ALTO = 'Alto',
  NO_VALORABLE = 'No valorable',
}

export enum CategoriaLDL {
  OPTIMO = 'Óptimo',
  CERCA_OPTIMO = 'Cerca de óptimo',
  LIMITE_ALTO = 'Límite alto',
  ALTO = 'Alto',
  MUY_ALTO = 'Muy alto',
  NO_VALORABLE = 'No valorable',
}

export enum CategoriaHDL {
  BAJO = 'Bajo',
  ADECUADO = 'Adecuado',
  ALTO = 'Alto',
  NO_VALORABLE = 'No valorable',
}

export enum CategoriaTrigliceridos {
  NORMAL = 'Normal',
  LIMITE_ALTO = 'Límite alto',
  ALTO = 'Alto',
  MUY_ALTO = 'Muy alto',
  NO_VALORABLE = 'No valorable',
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
