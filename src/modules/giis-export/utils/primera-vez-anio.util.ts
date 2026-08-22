export function calendarYearBounds(year: number): { start: Date; end: Date } {
  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

function toIdString(id: unknown): string {
  if (id == null) return '';
  return String(id);
}

/**
 * ¿Esta nota sería la primera del año al concluirla?
 * true solo si no hay otra nota FINALIZADA del mismo año (excluyendo candidateId).
 * No ordena por fechaConsulta: una extemporánea no “roba” el 1.
 */
export function esPrimeraVezAnioSiNoHayOtraFinalizada(params: {
  existingIds: unknown[];
  candidateId?: string | null;
}): boolean {
  const candidateId = params.candidateId?.trim() || '';
  for (const raw of params.existingIds) {
    const id = toIdString(raw);
    if (!id) continue;
    if (candidateId && id === candidateId) continue;
    return false;
  }
  return true;
}

export function valorPrimeraVezAnioSegunExistencia(
  hayOtraFinalizada: boolean,
): 0 | 1 {
  return hayOtraFinalizada ? 0 : 1;
}
