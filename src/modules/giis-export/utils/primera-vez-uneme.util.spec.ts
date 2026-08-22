import {
  isEstablecimientoEspecializadoSis,
  resolvePrimeraVezUneme,
} from './primera-vez-uneme.util';

describe('isEstablecimientoEspecializadoSis', () => {
  it('es true solo con tip T/UNE y sub T02/UNE02/UNE04/UNE11', () => {
    expect(
      isEstablecimientoEspecializadoSis({
        tipAbreviacion: 'UNE',
        subAbreviacion: 'UNE04',
      }),
    ).toBe(true);
    expect(
      isEstablecimientoEspecializadoSis({
        tipAbreviacion: 'T',
        subAbreviacion: 'T02',
      }),
    ).toBe(true);
    expect(
      isEstablecimientoEspecializadoSis({
        tipAbreviacion: 'une',
        subAbreviacion: 'une02',
      }),
    ).toBe(true);
  });

  it('es false si falta tip, sub, entry o combinaciones no oficiales', () => {
    expect(isEstablecimientoEspecializadoSis(null)).toBe(false);
    expect(isEstablecimientoEspecializadoSis(undefined)).toBe(false);
    expect(
      isEstablecimientoEspecializadoSis({
        tipAbreviacion: 'UNE',
        subAbreviacion: 'UNE01',
      }),
    ).toBe(false);
    expect(
      isEstablecimientoEspecializadoSis({
        tipAbreviacion: 'C',
        subAbreviacion: 'UNE04',
      }),
    ).toBe(false);
    expect(
      isEstablecimientoEspecializadoSis({
        tipAbreviacion: 'UNE',
      }),
    ).toBe(false);
  });
});

describe('resolvePrimeraVezUneme', () => {
  it('exporta -1 si el establecimiento no es especializado', () => {
    expect(
      resolvePrimeraVezUneme({
        especializado: false,
        primeraVezAnio: 1,
        capturado: 1,
      }),
    ).toBe(-1);
  });

  it('exporta 0 si es especializado y no es primera del año', () => {
    expect(
      resolvePrimeraVezUneme({
        especializado: true,
        primeraVezAnio: 0,
        capturado: 1,
      }),
    ).toBe(0);
  });

  it('usa el valor capturado cuando es especializado y primera del año', () => {
    expect(
      resolvePrimeraVezUneme({
        especializado: true,
        primeraVezAnio: 1,
        capturado: 1,
      }),
    ).toBe(1);
    expect(
      resolvePrimeraVezUneme({
        especializado: true,
        primeraVezAnio: 1,
        capturado: 0,
      }),
    ).toBe(0);
  });

  it('exporta 0 si aplica 0|1 y no hay captura (notas históricas)', () => {
    expect(
      resolvePrimeraVezUneme({
        especializado: true,
        primeraVezAnio: 1,
        capturado: undefined,
      }),
    ).toBe(0);
    expect(
      resolvePrimeraVezUneme({
        especializado: true,
        primeraVezAnio: 1,
        capturado: -1,
      }),
    ).toBe(0);
  });
});
