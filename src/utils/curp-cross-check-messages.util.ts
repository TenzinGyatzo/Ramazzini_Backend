import { Discrepancy } from './curp-validator.util';
import {
  CURP_FIELD_START_POS,
  SEGMENT_HINTS,
  diffCurpChars,
  formatPositionMismatchMessage,
} from './curp-position-diff.util';

/** Códigos alineados con frontend/src/utils/curp/curp-validation-catalog.ts */
export type CurpA1IssueCode =
  | 'CURP_CROSS_FECHA'
  | 'CURP_CROSS_SEXO'
  | 'CURP_CROSS_ENTIDAD'
  | 'CURP_CROSS_INICIALES'
  | 'CURP_CROSS_CONSONANTES'
  | 'CURP_CROSS_HOMOCLAVE';

const FIELD_TO_CODE: Record<Discrepancy['field'], CurpA1IssueCode> = {
  fechaNacimiento: 'CURP_CROSS_FECHA',
  sexo: 'CURP_CROSS_SEXO',
  entidadNacimiento: 'CURP_CROSS_ENTIDAD',
  iniciales: 'CURP_CROSS_INICIALES',
  consonantesInternas: 'CURP_CROSS_CONSONANTES',
  homoclave: 'CURP_CROSS_HOMOCLAVE',
};

export interface CurpA1Detail {
  field: Discrepancy['field'];
  expected: string;
  gotFromCurp: string;
  code: CurpA1IssueCode;
  positions: number[];
  severity: 'error';
  message: string;
}

export interface CurpCrossCheckErrorContent {
  summary: string;
  userMessages: string[];
  message: string;
  details: CurpA1Detail[];
}

export function formatCurpDiscrepancyUserMessage(
  discrepancy: Discrepancy,
): string {
  const details = expandDiscrepancyToDetails(discrepancy);
  return details[0]?.message ?? 'La CURP no coincide con los datos capturados.';
}

function expandDiscrepancyToDetails(discrepancy: Discrepancy): CurpA1Detail[] {
  const code = FIELD_TO_CODE[discrepancy.field];
  const startPos = CURP_FIELD_START_POS[discrepancy.field] ?? 1;
  const hint = SEGMENT_HINTS[discrepancy.field];
  const mismatches = diffCurpChars(
    discrepancy.expected,
    discrepancy.gotFromCurp,
    startPos,
  );

  if (mismatches.length === 0) {
    return [
      {
        field: discrepancy.field,
        expected: discrepancy.expected,
        gotFromCurp: discrepancy.gotFromCurp,
        code,
        positions: [startPos],
        severity: 'error',
        message: formatPositionMismatchMessage(
          startPos,
          discrepancy.expected,
          discrepancy.gotFromCurp,
          hint,
        ),
      },
    ];
  }

  return mismatches.map((m) => ({
    field: discrepancy.field,
    expected: m.expected,
    gotFromCurp: m.got,
    code,
    positions: [m.position],
    severity: 'error' as const,
    message: formatPositionMismatchMessage(
      m.position,
      m.expected,
      m.got,
      hint,
    ),
  }));
}

/**
 * Construye summary, userMessages, message y details granulares (una entrada por posición).
 */
export function buildCurpCrossCheckErrorContent(
  discrepancies: Discrepancy[],
  _subjectLabel: 'trabajador' | 'firmante' = 'trabajador',
): CurpCrossCheckErrorContent {
  if (discrepancies.length === 0) {
    const fallback = 'La CURP no coincide con los datos capturados.';
    return {
      summary: fallback,
      userMessages: [],
      message: fallback,
      details: [],
    };
  }

  const details = discrepancies.flatMap(expandDiscrepancyToDetails);
  const userMessages = details.map((d) => d.message);
  const message = userMessages[0];
  const summary =
    userMessages.length === 1
      ? message
      : `La CURP no coincide en ${userMessages.length} posiciones. Revise los detalles.`;

  return {
    summary,
    userMessages,
    message: userMessages.length === 1 ? message : summary,
    details,
  };
}
