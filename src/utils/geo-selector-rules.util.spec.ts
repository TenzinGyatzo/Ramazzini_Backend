import {
  getAllowedEntidadCodesForPaisNacimiento,
  getAllowedEntidadCodesForPaisResidencia,
  getExcludedPaisCodes,
  getNonMexicoEntidadCodes,
  isEntidadNacimientoEspecialForFirmante,
  validateFirmanteResidenciaSentinels,
  validatePaisEntidadCoherence,
} from './geo-selector-rules.util';
import {
  PAIS_RESIDENCIA_MEXICO,
  validateResidenciaGeoGiisCoherence,
} from './giis-residencia-geo.util';

describe('geo-selector-rules.util', () => {
  it('nacimiento México trabajador permite 00, 99 y 01-32', () => {
    const allowed = getAllowedEntidadCodesForPaisNacimiento(
      PAIS_RESIDENCIA_MEXICO,
      'trabajador',
    );
    expect(allowed).toContain('00');
    expect(allowed).toContain('99');
    expect(allowed).toContain('09');
    expect(allowed).toHaveLength(34);
  });

  it('nacimiento México firmante solo entidades 01-32', () => {
    const allowed = getAllowedEntidadCodesForPaisNacimiento(
      PAIS_RESIDENCIA_MEXICO,
      'firmante',
    );
    expect(allowed).toHaveLength(32);
    expect(allowed).not.toContain('00');
    expect(allowed).not.toContain('99');
  });

  it('valida coherencia nacimiento México + entidad 00/99 para trabajador', () => {
    expect(
      validatePaisEntidadCoherence(142, '00', 'trabajador', 'nacimiento'),
    ).toEqual([]);
    expect(
      validatePaisEntidadCoherence(142, '99', 'trabajador', 'nacimiento'),
    ).toEqual([]);
  });

  it('residencia México trabajador incluye 00 y 99', () => {
    const allowed = getAllowedEntidadCodesForPaisResidencia(PAIS_RESIDENCIA_MEXICO, 'trabajador');
    expect(allowed).toContain('00');
    expect(allowed).toContain('99');
  });

  it('firmante excluye países 247 y 248', () => {
    expect(getExcludedPaisCodes('firmante')).toEqual(['247', '248']);
  });

  it('nacimiento extranjero solo acepta 88 para trabajador y firmante', () => {
    expect(getNonMexicoEntidadCodes('trabajador')).toEqual(['88']);
    expect(getNonMexicoEntidadCodes('firmante')).toEqual(['88']);
    expect(getAllowedEntidadCodesForPaisNacimiento(228, 'trabajador')).toEqual([
      '88',
    ]);
    expect(isEntidadNacimientoEspecialForFirmante('88')).toBe(true);
    expect(isEntidadNacimientoEspecialForFirmante('NE')).toBe(false);
    expect(isEntidadNacimientoEspecialForFirmante('09')).toBe(false);
  });

  it('rechaza centinelas prohibidas para firmante en residencia', () => {
    const errors = validateFirmanteResidenciaSentinels('00', '999', '9999');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('valida coherencia residencia México + entidad 99', () => {
    expect(
      validatePaisEntidadCoherence(142, '99', 'trabajador', 'residencia'),
    ).toEqual([]);
  });
});

describe('validateResidenciaGeoGiisCoherence con geoContext', () => {
  it('trabajador extranjero exige 88/997/9997', () => {
    expect(
      validateResidenciaGeoGiisCoherence(
        {
          paisResidencia: 246,
          entidadResidencia: '88',
          municipioResidencia: '997',
          localidadResidencia: '9997',
        },
        'trabajador',
      ),
    ).toEqual([]);

    expect(
      validateResidenciaGeoGiisCoherence(
        {
          paisResidencia: 246,
          entidadResidencia: '00',
          municipioResidencia: '999',
          localidadResidencia: '9999',
        },
        'trabajador',
      ).length,
    ).toBeGreaterThan(0);
  });

  it('firmante extranjero rechaza entidad 00', () => {
    const errors = validateResidenciaGeoGiisCoherence(
      {
        paisResidencia: 228,
        entidadResidencia: '00',
        municipioResidencia: '999',
        localidadResidencia: '9999',
      },
      'firmante',
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it('firmante México rechaza municipio 999', () => {
    const errors = validateResidenciaGeoGiisCoherence(
      {
        paisResidencia: 142,
        entidadResidencia: '09',
        municipioResidencia: '999',
        localidadResidencia: '9999',
      },
      'firmante',
    );
    expect(errors.some((e) => e.includes('999'))).toBe(true);
  });
});
