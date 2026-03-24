import { isGenericCURP } from '../../../utils/curp-validator.util';
import type { ValidationError } from './validation.types';

export const MAX_GENERIC_CURP_RATIO = 0.15;
export const MAX_R69X_RATIO = 0.05;

const EPS = 1e-9;

function normalizeCieForCompare(value: string): string {
  return value.trim().toUpperCase().replace(/\./g, '');
}

/**
 * Renglón cuenta si algún diagnóstico informado (no vacío) normaliza a R69X.
 */
export function rowHasR69XInAnyInformedField(
  row: Record<string, string | number>,
): boolean {
  const fields = [
    'codigoCIEDiagnostico1',
    'codigoCIEDiagnostico2',
    'codigoCIEDiagnostico3',
  ] as const;
  for (const f of fields) {
    const raw = row[f];
    if (raw === undefined || raw === null) continue;
    const s = String(raw).trim();
    if (s === '') continue;
    if (normalizeCieForCompare(s) === 'R69X') return true;
  }
  return false;
}

export interface CexLoadQualityResult {
  ok: boolean;
  counts: { n: number; genericCurp: number; r69xRows: number };
  errors: ValidationError[];
}

/**
 * Valida límites de calidad de carga sobre renglones CEX ya válidos por esquema.
 * Si n === 0, se considera cumplido.
 */
export function evaluateCexLoadQuality(
  validRows: Record<string, string | number>[],
  guide: string = 'CEX',
): CexLoadQualityResult {
  const errors: ValidationError[] = [];
  const n = validRows.length;
  if (n === 0) {
    return {
      ok: true,
      counts: { n: 0, genericCurp: 0, r69xRows: 0 },
      errors: [],
    };
  }

  let genericCurp = 0;
  let r69xRows = 0;
  for (const row of validRows) {
    const curp = String(row.curpPaciente ?? '').trim().toUpperCase();
    if (isGenericCURP(curp)) genericCurp++;
    if (rowHasR69XInAnyInformedField(row)) r69xRows++;
  }

  const pctGeneric = genericCurp / n;
  const pctR69 = r69xRows / n;

  if (pctGeneric > MAX_GENERIC_CURP_RATIO + EPS) {
    errors.push({
      guide,
      rowIndex: -1,
      field: 'GIIS_CEX_LOAD_QUALITY',
      cause: `CURP genérica paciente: ${(pctGeneric * 100).toFixed(2)}% (${genericCurp}/${n}); máximo permitido 15%.`,
      severity: 'blocker',
    });
  }
  if (pctR69 > MAX_R69X_RATIO + EPS) {
    errors.push({
      guide,
      rowIndex: -1,
      field: 'GIIS_CEX_LOAD_QUALITY',
      cause: `CIE-10 R69X: ${(pctR69 * 100).toFixed(2)}% (${r69xRows}/${n}); máximo permitido 5%.`,
      severity: 'blocker',
    });
  }

  return {
    ok: errors.length === 0,
    counts: { n, genericCurp, r69xRows },
    errors,
  };
}
