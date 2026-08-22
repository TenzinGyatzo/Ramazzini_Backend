import { CLUES_SERVICIOS_MEDICOS_PRIVADOS } from '../../../utils/clues-validator.util';
import { CLUESEntry } from '../../catalogs/interfaces/catalog-entry.interface';

/** GIIS-B015: tip_abreviacion de establecimiento especializado. */
export const TIP_ABREVIACION_ESPECIALIZADO = new Set(['T', 'UNE']);

/** GIIS-B015: sub_abreviacion de establecimiento especializado. */
export const SUB_ABREVIACION_ESPECIALIZADO = new Set([
  'T02',
  'UNE02',
  'UNE04',
  'UNE11',
]);

export function isEstablecimientoEspecializadoSis(
  entry: Pick<CLUESEntry, 'tipAbreviacion' | 'subAbreviacion'> | null | undefined,
): boolean {
  if (!entry) return false;
  const tip = (entry.tipAbreviacion ?? '').trim().toUpperCase();
  const sub = (entry.subAbreviacion ?? '').trim().toUpperCase();
  return TIP_ABREVIACION_ESPECIALIZADO.has(tip) && SUB_ABREVIACION_ESPECIALIZADO.has(sub);
}

export function isCluesSentinelOrEmpty(clues: string | null | undefined): boolean {
  const normalized = (clues ?? '').trim().toUpperCase();
  return !normalized || normalized === CLUES_SERVICIOS_MEDICOS_PRIVADOS;
}

export interface ResolvePrimeraVezUnemeInput {
  especializado: boolean;
  primeraVezAnio: number;
  capturado?: number | null;
}

/**
 * Matriz GIIS-B015 variable 41 (primeraVezUneme).
 * La captura SIRES exige 0|1 cuando el prompt aplica; el 0 por ausencia
 * solo cubre notas históricas sin el campo.
 */
export function resolvePrimeraVezUneme(
  input: ResolvePrimeraVezUnemeInput,
): number {
  if (!input.especializado) return -1;
  if (input.primeraVezAnio !== 1) return 0;
  return input.capturado === 0 || input.capturado === 1 ? input.capturado : 0;
}
