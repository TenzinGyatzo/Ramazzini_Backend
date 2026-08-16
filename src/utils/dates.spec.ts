import { calcularEdad, calcularAntiguedad } from './dates';

describe('calcularEdad con fechaReferencia', () => {
  const fechaNacimiento = '1990-06-15';

  it('debe calcular edad contra fecha del documento extemporánea', () => {
    const edadHoy = calcularEdad(fechaNacimiento);
    const edadDocumento = calcularEdad(fechaNacimiento, '2020-01-01');
    expect(edadDocumento).toBe(29);
    expect(edadDocumento).toBeLessThan(edadHoy);
  });

  it('debe ajustar si el cumpleaños no ha ocurrido en la fecha del documento', () => {
    expect(calcularEdad(fechaNacimiento, '2020-03-01')).toBe(29);
    expect(calcularEdad(fechaNacimiento, '2020-06-15')).toBe(30);
    expect(calcularEdad(fechaNacimiento, '2020-08-01')).toBe(30);
  });

  it('sin fechaReferencia debe usar hoy (retrocompatibilidad)', () => {
    const edadSinRef = calcularEdad(fechaNacimiento);
    const edadConHoy = calcularEdad(fechaNacimiento, new Date());
    expect(edadSinRef).toBe(edadConHoy);
  });
});

describe('calcularAntiguedad con fechaReferencia', () => {
  it('debe evaluar Nuevo Ingreso contra fecha del documento', () => {
    const fechaIngreso = '2020-01-10';
    expect(calcularAntiguedad(fechaIngreso, '2020-01-12')).toBe('Nuevo Ingreso');
    expect(calcularAntiguedad(fechaIngreso, '2020-02-01')).not.toBe('Nuevo Ingreso');
  });

  it('debe usar semanas entre 7 y 28 días', () => {
    const fechaIngreso = '2020-01-10';
    expect(calcularAntiguedad(fechaIngreso, '2020-01-17')).toBe('1 semana');
    expect(calcularAntiguedad(fechaIngreso, '2020-01-20')).toBe('1 semana');
    expect(calcularAntiguedad(fechaIngreso, '2020-02-01')).toBe('3 semanas');
    expect(calcularAntiguedad(fechaIngreso, '2020-02-07')).toBe('4 semanas');
  });

  it('debe usar meses cuando hay menos de 1 año', () => {
    expect(calcularAntiguedad('2020-01-10', '2020-03-10')).toBe('2 meses');
    expect(calcularAntiguedad('2020-01-10', '2020-02-10')).toBe('1 mes');
  });

  it('debe omitir meses cuando son cero y usar singular de año', () => {
    expect(calcularAntiguedad('2019-01-01', '2020-01-01')).toBe('1 año');
    expect(calcularAntiguedad('2018-01-01', '2020-01-01')).toBe('2 años');
    expect(calcularAntiguedad('2019-01-01', '2020-02-01')).toBe('1 año, 1 mes');
  });

  it('debe calcular años y meses contra fecha del documento', () => {
    const fechaIngreso = '2018-01-01';
    expect(calcularAntiguedad(fechaIngreso, '2020-07-01')).toBe('2 años, 6 meses');
  });

  it('sin fechaReferencia debe usar hoy', () => {
    const fechaIngreso = '2010-01-01';
    const sinRef = calcularAntiguedad(fechaIngreso);
    const conHoy = calcularAntiguedad(fechaIngreso, new Date());
    expect(sinRef).toBe(conHoy);
  });

  it('debe retornar guión si no hay fecha de ingreso', () => {
    expect(calcularAntiguedad('')).toBe('-');
    expect(calcularAntiguedad('No recuerda')).toBe('-');
  });
});
