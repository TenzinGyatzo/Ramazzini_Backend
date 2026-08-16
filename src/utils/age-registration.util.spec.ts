import {
  getBirthDateBounds,
  isBirthDateInRegistrationRange,
  normalizeDateOnly,
  subtractCalendarYears,
  buildRegistrationAgeRangeMessage,
} from './age-registration.util';

const REF = new Date(2026, 7, 7); // 7 ago 2026 (local)

function date(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

describe('age-registration.util', () => {
  describe('subtractCalendarYears', () => {
    it('resta años calendario preservando mes y día', () => {
      const result = subtractCalendarYears(date(2026, 8, 7), 18);
      expect(result.getFullYear()).toBe(2008);
      expect(result.getMonth()).toBe(7);
      expect(result.getDate()).toBe(7);
    });

    it('maneja 29 de febrero al restar años (comportamiento nativo Date)', () => {
      const feb29 = date(2024, 2, 29);
      const result = subtractCalendarYears(feb29, 1);
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(2);
      expect(result.getDate()).toBe(1);
    });
  });

  describe('getBirthDateBounds - trabajador (18-100)', () => {
    it('calcula límites exactos', () => {
      const { min, max } = getBirthDateBounds(REF, 18, 100);
      expect(min).toEqual(normalizeDateOnly(date(1926, 8, 7)));
      expect(max).toEqual(normalizeDateOnly(date(2008, 8, 7)));
    });
  });

  describe('isBirthDateInRegistrationRange - trabajador (18-100)', () => {
    const minYears = 18;
    const maxYears = 100;

    it('rechaza 17a 11m 30d', () => {
      expect(
        isBirthDateInRegistrationRange(date(2008, 8, 8), REF, minYears, maxYears),
      ).toBe(false);
    });

    it('acepta 18a 0m 0d', () => {
      expect(
        isBirthDateInRegistrationRange(date(2008, 8, 7), REF, minYears, maxYears),
      ).toBe(true);
    });

    it('acepta 18a 0m 1d', () => {
      expect(
        isBirthDateInRegistrationRange(date(2008, 8, 6), REF, minYears, maxYears),
      ).toBe(true);
    });

    it('acepta 99a 11m 30d', () => {
      expect(
        isBirthDateInRegistrationRange(date(1926, 8, 8), REF, minYears, maxYears),
      ).toBe(true);
    });

    it('acepta 100a 0m 0d', () => {
      expect(
        isBirthDateInRegistrationRange(date(1926, 8, 7), REF, minYears, maxYears),
      ).toBe(true);
    });

    it('rechaza 100a 0m 1d', () => {
      expect(
        isBirthDateInRegistrationRange(date(1926, 8, 6), REF, minYears, maxYears),
      ).toBe(false);
    });

    it('rechaza 100a 11m 30d', () => {
      expect(
        isBirthDateInRegistrationRange(date(1925, 8, 8), REF, minYears, maxYears),
      ).toBe(false);
    });

    it('acepta string YYYY-MM-DD del input date en límite exacto (100a 0m 0d)', () => {
      expect(
        isBirthDateInRegistrationRange('1926-08-07', REF, minYears, maxYears),
      ).toBe(true);
    });

    it('rechaza string YYYY-MM-DD del input date (100a 0m 1d)', () => {
      expect(
        isBirthDateInRegistrationRange('1926-08-06', REF, minYears, maxYears),
      ).toBe(false);
    });

    it('acepta Date UTC midnight proveniente de new Date(YYYY-MM-DD)', () => {
      expect(
        isBirthDateInRegistrationRange(
          new Date('1926-08-07T00:00:00.000Z'),
          REF,
          minYears,
          maxYears,
        ),
      ).toBe(true);
    });

    it('acepta string ISO date-only con hora UTC', () => {
      expect(
        isBirthDateInRegistrationRange(
          '1926-08-07T00:00:00.000Z',
          REF,
          minYears,
          maxYears,
        ),
      ).toBe(true);
    });
  });

  describe('isBirthDateInRegistrationRange - firmante (18-90)', () => {
    const minYears = 18;
    const maxYears = 90;

    it('acepta 90a 0m 0d', () => {
      expect(
        isBirthDateInRegistrationRange(date(1936, 8, 7), REF, minYears, maxYears),
      ).toBe(true);
    });

    it('rechaza 90a 0m 1d', () => {
      expect(
        isBirthDateInRegistrationRange(date(1936, 8, 6), REF, minYears, maxYears),
      ).toBe(false);
    });

    it('acepta 89a 11m 30d', () => {
      expect(
        isBirthDateInRegistrationRange(date(1936, 8, 8), REF, minYears, maxYears),
      ).toBe(true);
    });

    it('acepta string YYYY-MM-DD del input date en límite exacto (90a 0m 0d)', () => {
      expect(
        isBirthDateInRegistrationRange('1936-08-07', REF, minYears, maxYears),
      ).toBe(true);
    });

    it('rechaza string YYYY-MM-DD del input date (90a 0m 1d)', () => {
      expect(
        isBirthDateInRegistrationRange('1936-08-06', REF, minYears, maxYears),
      ).toBe(false);
    });
  });

  describe('buildRegistrationAgeRangeMessage', () => {
    it('incluye años, meses y días calculados', () => {
      expect(
        buildRegistrationAgeRangeMessage(18, 100, '1926-08-07', REF),
      ).toBe(
        'Edad fuera de rango (18 a 100 años, incluyendo meses y días). Edad calculada: 100 años, 0 meses y 0 días.',
      );
    });
  });
});
