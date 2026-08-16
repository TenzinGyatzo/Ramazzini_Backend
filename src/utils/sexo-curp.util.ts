import {
  isTrabajadorSexoCurp,
  type TrabajadorSexoCurp,
} from '../modules/trabajadores/constants/trabajador-sexo-curp.constants';

export type CurpSexoCode = 'H' | 'M' | 'X';

/** sexoCURP (1/2/3) → carácter RENAPO posición 11. */
export function normalizeSexoCurpToCurpCode(
  sexoCURP: TrabajadorSexoCurp,
): CurpSexoCode {
  if (sexoCURP === 1) return 'H';
  if (sexoCURP === 2) return 'M';
  return 'X';
}

/** Normaliza entrada de import/API a 1|2|3 o null. */
export function normalizeSexoCurpInput(value: unknown): TrabajadorSexoCurp | null {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number' && isTrabajadorSexoCurp(value)) {
    return value;
  }

  const raw = String(value).trim().toLowerCase();

  if (raw === '1' || raw === 'hombre' || raw === 'h' || raw === 'masculino') {
    return 1;
  }
  if (raw === '2' || raw === 'mujer' || raw === 'm' || raw === 'femenino') {
    return 2;
  }
  if (
    raw === '3' ||
    raw === 'no binario' ||
    raw === 'nobinario' ||
    raw === 'x' ||
    raw === 'intersexual'
  ) {
    return 3;
  }

  const asNum = Number(raw);
  if (isTrabajadorSexoCurp(asNum)) {
    return asNum;
  }

  return null;
}
