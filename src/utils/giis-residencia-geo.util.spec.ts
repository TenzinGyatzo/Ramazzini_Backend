import {
  validateResidenciaGeoGiisCoherence,
  GIIS_ENTIDAD_NO_APLICA,
  GIIS_ENTIDAD_SE_IGNORA,
  GIIS_ENTIDAD_NO_ESPECIFICADO,
  GIIS_MUNICIPIO_NO_APLICA,
  GIIS_LOCALIDAD_NO_APLICA,
  GIIS_MUNICIPIO_SE_IGNORA,
  GIIS_LOCALIDAD_SE_IGNORA,
  GIIS_MUNICIPIO_NO_ESPECIFICADO,
  GIIS_LOCALIDAD_NO_ESPECIFICADO,
  PAIS_RESIDENCIA_MEXICO,
  PAIS_RESIDENCIA_NO_ESPECIFICADO,
} from './giis-residencia-geo.util';

describe('validateResidenciaGeoGiisCoherence', () => {
  it('exige 997/9997 cuando entidad es 88', () => {
    const errors = validateResidenciaGeoGiisCoherence({
      paisResidencia: 840,
      entidadResidencia: GIIS_ENTIDAD_NO_APLICA,
      municipioResidencia: '001',
      localidadResidencia: '0001',
    });

    expect(errors).toContain(
      'País de residencia distinto de México requiere municipio 997 (NO APLICA)',
    );
    expect(errors).toContain(
      'País de residencia distinto de México requiere localidad 9997 (NO APLICA)',
    );
  });

  it('acepta extranjero con 88/997/9997', () => {
    const errors = validateResidenciaGeoGiisCoherence({
      paisResidencia: 840,
      entidadResidencia: GIIS_ENTIDAD_NO_APLICA,
      municipioResidencia: GIIS_MUNICIPIO_NO_APLICA,
      localidadResidencia: GIIS_LOCALIDAD_NO_APLICA,
    });

    expect(errors).toHaveLength(0);
  });

  it('trata pais 248 como extranjero', () => {
    const errors = validateResidenciaGeoGiisCoherence({
      paisResidencia: PAIS_RESIDENCIA_NO_ESPECIFICADO,
      entidadResidencia: GIIS_ENTIDAD_NO_ESPECIFICADO,
      municipioResidencia: GIIS_MUNICIPIO_NO_ESPECIFICADO,
      localidadResidencia: GIIS_LOCALIDAD_NO_ESPECIFICADO,
    });

    expect(errors).toContain(
      'País de residencia distinto de México requiere entidad 88 (NO APLICA)',
    );
  });

  it('exige 998/9998 cuando entidad es 99', () => {
    const errors = validateResidenciaGeoGiisCoherence({
      paisResidencia: PAIS_RESIDENCIA_MEXICO,
      entidadResidencia: GIIS_ENTIDAD_SE_IGNORA,
      municipioResidencia: GIIS_MUNICIPIO_NO_APLICA,
      localidadResidencia: GIIS_LOCALIDAD_NO_APLICA,
    });

    expect(errors).toContain(
      `Con entidad ${GIIS_ENTIDAD_SE_IGNORA} el municipio de residencia debe ser ${GIIS_MUNICIPIO_SE_IGNORA}`,
    );
    expect(errors).toContain(
      `Con entidad ${GIIS_ENTIDAD_SE_IGNORA} la localidad de residencia debe ser ${GIIS_LOCALIDAD_SE_IGNORA}`,
    );
  });

  it('rechaza entidad 88 con país México', () => {
    const errors = validateResidenciaGeoGiisCoherence({
      paisResidencia: PAIS_RESIDENCIA_MEXICO,
      entidadResidencia: GIIS_ENTIDAD_NO_APLICA,
      municipioResidencia: GIIS_MUNICIPIO_NO_APLICA,
      localidadResidencia: GIIS_LOCALIDAD_NO_APLICA,
    });

    expect(errors).toContain(
      'Entidad 88 (NO APLICA) no aplica cuando el país de residencia es México (142)',
    );
  });

  it('exige 999/9999 cuando entidad es 00', () => {
    const errors = validateResidenciaGeoGiisCoherence({
      paisResidencia: PAIS_RESIDENCIA_MEXICO,
      entidadResidencia: GIIS_ENTIDAD_NO_ESPECIFICADO,
      municipioResidencia: GIIS_MUNICIPIO_SE_IGNORA,
      localidadResidencia: GIIS_LOCALIDAD_SE_IGNORA,
    });

    expect(errors).toContain(
      `Con entidad ${GIIS_ENTIDAD_NO_ESPECIFICADO} el municipio de residencia debe ser ${GIIS_MUNICIPIO_NO_ESPECIFICADO}`,
    );
  });

  it('valida municipio 999 con localidad 9999 en entidad estatal', () => {
    const valid = validateResidenciaGeoGiisCoherence({
      paisResidencia: PAIS_RESIDENCIA_MEXICO,
      entidadResidencia: '14',
      municipioResidencia: GIIS_MUNICIPIO_NO_ESPECIFICADO,
      localidadResidencia: GIIS_LOCALIDAD_NO_ESPECIFICADO,
    });
    expect(valid).toHaveLength(0);

    const invalid = validateResidenciaGeoGiisCoherence({
      paisResidencia: PAIS_RESIDENCIA_MEXICO,
      entidadResidencia: '14',
      municipioResidencia: GIIS_MUNICIPIO_NO_ESPECIFICADO,
      localidadResidencia: GIIS_LOCALIDAD_SE_IGNORA,
    });
    expect(invalid.length).toBeGreaterThan(0);
  });

  it('valida municipio real con localidad 9998', () => {
    const errors = validateResidenciaGeoGiisCoherence({
      paisResidencia: PAIS_RESIDENCIA_MEXICO,
      entidadResidencia: '14',
      municipioResidencia: '039',
      localidadResidencia: GIIS_LOCALIDAD_SE_IGNORA,
    });

    expect(errors).toHaveLength(0);
  });
});
