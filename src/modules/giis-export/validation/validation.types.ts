/**
 * Types for GIIS Phase 2A deep validation (schema-based, skip-row, excluded report).
 */

export type ValidationSeverity = 'blocker' | 'warning';

export interface ValidationError {
  guide: string;
  /** Índice de renglón en la carga; -1 = error de ámbito carga (ej. límites CURP/R69X). */
  rowIndex: number;
  field: string;
  cause: string;
  severity: ValidationSeverity;
}

export interface PreValidationResult {
  errors: ValidationError[];
  totalRows: number;
}

export interface ExcludedRowEntry {
  guide: string;
  rowIndex: number;
  field: string;
  cause: string;
}

export interface ExcludedRowReport {
  entries: ExcludedRowEntry[];
  totalExcluded: number;
}

export interface ValidateAndFilterResult {
  validRows: Record<string, string | number>[];
  excludedReport: ExcludedRowReport;
  warnings: ValidationError[];
}

export type ValidationStatus = 'validated' | 'has_warnings' | 'has_blockers';
