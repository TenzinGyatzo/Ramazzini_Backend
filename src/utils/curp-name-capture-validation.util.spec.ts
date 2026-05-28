import {
  validateCurpNameCaptureField,
  validateCurpPersonNameCapture,
} from './curp-name-capture-validation.util';

describe('curp-name-capture-validation.util', () => {
  describe('validateCurpNameCaptureField', () => {
    it('debe permitir caracteres especiales CURP', () => {
      expect(validateCurpNameCaptureField("D/Amico", 'Apellido').isValid).toBe(
        true,
      );
      expect(validateCurpNameCaptureField("O'Hara", 'Apellido').isValid).toBe(
        true,
      );
      expect(validateCurpNameCaptureField('L-Castillo', 'Apellido').isValid).toBe(
        true,
      );
    });

    it('debe permitir diéresis en vocales a, e, i, o y ü', () => {
      expect(validateCurpNameCaptureField('Argüello', 'Apellido').isValid).toBe(
        true,
      );
      expect(validateCurpNameCaptureField('Gärcia', 'Apellido').isValid).toBe(
        true,
      );
      expect(validateCurpNameCaptureField('Mïlo', 'Nombre').isValid).toBe(true);
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
        'Juan José',
        "D/Amico",
        'Álvarez',
      );
      expect(result.isValid).toBe(true);
    });
  });
});
