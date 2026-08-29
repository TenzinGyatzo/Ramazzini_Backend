import {
  getInicioDocumentTypesForRegime,
  INICIO_DOCUMENT_TYPES,
} from './inicio-document-types';

describe('inicio-document-types', () => {
  it('incluye los 23 tipos de expediente', () => {
    expect(INICIO_DOCUMENT_TYPES).toHaveLength(23);
    const types = INICIO_DOCUMENT_TYPES.map((item) => item.documentType);
    expect(types).toContain('notaMedica');
    expect(types).toContain('historiaClinica');
    expect(types).not.toContain('deteccion');
    expect(types).not.toContain('seguimientoProgramadoCardiometabolico');
  });

  it('omite controlPrenatal en SIRES y notaAclaratoria en SIN_REGIMEN', () => {
    const sires = getInicioDocumentTypesForRegime('SIRES_NOM024').map(
      (item) => item.documentType,
    );
    const sin = getInicioDocumentTypesForRegime('SIN_REGIMEN').map(
      (item) => item.documentType,
    );

    expect(sires).not.toContain('controlPrenatal');
    expect(sires).toContain('notaAclaratoria');
    expect(sin).not.toContain('notaAclaratoria');
    expect(sin).toContain('controlPrenatal');
  });
});
