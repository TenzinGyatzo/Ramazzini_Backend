import {
  validateCurpNameCaptureField,
  validateCurpPersonNameCapture,
} from './curp-name-capture-validation.util';

describe('curp-name-capture-validation.util', () => {
  describe('validateCurpNameCaptureField', () => {
    it('debe permitir caracteres especiales y separadores válidos', () => {
      expect(validateCurpNameCaptureField('D/AMICO', 'Apellido').isValid).toBe(
        true,
      );
      expect(validateCurpNameCaptureField("O'HARA", 'Apellido').isValid).toBe(
        true,
      );
      expect(validateCurpNameCaptureField('L-CASTILLO', 'Apellido').isValid).toBe(
        true,
      );
    });

    it('debe rechazar coma y otros caracteres no permitidos', () => {
      expect(validateCurpNameCaptureField('GARCIA, LOPEZ', 'Apellido').isValid).toBe(
        false,
      );
      expect(validateCurpNameCaptureField('ANA[]', 'Nombre').isValid).toBe(false);
    });

    it('debe permitir vocales con diéresis', () => {
      expect(validateCurpNameCaptureField('ARGÜELLO', 'Apellido').isValid).toBe(
        true,
      );
    });

    it('debe rechazar acentos', () => {
      const result = validateCurpNameCaptureField('JOSÉ', 'Nombre');
      expect(result.isValid).toBe(false);
    });

    it('debe rechazar caracteres no permitidos', () => {
      const result = validateCurpNameCaptureField('JUAN@PEREZ', 'Nombre');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('@');
    });

    it('debe rechazar dígitos', () => {
      const result = validateCurpNameCaptureField('JUAN2', 'Nombre');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateCurpPersonNameCapture', () => {
    it('debe validar todos los campos de persona', () => {
      const result = validateCurpPersonNameCapture(
        'JUAN',
        'D/AMICO',
        'GARCIA',
      );
      expect(result.isValid).toBe(true);
    });
  });
});
