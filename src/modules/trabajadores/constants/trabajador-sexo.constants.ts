export const TRABAJADOR_SEXOS = [
  'Masculino',
  'Femenino',
  'Intersexual',
] as const;

export type TrabajadorSexo = (typeof TRABAJADOR_SEXOS)[number];

export function esTrabajadorFemenino(sexo: string | null | undefined): boolean {
  return sexo === 'Femenino';
}

/** Masculino e Intersexual: comportamiento por defecto no femenino en UI/reglas. */
export function esTrabajadorMasculinoPorDefecto(
  sexo: string | null | undefined,
): boolean {
  return sexo !== 'Femenino';
}
