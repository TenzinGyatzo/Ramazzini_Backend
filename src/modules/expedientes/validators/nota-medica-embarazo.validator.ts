/**
 * Validación NOM-024 GIIS-B015: relacionTemporalEmbarazo y trimestreGestacional (CEX).
 */

import { calculateAge } from '../../../utils/age-calculator.util';
import { mapSexoToNumeric } from '../../../utils/sexo-mapper.util';

export interface EmbarazoFieldsDto {
  relacionTemporalEmbarazo?: number;
  trimestreGestacional?: number;
  fechaNotaMedica?: Date | string;
}

export interface EmbarazoTrabajadorLike {
  sexo?: string;
  fechaNacimiento?: Date | string;
}

export interface EmbarazoValidationResult {
  ok: boolean;
  message?: string;
}

const TRIMESTRES_VALIDOS = new Set([1, 2, 3]);
const RELACION_EMBARAZO_VALIDA = new Set([0, 1]);

function toDate(value: Date | string | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function resolveRelacionTemporalEmbarazo(
  relacionTemporalEmbarazo: number | undefined,
): number {
  if (relacionTemporalEmbarazo === 0 || relacionTemporalEmbarazo === 1) {
    return relacionTemporalEmbarazo;
  }
  return -1;
}

function resolveTrimestreGestacional(
  relacionTemporalEmbarazo: number,
  trimestreGestacional: number | undefined,
): number {
  if (relacionTemporalEmbarazo === -1) return -1;
  if (
    trimestreGestacional === 1 ||
    trimestreGestacional === 2 ||
    trimestreGestacional === 3
  ) {
    return trimestreGestacional;
  }
  return -1;
}

/**
 * Calcula edad en años entre fechaNacimiento y fechaConsulta.
 */
export function calcularEdadEmbarazo(
  fechaNacimiento?: Date | string | null,
  fechaConsulta?: Date | string | null,
): number | null {
  const fn = toDate(fechaNacimiento ?? undefined);
  const fc = toDate(fechaConsulta ?? undefined);
  if (!fn || !fc) return null;
  try {
    return calculateAge(fn, fc);
  } catch {
    return null;
  }
}

/**
 * Indica si pueden capturarse campos de embarazo (sexo biológico mujer, edad 9–59).
 * atencionPregestacionalRT y puerpera se asumen siempre -1 en el sistema.
 */
export function aplicaRelacionTemporalEmbarazo(
  sexo: string | undefined,
  edad: number | null,
): boolean {
  if (mapSexoToNumeric(sexo ?? '') !== 2) return false;
  if (edad === null) return false;
  return edad >= 9 && edad <= 59;
}

/**
 * Normaliza campos de embarazo en el DTO antes de persistir.
 * Fuerza -1/-1 cuando no aplica por sexo o edad.
 */
export function normalizarCamposEmbarazo(
  dto: EmbarazoFieldsDto,
  trabajador: EmbarazoTrabajadorLike | null | undefined,
): void {
  const edad = calcularEdadEmbarazo(
    trabajador?.fechaNacimiento,
    dto.fechaNotaMedica,
  );
  const aplica = aplicaRelacionTemporalEmbarazo(trabajador?.sexo, edad);

  if (!aplica) {
    dto.relacionTemporalEmbarazo = -1;
    dto.trimestreGestacional = -1;
    return;
  }

  const rt = resolveRelacionTemporalEmbarazo(dto.relacionTemporalEmbarazo);
  dto.relacionTemporalEmbarazo = rt;
  dto.trimestreGestacional = resolveTrimestreGestacional(
    rt,
    dto.trimestreGestacional,
  );
}

/**
 * Valida coherencia de campos de embarazo según reglas CEX.
 */
export function validarCamposEmbarazo(
  dto: EmbarazoFieldsDto,
  trabajador: EmbarazoTrabajadorLike | null | undefined,
): EmbarazoValidationResult {
  const edad = calcularEdadEmbarazo(
    trabajador?.fechaNacimiento,
    dto.fechaNotaMedica,
  );
  const aplica = aplicaRelacionTemporalEmbarazo(trabajador?.sexo, edad);

  const rt = dto.relacionTemporalEmbarazo ?? -1;
  const tg = dto.trimestreGestacional ?? -1;

  if (!aplica) {
    if (rt !== -1 || tg !== -1) {
      return {
        ok: false,
        message:
          'relacionTemporalEmbarazo y trimestreGestacional deben ser -1 cuando no aplica (no mujer o edad fuera de 9–59 años)',
      };
    }
    return { ok: true };
  }

  if (rt !== -1 && !RELACION_EMBARAZO_VALIDA.has(rt)) {
    return {
      ok: false,
      message:
        'relacionTemporalEmbarazo debe ser -1 (No aplica), 0 (Primera vez) o 1 (Subsecuente)',
    };
  }

  if (tg !== -1 && !TRIMESTRES_VALIDOS.has(tg)) {
    return {
      ok: false,
      message: 'trimestreGestacional debe ser -1 o un valor entre 1 y 3',
    };
  }

  if (RELACION_EMBARAZO_VALIDA.has(rt)) {
    if (!TRIMESTRES_VALIDOS.has(tg)) {
      return {
        ok: false,
        message:
          'trimestreGestacional es obligatorio (1, 2 o 3) cuando se registra embarazo',
      };
    }
  } else if (rt === -1 && tg !== -1) {
    return {
      ok: false,
      message:
        'trimestreGestacional debe ser -1 cuando relacionTemporalEmbarazo es -1',
    };
  }

  return { ok: true };
}

/**
 * Resuelve valores finales para exportación CEX (defensa en mapper).
 */
export function resolverCamposEmbarazoCex(
  consulta: EmbarazoFieldsDto,
  sexoBiologico: number,
  edad: number | null,
): { relacionTemporalEmbarazo: number; trimestreGestacional: number } {
  const aplica =
    sexoBiologico === 2 && edad !== null && edad >= 9 && edad <= 59;
  if (!aplica) {
    return { relacionTemporalEmbarazo: -1, trimestreGestacional: -1 };
  }

  const rt = resolveRelacionTemporalEmbarazo(
    consulta.relacionTemporalEmbarazo,
  );
  const tg = resolveTrimestreGestacional(rt, consulta.trimestreGestacional);
  return { relacionTemporalEmbarazo: rt, trimestreGestacional: tg };
}
