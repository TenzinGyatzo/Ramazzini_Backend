import {
  isAgeAllowedForLinfLsup,
  isCIE10Exact4Chars,
  isSexAllowedForLsex,
  isTipoPersonalAllowedForDiagnostico1,
  normalizeCie10CatalogKey,
  parseTipoPersonalCeList,
} from './cie10-diagnostico-sis.util';

function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

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
    it('blocks male for MUJER-only code', () => {
      expect(isSexAllowedForLsex('MUJER', 1)).toBe(false);
    });
    it('allows female for MUJER-only code', () => {
      expect(isSexAllowedForLsex('MUJER', 2)).toBe(true);
    });
    it('blocks female for HOMBRE-only code', () => {
      expect(isSexAllowedForLsex('HOMBRE', 2)).toBe(false);
    });
    it('does not treat SI as a sex restriction', () => {
      expect(isSexAllowedForLsex('SI', 2)).toBe(true);
      expect(isSexAllowedForLsex('SI', 1)).toBe(true);
    });
    it('allows any sex when LSEX is NO', () => {
      expect(isSexAllowedForLsex('NO', 1)).toBe(true);
      expect(isSexAllowedForLsex('NO', 2)).toBe(true);
    });
  });

  describe('isAgeAllowedForLinfLsup', () => {
    it('allows when LINF/LSUP are NO', () => {
      expect(isAgeAllowedForLinfLsup('NO', 'NO', d(2000, 1, 1), d(2024, 1, 1))).toBe(
        true,
      );
    });

    it('010A: valid on the 10th birthday, invalid the day before', () => {
      const birth = d(2014, 6, 15);
      expect(isAgeAllowedForLinfLsup('010A', '120A', birth, d(2024, 6, 15))).toBe(
        true,
      );
      expect(isAgeAllowedForLinfLsup('010A', '120A', birth, d(2024, 6, 14))).toBe(
        false,
      );
    });

    it('028D: valid on day 28 of life, invalid the day before', () => {
      const birth = d(2024, 1, 1);
      expect(isAgeAllowedForLinfLsup('028D', 'NO', birth, d(2024, 1, 29))).toBe(
        true,
      );
      expect(isAgeAllowedForLinfLsup('028D', 'NO', birth, d(2024, 1, 28))).toBe(
        false,
      );
    });

    it('006M: valid on the 6-month anniversary, invalid the day before', () => {
      const birth = d(2024, 1, 15);
      expect(isAgeAllowedForLinfLsup('006M', 'NO', birth, d(2024, 7, 15))).toBe(
        true,
      );
      expect(isAgeAllowedForLinfLsup('006M', 'NO', birth, d(2024, 7, 14))).toBe(
        false,
      );
    });

    it('LSUP 018A: valid on 18th birthday, invalid the next day', () => {
      const birth = d(2006, 3, 10);
      expect(isAgeAllowedForLinfLsup('NO', '018A', birth, d(2024, 3, 10))).toBe(
        true,
      );
      expect(isAgeAllowedForLinfLsup('NO', '018A', birth, d(2024, 3, 11))).toBe(
        false,
      );
    });

    it('does not block when dates are missing', () => {
      expect(isAgeAllowedForLinfLsup('010A', '120A', null, d(2024, 1, 1))).toBe(
        true,
      );
    });
  });

  describe('isTipoPersonalAllowedForDiagnostico1', () => {
    const list1 = [1, 2, 3, 4];
    const list2 = [1, 2, 5];

    it('requires tipoPersonal when list is non-empty', () => {
      expect(
        isTipoPersonalAllowedForDiagnostico1(0, null, list1, list2),
      ).toEqual({
        allowed: false,
        requiresTipoPersonal: true,
        emptyAuthorizedList: false,
      });
    });

    it('allows when tipoPersonal in primera vez list', () => {
      expect(
        isTipoPersonalAllowedForDiagnostico1(0, 2, list1, list2),
      ).toEqual({
        allowed: true,
        requiresTipoPersonal: true,
        emptyAuthorizedList: false,
      });
    });

    it('blocks when tipoPersonal not in subsecuente list', () => {
      expect(
        isTipoPersonalAllowedForDiagnostico1(1, 3, list1, list2),
      ).toEqual({
        allowed: false,
        requiresTipoPersonal: true,
        emptyAuthorizedList: false,
      });
    });

    it('blocks when authorized list is empty (NO / vacío)', () => {
      expect(isTipoPersonalAllowedForDiagnostico1(0, 2, [], list2)).toEqual({
        allowed: false,
        requiresTipoPersonal: true,
        emptyAuthorizedList: true,
      });
      expect(isTipoPersonalAllowedForDiagnostico1(1, 1, list1, [])).toEqual({
        allowed: false,
        requiresTipoPersonal: true,
        emptyAuthorizedList: true,
      });
    });

    it('does not restrict when relacionTemporal is not 0 or 1', () => {
      expect(isTipoPersonalAllowedForDiagnostico1(null, 2, [], [])).toEqual({
        allowed: true,
        requiresTipoPersonal: false,
        emptyAuthorizedList: false,
      });
    });
  });
});
