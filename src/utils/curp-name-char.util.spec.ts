import {
  getCurpFirstInternalConsonant,
  getCurpFirstInternalVowel,
  getCurpInitial,
  normalizeCurpChar,
} from './curp-name-char.util';

describe('curp-name-char.util', () => {
  describe('normalizeCurpChar', () => {
    it('debe convertir Ü a U', () => {
      expect(normalizeCurpChar('Ü').value).toBe('U');
    });

    it('debe marcar apóstrofo, guión y diagonal como especiales', () => {
      expect(normalizeCurpChar("'").isSpecial).toBe(true);
      expect(normalizeCurpChar('-').isSpecial).toBe(true);
      expect(normalizeCurpChar('/').isSpecial).toBe(true);
      expect(normalizeCurpChar('.').isSpecial).toBe(true);
    });

    it('debe marcar diéresis Ä/Ë/Ï/Ö (mayúsculas y minúsculas) como X', () => {
      expect(normalizeCurpChar('Ä').isSpecial).toBe(true);
      expect(normalizeCurpChar('ä').isSpecial).toBe(true);
      expect(normalizeCurpChar('Ö').isSpecial).toBe(true);
      expect(normalizeCurpChar('ö').isSpecial).toBe(true);
    });

    it('debe convertir ü minúscula a U', () => {
      expect(normalizeCurpChar('ü').value).toBe('U');
    });
  });

  describe('getCurpInitial', () => {
    it('debe convertir Ñ inicial a X', () => {
      expect(getCurpInitial('Ñacurutú')).toBe('X');
      expect(getCurpInitial('Ñandú')).toBe('X');
    });

    it('debe convertir apóstrofo inicial a X', () => {
      expect(getCurpInitial("'Essio")).toBe('X');
    });

    it('debe conservar letra inicial normal', () => {
      expect(getCurpInitial('García')).toBe('G');
      expect(getCurpInitial("D'Amico")).toBe('D');
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

    it('debe retornar vocal interna con Ü como U', () => {
      expect(getCurpFirstInternalVowel('Argüello')).toBe('U');
    });

    it('debe retornar X ante diéresis interna', () => {
      expect(getCurpFirstInternalVowel('Gärcia')).toBe('X');
      expect(getCurpFirstInternalVowel('Mïlo')).toBe('X');
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

    it('debe retornar X ante diéresis en consonante interna', () => {
      expect(getCurpFirstInternalConsonant('Gömez')).toBe('X');
    });

    it('debe retornar X si no hay consonante interna', () => {
      expect(getCurpFirstInternalConsonant('Po')).toBe('X');
      expect(getCurpFirstInternalConsonant('Ueia')).toBe('X');
    });
  });
});
