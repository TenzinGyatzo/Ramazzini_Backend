import {
  getRamazziniLetraBlockMessage,
  getRamazziniLetraFromCatalogKey,
  resolveRamazziniLetraFueraDeAlcance,
} from './cie10-ramazzini-scope.util';

describe('cie10-ramazzini-scope.util', () => {
  it('detecta MT y CP por CATALOG_KEY', () => {
    expect(getRamazziniLetraFromCatalogKey('MT01')).toBe('MT');
    expect(getRamazziniLetraFromCatalogKey('CP01')).toBe('CP');
    expect(getRamazziniLetraFromCatalogKey('E110')).toBeNull();
  });

  it('prioriza letra del catálogo', () => {
    expect(resolveRamazziniLetraFueraDeAlcance('XXXX', 'CP')).toBe('CP');
  });

  it('mensajes distinguen MT vs CP', () => {
    expect(getRamazziniLetraBlockMessage('MT', 'MT01')).toContain('tradicional');
    expect(getRamazziniLetraBlockMessage('CP', 'CP01')).toContain('oncología');
  });
});
