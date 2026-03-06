/**
 * NOM-024 GIIS Export Transformation Tests (Task 16)
 *
 * Tests GIIS export transformers and formatters.
 * This test suite verifies the transformation layer creates correct
 * pipe-delimited output for GIIS-B013 records.
 */

import {
  toAAAAMMDD,
  toDDMMAAAA,
  toHHMM,
} from '../../src/modules/giis-export/formatters/date.formatter';
import {
  toGIISHM,
  toGIISNumeric,
} from '../../src/modules/giis-export/formatters/sexo.formatter';
import {
  toGIISString,
  toGIISMultiValue,
  joinGIISFields,
  padNumber,
  formatCURP,
  formatCLUES,
  formatResultEnum,
} from '../../src/modules/giis-export/formatters/field.formatter';
describe('NOM-024 GIIS Export Transformation (Task 16)', () => {
  describe('Date Formatter', () => {
    describe('toAAAAMMDD', () => {
      it('should format Date to YYYYMMDD', () => {
        const date = new Date('2024-03-15T00:00:00Z');
        expect(toAAAAMMDD(date)).toBe('20240315');
      });

      it('should format ISO string to YYYYMMDD', () => {
        expect(toAAAAMMDD('2024-03-15T10:30:00Z')).toBe('20240315');
      });

      it('should return empty string for null', () => {
        expect(toAAAAMMDD(null)).toBe('');
      });

      it('should return empty string for undefined', () => {
        expect(toAAAAMMDD(undefined)).toBe('');
      });

      it('should handle invalid dates', () => {
        expect(toAAAAMMDD('invalid')).toBe('');
      });
    });

    describe('toDDMMAAAA', () => {
      it('should format Date to DD/MM/YYYY', () => {
        const date = new Date('2024-03-15T00:00:00Z');
        expect(toDDMMAAAA(date)).toBe('15/03/2024');
      });

      it('should return empty string for null', () => {
        expect(toDDMMAAAA(null)).toBe('');
      });
    });

    describe('toHHMM', () => {
      it('should format HH:mm to HHMM', () => {
        expect(toHHMM('14:30')).toBe('1430');
        expect(toHHMM('08:05')).toBe('0805');
      });

      it('should return empty string for null', () => {
        expect(toHHMM(null)).toBe('');
      });

      it('should return empty string for invalid format', () => {
        expect(toHHMM('invalid')).toBe('');
      });

      it('should return empty string for invalid hour', () => {
        expect(toHHMM('25:00')).toBe('');
      });
    });
  });

  describe('Sexo Formatter', () => {
    describe('toGIISHM', () => {
      it('should map Masculino to H', () => {
        expect(toGIISHM('Masculino')).toBe('H');
        expect(toGIISHM('masculino')).toBe('H');
      });

      it('should map Femenino to M', () => {
        expect(toGIISHM('Femenino')).toBe('M');
        expect(toGIISHM('femenino')).toBe('M');
      });

      it('should return empty for unknown values', () => {
        expect(toGIISHM(null)).toBe('');
        expect(toGIISHM(undefined)).toBe('');
        expect(toGIISHM('Unknown')).toBe('');
      });
    });

    describe('toGIISNumeric', () => {
      it('should map Masculino to 1', () => {
        expect(toGIISNumeric('Masculino')).toBe('1');
        expect(toGIISNumeric('masculino')).toBe('1');
      });

      it('should map Femenino to 2', () => {
        expect(toGIISNumeric('Femenino')).toBe('2');
        expect(toGIISNumeric('femenino')).toBe('2');
      });

      it('should map Intersexual to 3', () => {
        expect(toGIISNumeric('Intersexual')).toBe('3');
        expect(toGIISNumeric('intersexual')).toBe('3');
      });

      it('should map number strings', () => {
        expect(toGIISNumeric('1')).toBe('1');
        expect(toGIISNumeric('2')).toBe('2');
        expect(toGIISNumeric('3')).toBe('3');
      });

      it('should return empty for null/undefined', () => {
        expect(toGIISNumeric(null)).toBe('');
        expect(toGIISNumeric(undefined)).toBe('');
      });
    });
  });

  describe('Field Formatter', () => {
    describe('toGIISString', () => {
      it('should convert values to string', () => {
        expect(toGIISString('hello')).toBe('hello');
        expect(toGIISString(123)).toBe('123');
        expect(toGIISString(true)).toBe('1');
        expect(toGIISString(false)).toBe('0');
      });

      it('should return empty for null/undefined', () => {
        expect(toGIISString(null)).toBe('');
        expect(toGIISString(undefined)).toBe('');
      });

      it('should handle arrays with toGIISMultiValue', () => {
        expect(toGIISString([1, 2, 3])).toBe('1&2&3');
      });
    });

    describe('toGIISMultiValue', () => {
      it('should join arrays with &', () => {
        expect(toGIISMultiValue([1, 2, 3])).toBe('1&2&3');
        expect(toGIISMultiValue(['a', 'b'])).toBe('a&b');
      });

      it('should return empty for empty array', () => {
        expect(toGIISMultiValue([])).toBe('');
      });

      it('should return empty for null/undefined', () => {
        expect(toGIISMultiValue(null)).toBe('');
        expect(toGIISMultiValue(undefined)).toBe('');
      });

      it('should filter out null/undefined values', () => {
        expect(toGIISMultiValue([1, null, 2, undefined, 3])).toBe('1&2&3');
      });
    });

    describe('joinGIISFields', () => {
      it('should join fields with pipe', () => {
        expect(joinGIISFields(['A', 'B', 'C'])).toBe('A|B|C');
      });

      it('should handle null/empty as empty strings', () => {
        expect(joinGIISFields([null, 'X', undefined])).toBe('|X|');
        expect(joinGIISFields(['A', '', 'C'])).toBe('A||C');
      });
    });

    describe('padNumber', () => {
      it('should pad numbers with leading zeros', () => {
        expect(padNumber(5, 2)).toBe('05');
        expect(padNumber(123, 5)).toBe('00123');
      });

      it('should return empty for null/undefined', () => {
        expect(padNumber(null, 2)).toBe('');
        expect(padNumber(undefined, 2)).toBe('');
      });
    });

    describe('formatCURP', () => {
      it('should format valid CURP', () => {
        expect(formatCURP('ROAJ850102HDFLRN08')).toBe('ROAJ850102HDFLRN08');
      });

      it('should uppercase CURP', () => {
        expect(formatCURP('roaj850102hdflrn08')).toBe('ROAJ850102HDFLRN08');
      });

      it('should return empty for invalid length', () => {
        expect(formatCURP('SHORT')).toBe('');
        expect(formatCURP(null)).toBe('');
      });
    });

    describe('formatCLUES', () => {
      it('should format valid CLUES', () => {
        expect(formatCLUES('DFSSA001234')).toBe('DFSSA001234');
      });

      it('should return empty for invalid length', () => {
        expect(formatCLUES('SHORT')).toBe('');
        expect(formatCLUES(null)).toBe('');
      });
    });

    describe('formatResultEnum', () => {
      it('should format result values', () => {
        expect(formatResultEnum(0)).toBe('0');
        expect(formatResultEnum(1)).toBe('1');
      });

      it('should return empty for -1 (NA)', () => {
        expect(formatResultEnum(-1)).toBe('');
      });

      it('should return empty for null/undefined', () => {
        expect(formatResultEnum(null)).toBe('');
        expect(formatResultEnum(undefined)).toBe('');
      });
    });
  });
});
