import {
  evaluateCexLoadQuality,
  MAX_GENERIC_CURP_RATIO,
  MAX_R69X_RATIO,
  rowHasR69XInAnyInformedField,
} from './cex-load-quality.util';

function row(
  curpPaciente: string,
  d1: string,
  d2 = '',
  d3 = '',
): Record<string, string | number> {
  return {
    curpPaciente,
    codigoCIEDiagnostico1: d1,
    codigoCIEDiagnostico2: d2,
    codigoCIEDiagnostico3: d3,
  };
}

describe('rowHasR69XInAnyInformedField', () => {
  it('detecta R69X en columna informada', () => {
    expect(rowHasR69XInAnyInformedField(row('X', 'J18.9', 'R69X', ''))).toBe(
      true,
    );
    expect(rowHasR69XInAnyInformedField(row('X', 'r69.x', '', ''))).toBe(true);
  });
  it('ignora columnas vacías', () => {
    expect(rowHasR69XInAnyInformedField(row('X', 'J18.9', '', ''))).toBe(
      false,
    );
  });
});

describe('evaluateCexLoadQuality', () => {
  it('n=0 es ok', () => {
    const r = evaluateCexLoadQuality([]);
    expect(r.ok).toBe(true);
    expect(r.counts.n).toBe(0);
  });

  it('cumple en el límite exacto 15% CURP genérica', () => {
    const generic = 'XXXX999999XXXXXX99';
    const real = 'GALJ900515HDFLRN08';
    const rows: Record<string, string | number>[] = [];
    for (let i = 0; i < 3; i++) rows.push(row(generic, 'J18.9'));
    for (let i = 0; i < 17; i++) rows.push(row(real, 'J18.9'));
    const r = evaluateCexLoadQuality(rows);
    expect(r.counts.genericCurp).toBe(3);
    expect(r.counts.n).toBe(20);
    expect(3 / 20).toBeLessThanOrEqual(MAX_GENERIC_CURP_RATIO + 1e-9);
    expect(r.ok).toBe(true);
  });

  it('falla por encima de 15% CURP genérica', () => {
    const generic = 'XXXX999999XXXXXX99';
    const real = 'GALJ900515HDFLRN08';
    const rows: Record<string, string | number>[] = [];
    for (let i = 0; i < 4; i++) rows.push(row(generic, 'J18.9'));
    for (let i = 0; i < 16; i++) rows.push(row(real, 'J18.9'));
    const r = evaluateCexLoadQuality(rows);
    expect(4 / 20).toBeGreaterThan(MAX_GENERIC_CURP_RATIO);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.cause.includes('CURP genérica'))).toBe(true);
  });

  it('cumple en el límite exacto 5% R69X', () => {
    const curp = 'GALJ900515HDFLRN08';
    const rows: Record<string, string | number>[] = [];
    for (let i = 0; i < 1; i++) rows.push(row(curp, 'R69X'));
    for (let i = 0; i < 19; i++) rows.push(row(curp, 'J18.9'));
    const r = evaluateCexLoadQuality(rows);
    expect(r.counts.r69xRows).toBe(1);
    expect(r.counts.n).toBe(20);
    expect(1 / 20).toBeLessThanOrEqual(MAX_R69X_RATIO + 1e-9);
    expect(r.ok).toBe(true);
  });

  it('falla por encima de 5% R69X', () => {
    const curp = 'GALJ900515HDFLRN08';
    const rows: Record<string, string | number>[] = [];
    for (let i = 0; i < 2; i++) rows.push(row(curp, 'R69X'));
    for (let i = 0; i < 18; i++) rows.push(row(curp, 'J18.9'));
    const r = evaluateCexLoadQuality(rows);
    expect(2 / 20).toBeGreaterThan(MAX_R69X_RATIO);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.cause.includes('R69X'))).toBe(true);
  });

  it('rowIndex -1 en errores de carga', () => {
    const generic = 'XXXX999999XXXXXX99';
    const rows = Array.from({ length: 10 }, () => row(generic, 'J18.9'));
    const r = evaluateCexLoadQuality(rows);
    expect(r.ok).toBe(false);
    expect(r.errors[0].rowIndex).toBe(-1);
    expect(r.errors[0].field).toBe('GIIS_CEX_LOAD_QUALITY');
  });
});
