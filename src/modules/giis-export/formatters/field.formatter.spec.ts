import {
  toGIISString,
  toGIISMultiValue,
  joinGIISFields,
  padNumber,
  formatCURP,
  formatCLUES,
  formatCIE10,
  formatResultEnum,
  normalizeNameForGiis,
} from './field.formatter';

describe('Field Formatter', () => {
  describe('toGIISString', () => {
    it('should convert number to string', () => {
      expect(toGIISString(123)).toBe('123');
      expect(toGIISString(0)).toBe('0');
      expect(toGIISString(-5)).toBe('-5');
    });

    it('should trim strings', () => {
      expect(toGIISString('  test  ')).toBe('test');
      expect(toGIISString('hello')).toBe('hello');
    });

    it('should convert boolean to 1/0', () => {
      expect(toGIISString(true)).toBe('1');
      expect(toGIISString(false)).toBe('0');
    });

    it('should return empty string for null', () => {
      expect(toGIISString(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(toGIISString(undefined)).toBe('');
    });

    it('should convert arrays using multi-value formatter', () => {
      expect(toGIISString([1, 2, 3])).toBe('1&2&3');
    });

    it('should return empty string for objects', () => {
      expect(toGIISString({})).toBe('');
      expect(toGIISString({ key: 'value' })).toBe('');
    });
  });

  describe('toGIISMultiValue', () => {
    it('should join numbers with &', () => {
      expect(toGIISMultiValue([1, 2, 3])).toBe('1&2&3');
    });

    it('should join strings with &', () => {
      expect(toGIISMultiValue(['a', 'b', 'c'])).toBe('a&b&c');
    });

    it('should handle mixed types', () => {
      expect(toGIISMultiValue([1, 'two', 3])).toBe('1&two&3');
    });

    it('should filter out null and undefined values', () => {
      expect(toGIISMultiValue([1, null, 3, undefined, 5])).toBe('1&3&5');
    });

    it('should filter out empty strings', () => {
      expect(toGIISMultiValue(['a', '', 'b', '  ', 'c'])).toBe('a&b&c');
    });

    it('should return empty string for empty array', () => {
      expect(toGIISMultiValue([])).toBe('');
    });

    it('should return empty string for null', () => {
      expect(toGIISMultiValue(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(toGIISMultiValue(undefined)).toBe('');
    });

    it('should handle single element array', () => {
      expect(toGIISMultiValue([42])).toBe('42');
    });
  });

  describe('joinGIISFields', () => {
    it('should join fields with pipe', () => {
      expect(joinGIISFields(['A', 'B', 'C'])).toBe('A|B|C');
    });

    it('should preserve empty fields as empty strings', () => {
      expect(joinGIISFields(['A', '', 'C'])).toBe('A||C');
      expect(joinGIISFields(['A', null, 'C'])).toBe('A||C');
      expect(joinGIISFields(['A', undefined, 'C'])).toBe('A||C');
    });

    it('should convert numbers to strings', () => {
      expect(joinGIISFields([1, 2, 3])).toBe('1|2|3');
    });

    it('should handle mixed types', () => {
      expect(joinGIISFields(['A', 1, null, true])).toBe('A|1||1');
    });

    it('should handle empty array', () => {
      expect(joinGIISFields([])).toBe('');
    });

    it('should produce correct pipe count (fields - 1)', () => {
      const result = joinGIISFields(['A', 'B', 'C', 'D', 'E']);
      expect(result.split('|').length).toBe(5);
      expect((result.match(/\|/g) || []).length).toBe(4);
    });
  });

  describe('padNumber', () => {
    it('should pad single digit to specified length', () => {
      expect(padNumber(5, 2)).toBe('05');
      expect(padNumber(5, 3)).toBe('005');
    });

    it('should not truncate numbers longer than length', () => {
      expect(padNumber(123, 2)).toBe('123');
    });

    it('should handle string input', () => {
      expect(padNumber('7', 3)).toBe('007');
    });

    it('should return empty string for null', () => {
      expect(padNumber(null, 2)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(padNumber(undefined, 2)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(padNumber('', 2)).toBe('');
    });
  });

  describe('formatCURP', () => {
    it('should uppercase and trim CURP', () => {
      expect(formatCURP('roaj850102hdflrn08')).toBe('ROAJ850102HDFLRN08');
    });

    it('should return empty string for invalid length', () => {
      expect(formatCURP('TOOSHORT')).toBe('');
      expect(formatCURP('TOOLONGCURPVALUE12345')).toBe('');
    });

    it('should return empty string for null', () => {
      expect(formatCURP(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatCURP(undefined)).toBe('');
    });

    it('should handle valid 18-char CURP', () => {
      expect(formatCURP('ROAJ850102HDFLRN08')).toBe('ROAJ850102HDFLRN08');
    });
  });

  describe('formatCLUES', () => {
    it('should uppercase and trim CLUES', () => {
      expect(formatCLUES('ascij000012')).toBe('ASCIJ000012');
    });

    it('should return empty string for invalid length', () => {
      expect(formatCLUES('SHORT')).toBe('');
      expect(formatCLUES('TOOLONGCLUES12')).toBe('');
    });

    it('should return empty string for null', () => {
      expect(formatCLUES(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatCLUES(undefined)).toBe('');
    });

    it('should handle valid 11-char CLUES', () => {
      expect(formatCLUES('ASCIJ000012')).toBe('ASCIJ000012');
    });
  });

  describe('formatCIE10', () => {
    it('should uppercase CIE-10 code', () => {
      expect(formatCIE10('a00.0')).toBe('A00.0');
    });

    it('should trim whitespace', () => {
      expect(formatCIE10('  J18.9  ')).toBe('J18.9');
    });

    it('should return empty string for null', () => {
      expect(formatCIE10(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatCIE10(undefined)).toBe('');
    });
  });

  describe('formatResultEnum', () => {
    it('should convert 0 (Positivo) to "0"', () => {
      expect(formatResultEnum(0)).toBe('0');
    });

    it('should convert 1 (Negativo) to "1"', () => {
      expect(formatResultEnum(1)).toBe('1');
    });

    it('should convert -1 (NA) to empty string', () => {
      expect(formatResultEnum(-1)).toBe('');
    });

    it('should return empty string for null', () => {
      expect(formatResultEnum(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatResultEnum(undefined)).toBe('');
    });
  });

  describe('normalizeNameForGiis', () => {
    it('should remove accents and uppercase', () => {
      expect(normalizeNameForGiis('María')).toBe('MARIA');
      expect(normalizeNameForGiis('José')).toBe('JOSE');
      expect(normalizeNameForGiis('Ángel')).toBe('ANGEL');
    });

    it('should preserve Ñ as Ñ', () => {
      expect(normalizeNameForGiis('Muñoz')).toBe('MUÑOZ');
      expect(normalizeNameForGiis('Niño')).toBe('NIÑO');
    });

    it('should preserve diéresis on vowels and remove plain accents', () => {
      expect(normalizeNameForGiis('Argüello')).toBe('ARGÜELLO');
      expect(normalizeNameForGiis('Cöss')).toBe('CÖSS');
      expect(normalizeNameForGiis('Gärcia')).toBe('GÄRCIA');
      expect(normalizeNameForGiis('Álvarez')).toBe('ALVAREZ');
    });

    it('should allow permitted special chars and collapse consecutive same special', () => {
      expect(normalizeNameForGiis("O'Brien")).toBe("O'BRIEN");
      expect(normalizeNameForGiis('Del Río')).toBe('DEL RIO');
      expect(normalizeNameForGiis('Pérez--Gómez')).toBe('PEREZ-GOMEZ');
    });

    it('should strip invalid characters', () => {
      expect(normalizeNameForGiis('María@')).toBe('MARIA');
      expect(normalizeNameForGiis('Test#1')).toBe('TEST');
    });

    it('should return empty string for null/undefined/empty', () => {
      expect(normalizeNameForGiis(null)).toBe('');
      expect(normalizeNameForGiis(undefined)).toBe('');
      expect(normalizeNameForGiis('')).toBe('');
      expect(normalizeNameForGiis('   ')).toBe('');
    });

    it('should trim and collapse multiple spaces', () => {
      expect(normalizeNameForGiis('  Juan   Carlos  ')).toBe('JUAN CARLOS');
    });
  });
});
