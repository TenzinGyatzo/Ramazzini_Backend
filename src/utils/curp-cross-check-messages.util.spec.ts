import {
  buildCurpCrossCheckErrorContent,
  formatCurpDiscrepancyUserMessage,
} from './curp-cross-check-messages.util';
import { Discrepancy } from './curp-validator.util';

describe('curp-cross-check-messages.util', () => {
  describe('formatCurpDiscrepancyUserMessage', () => {
    it('debe formatear fecha de nacimiento como mensaje único', () => {
      const message = formatCurpDiscrepancyUserMessage({
        field: 'fechaNacimiento',
        expected: '900515',
        gotFromCurp: '910515',
      });

      expect(message).toBe(
        'La CURP no coincide con la fecha de nacimiento. (posiciones 5 a 10).',
      );
      expect(message).not.toContain('fechaNacimiento');
    });

    it('debe formatear sexo como mensaje único', () => {
      const message = formatCurpDiscrepancyUserMessage({
        field: 'sexo',
        expected: 'M',
        gotFromCurp: 'H',
      });

      expect(message).toBe('La CURP no coincide con el sexo (posición 11).');
    });
  });

  describe('buildCurpCrossCheckErrorContent', () => {
    it('debe devolver solo el mensaje de fecha cuando falla únicamente fecha', () => {
      const discrepancies: Discrepancy[] = [
        {
          field: 'fechaNacimiento',
          expected: '931130',
          gotFromCurp: '941130',
        },
      ];

      const result = buildCurpCrossCheckErrorContent(discrepancies);

      expect(result.message).toBe(
        'La CURP no coincide con la fecha de nacimiento. (posiciones 5 a 10).',
      );
      expect(result.summary).toBe(result.message);
      expect(result.message).not.toContain('el sexo');
      expect(result.message).not.toContain('entidad');
    });

    it('debe devolver solo el mensaje de sexo cuando falla únicamente sexo', () => {
      const result = buildCurpCrossCheckErrorContent([
        { field: 'sexo', expected: 'M', gotFromCurp: 'H' },
      ]);

      expect(result.message).toBe(
        'La CURP no coincide con el sexo (posición 11).',
      );
    });

    it('debe devolver solo el mensaje de entidad cuando falla únicamente entidad', () => {
      const result = buildCurpCrossCheckErrorContent([
        {
          field: 'entidadNacimiento',
          expected: 'AS',
          gotFromCurp: 'DF',
        },
      ]);

      expect(result.message).toBe(
        'La CURP no coincide con la entidad de nacimiento (posiciones 12 y 13).',
      );
    });

    it('debe combinar campos demográficos en un solo mensaje', () => {
      const discrepancies: Discrepancy[] = [
        { field: 'fechaNacimiento', expected: '900515', gotFromCurp: '910515' },
        { field: 'sexo', expected: 'M', gotFromCurp: 'H' },
        {
          field: 'entidadNacimiento',
          expected: 'AS',
          gotFromCurp: 'DF',
        },
      ];

      const result = buildCurpCrossCheckErrorContent(discrepancies);

      expect(result.message).toBe(
        'La CURP no coincide en datos demográficos: fecha de nacimiento, sexo, entidad de nacimiento.',
      );
    });

    it('debe devolver mensaje único para iniciales sin summary redundante', () => {
      const result = buildCurpCrossCheckErrorContent([
        { field: 'iniciales', expected: 'GALJ', gotFromCurp: 'GAXJ' },
      ]);

      expect(result.message).toBe(
        'La CURP no coincide con las iniciales del nombre y apellidos (posiciones 1 a 4).',
      );
      expect(result.message).not.toContain('demográficos');
    });

    it('debe usar mensaje mixto cuando hay discrepancias de distintas categorías', () => {
      const result = buildCurpCrossCheckErrorContent([
        { field: 'iniciales', expected: 'GALJ', gotFromCurp: 'GAXJ' },
        { field: 'sexo', expected: 'M', gotFromCurp: 'H' },
      ]);

      expect(result.message).toBe(
        'La CURP no coincide con varios datos capturados: iniciales, sexo.',
      );
    });
  });
});
