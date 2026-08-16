/**
 * Diff carácter a carácter para details A1 granulares (paridad FE).
 */

export const CURP_FIELD_START_POS: Record<string, number> = {
  iniciales: 1,
  fechaNacimiento: 5,
  sexo: 11,
  entidadNacimiento: 12,
  consonantesInternas: 14,
  homoclave: 17,
};

export interface CurpCharMismatch {
  position: number;
  expected: string;
  got: string;
}

export function diffCurpChars(
  expected: string,
  got: string,
  startPos: number,
): CurpCharMismatch[] {
  if (!expected || !got) {
    return [];
  }

  if (expected.includes('-') && expected.length <= 3) {
    return [
      {
        position: startPos,
        expected,
        got: got.charAt(0) || got,
      },
    ];
  }

  const len = Math.max(expected.length, got.length);
  const mismatches: CurpCharMismatch[] = [];
  for (let i = 0; i < len; i++) {
    const exp = expected[i] ?? '';
    const g = got[i] ?? '';
    if (exp !== g) {
      mismatches.push({
        position: startPos + i,
        expected: exp || '∅',
        got: g || '∅',
      });
    }
  }
  return mismatches;
}

export function formatPositionMismatchMessage(
  position: number,
  expected: string,
  got: string,
  segmentHint?: string,
): string {
  const hint = segmentHint ? ` (${segmentHint})` : '';
  return `Pos. ${position}${hint}: se espera "${expected}", la CURP contiene "${got}".`;
}

export const SEGMENT_HINTS: Record<string, string> = {
  iniciales: 'inicial',
  fechaNacimiento: 'fecha AAMMDD',
  sexo: 'sexo',
  entidadNacimiento: 'entidad',
  consonantesInternas: 'consonante interna',
  homoclave: 'homoclave',
};
