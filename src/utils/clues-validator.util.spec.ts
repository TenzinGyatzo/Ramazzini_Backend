import {
  CLUES_SERVICIOS_MEDICOS_PRIVADOS,
  isValidCluesFormat,
  requiresCluesCatalogValidation,
} from './clues-validator.util';

describe('clues-validator.util', () => {
  it('acepta CLUES de 11 caracteres alfanuméricos', () => {
    expect(isValidCluesFormat('DFSSA001234')).toBe(true);
    expect(isValidCluesFormat('dfssa001234')).toBe(true);
  });

  it('acepta el sentinel 9998 (servicios médicos privados)', () => {
    expect(isValidCluesFormat('9998')).toBe(true);
    expect(CLUES_SERVICIOS_MEDICOS_PRIVADOS).toBe('9998');
  });

  it('rechaza formatos inválidos', () => {
    expect(isValidCluesFormat('INVALID')).toBe(false);
    expect(isValidCluesFormat('123456789012')).toBe(false);
    expect(isValidCluesFormat('')).toBe(false);
  });

  it('no requiere catálogo para 9998', () => {
    expect(requiresCluesCatalogValidation('9998')).toBe(false);
    expect(requiresCluesCatalogValidation('DFSSA001234')).toBe(true);
  });
});
