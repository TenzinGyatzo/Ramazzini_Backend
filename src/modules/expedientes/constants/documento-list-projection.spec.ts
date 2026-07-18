import {
  DOCUMENTO_LIST_EXTRA_FIELDS,
  getDocumentoListSelect,
} from './documento-list-projection';

describe('documento-list-projection', () => {
  it('incluye campos comunes y fecha de historia clínica', () => {
    const select = getDocumentoListSelect('historiaClinica');
    expect(select).toContain('_id');
    expect(select).toContain('rutaPDF');
    expect(select).toContain('pdfStatus');
    expect(select).toContain('fechaHistoriaClinica');
    expect(select).toContain('resumenHistoriaClinica');
    expect(select).not.toContain('antecedentesHeredoFamiliares');
  });

  it('tiene proyección para todos los tipos del mapa', () => {
    expect(Object.keys(DOCUMENTO_LIST_EXTRA_FIELDS).length).toBeGreaterThanOrEqual(
      20,
    );
    expect(getDocumentoListSelect('notaMedica')).toContain('diagnostico');
    expect(getDocumentoListSelect('documentoExterno')).toContain(
      'idResultadoClinico',
    );
  });
});
