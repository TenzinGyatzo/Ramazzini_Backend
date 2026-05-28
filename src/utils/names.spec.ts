import {
  formatearNombreFirmante,
  formatearTituloYNombreFirmante,
  formatearTituloYNombreFirmanteConFallback,
  sanitizarNombreFirmanteParaArchivo,
} from './names';

describe('formatearNombreFirmante', () => {
  it('devuelve nombre legacy cuando no hay primerApellido', () => {
    expect(
      formatearNombreFirmante({ nombre: 'Juan Pérez Galeana' }),
    ).toBe('Juan Pérez Galeana');
  });

  it('concatena nombre y apellidos en orden nombre + apellidos', () => {
    expect(
      formatearNombreFirmante({
        nombre: 'Juan',
        primerApellido: 'Pérez',
        segundoApellido: 'Galeana',
      }),
    ).toBe('Juan Pérez Galeana');
  });

  it('omite segundo apellido vacío', () => {
    expect(
      formatearNombreFirmante({
        nombre: 'Juan',
        primerApellido: 'Pérez',
        segundoApellido: '',
      }),
    ).toBe('Juan Pérez');
  });

  it('devuelve Sin nombre cuando no hay datos', () => {
    expect(formatearNombreFirmante({})).toBe('Sin nombre');
  });
});

describe('formatearTituloYNombreFirmante', () => {
  it('concatena título y nombre legacy', () => {
    expect(
      formatearTituloYNombreFirmante({
        tituloProfesional: 'Dr.',
        nombre: 'Juan Pérez Galeana',
      }),
    ).toBe('Dr. Juan Pérez Galeana');
  });

  it('concatena título y nombre con apellidos separados', () => {
    expect(
      formatearTituloYNombreFirmante({
        tituloProfesional: 'Dr.',
        nombre: 'Juan',
        primerApellido: 'Pérez',
        segundoApellido: 'Galeana',
      }),
    ).toBe('Dr. Juan Pérez Galeana');
  });

  it('omite título vacío', () => {
    expect(
      formatearTituloYNombreFirmante({
        tituloProfesional: '',
        nombre: 'Juan',
        primerApellido: 'Pérez',
      }),
    ).toBe('Juan Pérez');
  });
});

describe('formatearTituloYNombreFirmanteConFallback', () => {
  it('usa fallback cuando no hay nombre', () => {
    expect(
      formatearTituloYNombreFirmanteConFallback(
        { tituloProfesional: 'Dr.' },
        'Nombre del Emisor',
      ),
    ).toBe('Dr. Nombre del Emisor');
  });

  it('formatea normalmente cuando hay nombre', () => {
    expect(
      formatearTituloYNombreFirmanteConFallback(
        {
          tituloProfesional: 'Dr.',
          nombre: 'Juan',
          primerApellido: 'Pérez',
        },
        'Nombre del Emisor',
      ),
    ).toBe('Dr. Juan Pérez');
  });

  it('devuelve solo fallback cuando firmante es null', () => {
    expect(
      formatearTituloYNombreFirmanteConFallback(null, 'Nombre del Emisor'),
    ).toBe('Nombre del Emisor');
  });
});

describe('sanitizarNombreFirmanteParaArchivo', () => {
  it('sanitiza nombre completo para filename', () => {
    expect(
      sanitizarNombreFirmanteParaArchivo({
        nombre: 'Juan',
        primerApellido: 'Pérez',
        segundoApellido: 'Galeana',
      }),
    ).toBe('juan-prez-galeana');
  });
});
