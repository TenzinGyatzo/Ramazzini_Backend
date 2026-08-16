import {
  buildCurpDemographicsForFirmante,
  firmanteHasSexoForCurp,
} from './curp-firmante-demographics.util';

describe('buildCurpDemographicsForFirmante', () => {
  it('SIRES usa sexoCURP y omite sexo', () => {
    const demo = buildCurpDemographicsForFirmante(
      {
        sexo: 'Masculino',
        sexoCURP: 3,
        fechaNacimiento: '1990-01-01',
        entidadNacimiento: '09',
      },
      { useSexoCurpForValidation: true },
    );

    expect(demo.sexoCURP).toBe(3);
    expect(demo.sexo).toBeUndefined();
  });

  it('SIN_REGIMEN usa sexo y omite sexoCURP', () => {
    const demo = buildCurpDemographicsForFirmante(
      {
        sexo: 'Femenino',
        sexoCURP: 2,
        fechaNacimiento: '1990-01-01',
        entidadNacimiento: '09',
      },
      { useSexoCurpForValidation: false },
    );

    expect(demo.sexo).toBe('Femenino');
    expect(demo.sexoCURP).toBeUndefined();
  });
});

describe('firmanteHasSexoForCurp', () => {
  it('acepta sexoCURP=3 en SIRES', () => {
    expect(
      firmanteHasSexoForCurp({ sexoCURP: 3 }, true),
    ).toBe(true);
  });

  it('requiere sexo en SIN_REGIMEN', () => {
    expect(firmanteHasSexoForCurp({ sexo: 'Masculino' }, false)).toBe(true);
    expect(firmanteHasSexoForCurp({ sexoCURP: 1 }, false)).toBe(false);
  });
});
