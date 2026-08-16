import {
  validatePersonNameCharacterFields,
  validatePersonNameCharacters,
} from './person-name-character-validation.util';

describe('person-name-character-validation.util', () => {
  describe('validatePersonNameCharacters', () => {
    it('debe permitir letras mayúsculas, Ñ y separadores válidos', () => {
      expect(validatePersonNameCharacters('JUAN CARLOS', 'Nombre').isValid).toBe(
        true,
      );
      expect(validatePersonNameCharacters('D/AMICO', 'Apellido').isValid).toBe(
        true,
      );
      expect(validatePersonNameCharacters("O'HARA", 'Apellido').isValid).toBe(
        true,
      );
      expect(validatePersonNameCharacters('PEREZ-GARCIA', 'Apellido').isValid).toBe(
        true,
      );
      expect(validatePersonNameCharacters('MARIA.ANA', 'Nombre').isValid).toBe(
        true,
      );
    });

    it('debe rechazar coma, dígitos y símbolos no permitidos', () => {
      expect(validatePersonNameCharacters('GARCIA, LOPEZ', 'Apellido').isValid).toBe(
        false,
      );
      expect(validatePersonNameCharacters('JUAN2', 'Nombre').isValid).toBe(false);
      expect(validatePersonNameCharacters('ANA[]', 'Nombre').isValid).toBe(false);
      expect(validatePersonNameCharacters('PEDRO()', 'Nombre').isValid).toBe(false);
    });

    it('debe permitir vocales con diéresis', () => {
      expect(validatePersonNameCharacters('ARGÜELLO', 'Apellido').isValid).toBe(
        true,
      );
      expect(validatePersonNameCharacters('GARCÄ', 'Apellido').isValid).toBe(true);
      expect(validatePersonNameCharacters('GUEMES', 'Apellido').isValid).toBe(true);
    });

    it('debe rechazar diéresis suelta o sobre consonante', () => {
      expect(validatePersonNameCharacters('¨', 'Apellido').isValid).toBe(false);
      expect(validatePersonNameCharacters('G¨', 'Apellido').isValid).toBe(false);
      expect(validatePersonNameCharacters('ARGU¨', 'Apellido').isValid).toBe(
        false,
      );
      expect(validatePersonNameCharacters('B\u0308', 'Apellido').isValid).toBe(
        false,
      );
    });

    it('debe rechazar acentos en SIRES_NOM024', () => {
      const result = validatePersonNameCharacters('JOSÉ', 'Nombre');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('no permitidos');
    });

    it('debe permitir acentos en SIN_REGIMEN', () => {
      expect(
        validatePersonNameCharacters('José', 'Nombre', 'SIN_REGIMEN').isValid,
      ).toBe(true);
      expect(
        validatePersonNameCharacters('María', 'Nombre', 'SIN_REGIMEN').isValid,
      ).toBe(true);
      expect(
        validatePersonNameCharacters('López', 'Apellido', 'SIN_REGIMEN').isValid,
      ).toBe(true);
    });

    it('debe conservar mayúsculas/minúsculas en SIN_REGIMEN al validar', () => {
      expect(
        validatePersonNameCharacters('juan', 'Nombre', 'SIN_REGIMEN').isValid,
      ).toBe(true);
      expect(
        validatePersonNameCharacters('CORONEL', 'Apellido', 'SIN_REGIMEN').isValid,
      ).toBe(true);
    });

    it('debe aceptar minúsculas en entrada al validar versión normalizada', () => {
      const result = validatePersonNameCharacters('juan', 'Nombre');
      expect(result.isValid).toBe(true);
    });

    it('debe rechazar caracteres no permitidos', () => {
      const result = validatePersonNameCharacters('JUAN@PEREZ', 'Nombre');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('@');
    });

    it('debe rechazar caracteres especiales consecutivos', () => {
      const result = validatePersonNameCharacters('PEREZ--GARCIA', 'Apellido');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('consecutivo');
    });

    it('debe permitir un carácter especial al inicio o al final', () => {
      expect(validatePersonNameCharacters('-PEREZ', 'Apellido').isValid).toBe(true);
      expect(validatePersonNameCharacters('PEREZ.', 'Apellido').isValid).toBe(true);
      expect(validatePersonNameCharacters('JULIAN-', 'Nombre').isValid).toBe(true);
    });
  });

  describe('validatePersonNameCharacterFields', () => {
    it('debe validar nombre y apellidos juntos', () => {
      const result = validatePersonNameCharacterFields(
        'JUAN',
        'PEREZ',
        'GARCIA',
      );
      expect(result.isValid).toBe(true);
    });
  });
});
