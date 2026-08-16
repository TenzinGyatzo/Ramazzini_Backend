import {
  buildCurpCrossCheckErrorContent,
  formatCurpDiscrepancyUserMessage,
} from './curp-cross-check-messages.util';
import { Discrepancy } from './curp-validator.util';

describe('curp-cross-check-messages.util (granular)', () => {
  describe('formatCurpDiscrepancyUserMessage', () => {
    it('debe mensajear la primera posición distinta de fecha', () => {
      const message = formatCurpDiscrepancyUserMessage({
        field: 'fechaNacimiento',
        expected: '900515',
        gotFromCurp: '910515',
      });

      expect(message).toContain('Pos. 6');
      expect(message).toContain('"0"');
      expect(message).toContain('"1"');
      expect(message).not.toContain('fechaNacimiento');
    });

    it('debe mensajear sexo en posición 11', () => {
      const message = formatCurpDiscrepancyUserMessage({
        field: 'sexo',
        expected: 'M',
        gotFromCurp: 'H',
      });

      expect(message).toContain('Pos. 11');
      expect(message).toContain('"M"');
      expect(message).toContain('"H"');
    });
  });

  describe('buildCurpCrossCheckErrorContent', () => {
    it('expande iniciales a solo las posiciones distintas', () => {
      const result = buildCurpCrossCheckErrorContent([
        { field: 'iniciales', expected: 'CXGE', gotFromCurp: 'COGE' },
      ]);

      expect(result.details).toHaveLength(1);
      expect(result.details[0].positions).toEqual([2]);
      expect(result.details[0].expected).toBe('X');
      expect(result.details[0].gotFromCurp).toBe('O');
      expect(result.message).toContain('Pos. 2');
    });

    it('expande varios caracteres distintos de fecha', () => {
      const discrepancies: Discrepancy[] = [
        {
          field: 'fechaNacimiento',
          expected: '900515',
          gotFromCurp: '911616',
        },
      ];

      const result = buildCurpCrossCheckErrorContent(discrepancies);
      expect(result.details.length).toBeGreaterThan(1);
      expect(result.details.every((d) => d.positions.length === 1)).toBe(true);
      expect(result.summary).toContain('posiciones');
    });

    it('mezcla categorías con details por posición', () => {
      const result = buildCurpCrossCheckErrorContent([
        { field: 'iniciales', expected: 'GALJ', gotFromCurp: 'GAXJ' },
        { field: 'sexo', expected: 'M', gotFromCurp: 'H' },
      ]);

      expect(result.details.map((d) => d.positions[0])).toEqual([3, 11]);
      expect(result.userMessages).toHaveLength(2);
    });
  });
});
