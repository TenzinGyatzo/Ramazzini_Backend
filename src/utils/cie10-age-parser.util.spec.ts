import {
  addCatalogAgeLimit,
  parseAgeLimit,
  parseCatalogAgeLimit,
} from './cie10-age-parser.util';

describe('CIE10 Age Parser Utility', () => {
  describe('parseCatalogAgeLimit', () => {
    it('parses days, months and years', () => {
      expect(parseCatalogAgeLimit('028D')).toEqual({ value: 28, unit: 'D' });
      expect(parseCatalogAgeLimit('006M')).toEqual({ value: 6, unit: 'M' });
      expect(parseCatalogAgeLimit('010A')).toEqual({ value: 10, unit: 'A' });
      expect(parseCatalogAgeLimit('010Y')).toEqual({ value: 10, unit: 'A' });
    });

    it('returns null for NO and empty', () => {
      expect(parseCatalogAgeLimit('NO')).toBeNull();
      expect(parseCatalogAgeLimit('')).toBeNull();
    });
  });

  describe('addCatalogAgeLimit', () => {
    it('adds days months and years on the calendar', () => {
      const birth = new Date(2024, 0, 1);
      expect(addCatalogAgeLimit(birth, { value: 28, unit: 'D' })).toEqual(
        new Date(2024, 0, 29),
      );
      expect(addCatalogAgeLimit(birth, { value: 6, unit: 'M' })).toEqual(
        new Date(2024, 6, 1),
      );
      expect(addCatalogAgeLimit(birth, { value: 10, unit: 'A' })).toEqual(
        new Date(2034, 0, 1),
      );
    });
  });

  describe('parseAgeLimit', () => {
    it('should parse "010A" to 10 years', () => {
      const result = parseAgeLimit('010A');
      expect(result).toBe(10);
    });

    it('should parse "120A" to 120 years', () => {
      const result = parseAgeLimit('120A');
      expect(result).toBe(120);
    });

    it('should parse "028D" to approximately 0.0766 years (28 days)', () => {
      const result = parseAgeLimit('028D');
      expect(result).toBeCloseTo(28 / 365.25, 4);
    });

    it('should parse "006M" to 0.5 years (6 months)', () => {
      const result = parseAgeLimit('006M');
      expect(result).toBe(0.5);
    });

    it('should parse "012M" to 1 year (12 months)', () => {
      const result = parseAgeLimit('012M');
      expect(result).toBe(1);
    });

    it('should return null for "NO"', () => {
      const result = parseAgeLimit('NO');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseAgeLimit('');
      expect(result).toBeNull();
    });

    it('should return null for null', () => {
      const result = parseAgeLimit(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined', () => {
      const result = parseAgeLimit(undefined);
      expect(result).toBeNull();
    });

    it('should handle "020A" (20 years)', () => {
      const result = parseAgeLimit('020A');
      expect(result).toBe(20);
    });

    it('should handle "001A" (1 year)', () => {
      const result = parseAgeLimit('001A');
      expect(result).toBe(1);
    });

    it('should handle "000A" (0 years)', () => {
      const result = parseAgeLimit('000A');
      expect(result).toBe(0);
    });

    it('should handle lowercase "010a"', () => {
      const result = parseAgeLimit('010a');
      expect(result).toBe(10);
    });

    it('should handle "Y" unit as years', () => {
      const result = parseAgeLimit('010Y');
      expect(result).toBe(10);
    });

    it('should fallback to number parsing for plain numbers', () => {
      const result = parseAgeLimit('10');
      expect(result).toBe(10);
    });

    it('should return null for invalid format', () => {
      const result = parseAgeLimit('INVALID');
      expect(result).toBeNull();
    });
  });
});
