/**
 * GIIS export config (Phase 2C retention).
 * retentionMonthsForGeneratedFiles: optional; future cleanup job can use this.
 */

export const giisExportConfig = {
  get retentionMonthsForGeneratedFiles(): number | null {
    const v = process.env.RETENTION_MONTHS_GIIS_FILES;
    if (v === undefined || v === '') return null;
    const n = parseInt(v, 10);
    return Number.isNaN(n) || n < 0 ? null : n;
  },

  /**
   * Cuando es true, aplica en conjunto los límites de calidad de carga GIIS CEX:
   * máx. 15% CURP genérica (paciente) y máx. 5% de renglones con CIE-10 R69X
   * en diagnósticos informados (sobre renglones válidos tras validación esquemática).
   */
  get cexLoadQualityRulesEnabled(): boolean {
    return process.env.GIIS_CEX_LOAD_QUALITY_RULES === 'true';
  },
};
