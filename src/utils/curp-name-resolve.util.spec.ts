import {
  resolveCurpNameParts,
  resolveEffectiveGivenName,
  resolveEffectiveSurname,
  skipLeadingParticles,
  tokenizeNamePart,
} from './curp-name-resolve.util';

describe('curp-name-resolve.util', () => {
  describe('resolveEffectiveSurname', () => {
    it('debe omitir partículas al inicio', () => {
      expect(resolveEffectiveSurname('Mc Gregor')).toBe('Gregor');
      expect(resolveEffectiveSurname('de las Lomas')).toBe('Lomas');
      expect(resolveEffectiveSurname('Van Rob')).toBe('Rob');
      expect(resolveEffectiveSurname('del Castillo-Rodríguez')).toBe(
        'Castillo-Rodríguez',
      );
    });

    it('debe conservar el token completo con guión para conformación CURP', () => {
      expect(resolveEffectiveSurname('López-Castillo')).toBe('López-Castillo');
    });
  });

  describe('resolveEffectiveGivenName', () => {
    it('debe usar el primer nombre cuando no hay excepción MARIA/JOSE', () => {
      expect(resolveEffectiveGivenName('Lucero Beatriz Alondra')).toBe('Lucero');
      expect(resolveEffectiveGivenName('Javier Enrique')).toBe('Javier');
    });

    it('debe usar el segundo nombre para prefijos MARIA/JOSE', () => {
      expect(resolveEffectiveGivenName('María Luisa')).toBe('Luisa');
      expect(resolveEffectiveGivenName('Ma. Guadalupe')).toBe('Guadalupe');
      expect(resolveEffectiveGivenName('José María')).toBe('María');
      expect(resolveEffectiveGivenName('J Ricardo')).toBe('Ricardo');
      expect(resolveEffectiveGivenName('Ma. de los Ángeles')).toBe('Ángeles');
    });
  });

  describe('resolveCurpNameParts', () => {
    it('debe detectar sin apellidos', () => {
      const parts = resolveCurpNameParts({ nombre: 'Juan' });
      expect(parts.sinApellidos).toBe(true);
      expect(parts.unSoloApellido).toBe(false);
    });

    it('debe detectar un solo apellido', () => {
      const parts = resolveCurpNameParts({
        primerApellido: 'Garduño',
        nombre: 'Julio Tomás',
      });
      expect(parts.unSoloApellido).toBe(true);
      expect(parts.sinApellidos).toBe(false);
    });
  });

  describe('tokenizeNamePart / skipLeadingParticles', () => {
    it('debe tokenizar y filtrar partículas', () => {
      expect(tokenizeNamePart('Mc Gregor')).toEqual(['Mc', 'Gregor']);
      expect(skipLeadingParticles(['de', 'las', 'Lomas'])).toEqual(['Lomas']);
    });
  });
});
