import {
  getCurpFirstInternalConsonant,
  getCurpFirstInternalVowel,
  getCurpInitial,
  normalizeCurpChar,
} from './curp-name-char.util';
import { deriveCurpNameSegments } from './curp-name-segments.util';

describe('curp-name-char.util', () => {
  describe('normalizeCurpChar', () => {
    it('debe marcar Ä/Ë/Ï/Ö como especiales (X en iniciales)', () => {
      expect(normalizeCurpChar('Ö').isSpecial).toBe(true);
      expect(normalizeCurpChar('ä').isSpecial).toBe(true);
    });

    it('debe convertir Ü a U', () => {
      expect(normalizeCurpChar('Ü').value).toBe('U');
      expect(normalizeCurpChar('ü').value).toBe('U');
    });

    it('debe marcar apóstrofo, guión y diagonal como especiales', () => {
      expect(normalizeCurpChar("'").isSpecial).toBe(true);
      expect(normalizeCurpChar('-').isSpecial).toBe(true);
      expect(normalizeCurpChar('/').isSpecial).toBe(true);
      expect(normalizeCurpChar('.').isSpecial).toBe(true);
    });
  });

  describe('getCurpInitial', () => {
    it('debe convertir Ñ inicial a X', () => {
      expect(getCurpInitial('Ñacurutú')).toBe('X');
      expect(getCurpInitial('Ñandú')).toBe('X');
    });

    it('debe convertir Ä/Ë/Ï/Ö inicial a X y Ü inicial a U', () => {
      expect(getCurpInitial('Öss')).toBe('X');
      expect(getCurpInitial('Älvarez')).toBe('X');
      expect(getCurpInitial('Ünkel')).toBe('U');
    });

    it('debe conservar letra inicial normal', () => {
      expect(getCurpInitial('García')).toBe('G');
      expect(getCurpInitial("D'Amico")).toBe('D');
      expect(getCurpInitial('CÖSS')).toBe('C');
    });
  });

  describe('getCurpFirstInternalVowel', () => {
    it('debe retornar X si no hay vocal interna', () => {
      expect(getCurpFirstInternalVowel('Ich')).toBe('X');
      expect(getCurpFirstInternalVowel('Smrz')).toBe('X');
    });

    it('debe retornar X ante apóstrofo o diagonal internos', () => {
      expect(getCurpFirstInternalVowel("D'Amico")).toBe('X');
      expect(getCurpFirstInternalVowel('D/Amico')).toBe('X');
    });

    it('debe retornar X ante Ä/Ë/Ï/Ö internos e U ante Ü', () => {
      expect(getCurpFirstInternalVowel('CÖSS')).toBe('X');
      expect(getCurpFirstInternalVowel('Gärcia')).toBe('X');
      expect(getCurpFirstInternalVowel('Argüello')).toBe('U');
    });

    it('debe retornar X cuando el guión interviene en posición interna', () => {
      expect(getCurpFirstInternalVowel('L-Castillo')).toBe('X');
    });
  });

  describe('getCurpFirstInternalConsonant', () => {
    it('debe convertir Ñ consonante interna a X', () => {
      expect(getCurpFirstInternalConsonant('Oñate')).toBe('X');
      expect(getCurpFirstInternalConsonant('Eñuma')).toBe('X');
    });

    it('debe retornar X ante apóstrofo, diagonal o guión internos', () => {
      expect(getCurpFirstInternalConsonant("O'Hara")).toBe('X');
      expect(getCurpFirstInternalConsonant('D/Amico')).toBe('X');
    });

    it('debe retornar X ante guión interno', () => {
      expect(getCurpFirstInternalConsonant('L-Castillo')).toBe('X');
    });

    it('debe omitir diéresis en vocal al buscar consonante interna', () => {
      expect(getCurpFirstInternalConsonant('Gömez')).toBe('M');
      expect(getCurpFirstInternalConsonant('CÖSS')).toBe('S');
    });

    it('debe retornar X si no hay consonante interna', () => {
      expect(getCurpFirstInternalConsonant('Po')).toBe('X');
      expect(getCurpFirstInternalConsonant('Ueia')).toBe('X');
    });
  });

  describe('integración JUAN JOSE CÖSS ALVAREZ', () => {
    it('debe generar iniciales CXAJ y consonantes SLN', () => {
      const segments = deriveCurpNameSegments({
        nombre: 'JUAN JOSE',
        primerApellido: 'CÖSS',
        segundoApellido: 'ALVAREZ',
      });

      expect(segments.iniciales).toBe('CXAJ');
      expect(segments.consonantes).toBe('SLN');
    });
  });
});
