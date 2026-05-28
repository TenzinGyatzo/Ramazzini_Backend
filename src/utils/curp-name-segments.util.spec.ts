import {
  deriveCurpNameSegments,
  getExpectedHomoclavePattern,
  getFirstInternalConsonant,
  getFirstInternalVowel,
  getPrimerNombre,
  normalizeForCurp,
} from './curp-name-segments.util';

describe('curp-name-segments.util', () => {
  describe('normalizeForCurp', () => {
    it('debe quitar acentos y conservar Ñ', () => {
      expect(normalizeForCurp('  Briseño  ')).toBe('BRISEÑO');
      expect(normalizeForCurp('Concepción')).toBe('CONCEPCION');
      expect(normalizeForCurp('García')).toBe('GARCIA');
    });
  });

  describe('getPrimerNombre', () => {
    it('debe tomar el primer token del nombre', () => {
      expect(getPrimerNombre('EDGAR OMAR')).toBe('EDGAR');
      expect(getPrimerNombre('  Juan  Carlos')).toBe('JUAN');
    });
  });

  describe('getFirstInternalVowel', () => {
    it('debe retornar la primera vocal interna', () => {
      expect(getFirstInternalVowel('SALGADO')).toBe('A');
      expect(getFirstInternalVowel('ORTEGA')).toBe('E');
    });

    it('debe retornar X si no hay vocal interna', () => {
      expect(getFirstInternalVowel('CR')).toBe('X');
      expect(getFirstInternalVowel('G')).toBe('X');
    });
  });

  describe('getFirstInternalConsonant', () => {
    it('debe retornar la primera consonante interna', () => {
      expect(getFirstInternalConsonant('SALGADO')).toBe('L');
      expect(getFirstInternalConsonant('GONZALEZ')).toBe('N');
      expect(getFirstInternalConsonant('EDGAR')).toBe('D');
    });

    it('debe retornar X si no hay consonante interna', () => {
      expect(getFirstInternalConsonant('A')).toBe('X');
    });
  });

  describe('deriveCurpNameSegments', () => {
    it('debe derivar segmentos para Salgado Briseño Concepción', () => {
      const result = deriveCurpNameSegments({
        primerApellido: 'Salgado',
        segundoApellido: 'Briseño',
        nombre: 'Concepción',
      });

      expect(result.iniciales).toBe('SABC');
      expect(result.consonantes).toBe('LRN');
    });

    it('debe derivar segmentos para Garcia Lopez Juan', () => {
      const result = deriveCurpNameSegments({
        primerApellido: 'GARCIA',
        segundoApellido: 'LOPEZ',
        nombre: 'JUAN',
      });

      expect(result.iniciales).toBe('GALJ');
      expect(result.consonantes).toBe('RPN');
    });

    it('debe usar X cuando falta segundo apellido', () => {
      const result = deriveCurpNameSegments({
        primerApellido: 'GARCIA',
        segundoApellido: '',
        nombre: 'JUAN',
      });

      expect(result.iniciales).toBe('GAXJ');
      expect(result.consonantes).toBe('RXN');
    });

    it('debe derivar segmentos para Coronela Gonzalez Edgar Omar con filtro COGE', () => {
      const result = deriveCurpNameSegments({
        primerApellido: 'CORONEL',
        segundoApellido: 'GONZALEZ',
        nombre: 'EDGAR OMAR',
      });

      expect(result.iniciales).toBe('CXGE');
      expect(result.consonantes).toBe('RND');
    });
  });

  describe('getExpectedHomoclavePattern', () => {
    it('debe esperar dígito para nacidos antes del 2000', () => {
      const rule = getExpectedHomoclavePattern(1999);
      expect(rule.label).toBe('0-9');
      expect(rule.pattern.test('0')).toBe(true);
      expect(rule.pattern.test('A')).toBe(false);
    });

    it('debe esperar letra A-J para nacidos desde el 2000', () => {
      const rule = getExpectedHomoclavePattern(2000);
      expect(rule.label).toBe('A-J');
      expect(rule.pattern.test('A')).toBe(true);
      expect(rule.pattern.test('J')).toBe(true);
      expect(rule.pattern.test('0')).toBe(false);
    });
  });
});
