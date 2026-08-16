import { normalizeSexoCurpInput, normalizeSexoCurpToCurpCode } from './sexo-curp.util';

describe('normalizeSexoCurpToCurpCode', () => {
  it('mapea 1/2/3 a H/M/X', () => {
    expect(normalizeSexoCurpToCurpCode(1)).toBe('H');
    expect(normalizeSexoCurpToCurpCode(2)).toBe('M');
    expect(normalizeSexoCurpToCurpCode(3)).toBe('X');
  });
});

describe('normalizeSexoCurpInput', () => {
  it('acepta números y etiquetas', () => {
    expect(normalizeSexoCurpInput(1)).toBe(1);
    expect(normalizeSexoCurpInput('Mujer')).toBe(2);
    expect(normalizeSexoCurpInput('No binario')).toBe(3);
  });
});
