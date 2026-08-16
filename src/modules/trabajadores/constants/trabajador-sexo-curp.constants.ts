export const TRABAJADOR_SEXO_CURP_VALUES = [1, 2, 3] as const;

export type TrabajadorSexoCurp = (typeof TRABAJADOR_SEXO_CURP_VALUES)[number];

export const TRABAJADOR_SEXO_CURP_LABELS: Record<TrabajadorSexoCurp, string> = {
  1: 'Hombre',
  2: 'Mujer',
  3: 'No binario',
};

export function isTrabajadorSexoCurp(value: unknown): value is TrabajadorSexoCurp {
  return value === 1 || value === 2 || value === 3;
}
