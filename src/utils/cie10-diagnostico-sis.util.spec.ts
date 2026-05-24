import {
  isAgeAllowedForLimits,
  isCIE10Exact4Chars,
  isSexAllowedForLsex,
  isTipoPersonalAllowedForDiagnostico1,
  normalizeCie10CatalogKey,
  parseTipoPersonalCeList,
} from './cie10-diagnostico-sis.util';

describe('cie10-diagnostico-sis.util', () => {
  describe('parseTipoPersonalCeList', () => {
    it('parses comma-separated codes', () => {
      expect(parseTipoPersonalCeList('1,2,3,4')).toEqual([1, 2, 3, 4]);
    });
    it('returns empty for NO', () => {
      expect(parseTipoPersonalCeList('NO')).toEqual([]);
    });
  });

  describe('isCIE10Exact4Chars', () => {
    it('accepts 4-char catalog keys', () => {
      expect(isCIE10Exact4Chars('C530')).toBe(true);
      expect(isCIE10Exact4Chars('A150 - desc')).toBe(true);
    });
    it('rejects 3-char codes', () => {
      expect(isCIE10Exact4Chars('C53')).toBe(false);
    });
  });

  describe('normalizeCie10CatalogKey', () => {
    it('normalizes to 4 chars', () => {
      expect(normalizeCie10CatalogKey('C530')).toBe('C530');
    });
  });

  describe('isSexAllowedForLsex', () => {
    it('allows intersexual regardless of LSEX', () => {
      expect(isSexAllowedForLsex('MUJER', 3)).toBe(true);
    });
    it('blocks female for MUJER-only code', () => {
      expect(isSexAllowedForLsex('MUJER', 1)).toBe(false);
    });
    it('allows female for MUJER-only code', () => {
      expect(isSexAllowedForLsex('MUJER', 2)).toBe(true);
    });
  });

  describe('isAgeAllowedForLimits', () => {
    it('validates LINF/LSUP in catalog format', () => {
      expect(isAgeAllowedForLimits('010A', '120A', 25)).toBe(true);
      expect(isAgeAllowedForLimits('010A', '120A', 5)).toBe(false);
    });
  });

  describe('isTipoPersonalAllowedForDiagnostico1', () => {
    const list1 = [1, 2, 3, 4];
    const list2 = [1, 2, 5];

    it('requires tipoPersonal when list is non-empty', () => {
      expect(
        isTipoPersonalAllowedForDiagnostico1(0, null, list1, list2),
      ).toEqual({ allowed: false, requiresTipoPersonal: true });
    });

    it('allows when tipoPersonal in primera vez list', () => {
      expect(
        isTipoPersonalAllowedForDiagnostico1(0, 2, list1, list2),
      ).toEqual({ allowed: true, requiresTipoPersonal: true });
    });

    it('blocks when tipoPersonal not in subsecuente list', () => {
      expect(
        isTipoPersonalAllowedForDiagnostico1(1, 3, list1, list2),
      ).toEqual({ allowed: false, requiresTipoPersonal: true });
    });
  });
});
