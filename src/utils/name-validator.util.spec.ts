import {
  detectAbbreviations,
  removeAbbreviations,
  validateNameField,
  validateTrabajadorNames,
} from './name-validator.util';

describe('Name Validator Utility', () => {
  describe('detectAbbreviations', () => {
    it('should detect professional title abbreviations at the start', () => {
      expect(detectAbbreviations('DR. JUAN PEREZ')).toContain('DR.');
      expect(detectAbbreviations('DRA. MARIA LOPEZ')).toContain('DRA.');
      expect(detectAbbreviations('ING. CARLOS GARCIA')).toContain('ING.');
      expect(detectAbbreviations('LIC. ANA MARTINEZ')).toContain('LIC.');
      expect(detectAbbreviations('PROF. PEDRO SANCHEZ')).toContain('PROF.');
    });

    it('should detect honorific abbreviations', () => {
      expect(detectAbbreviations('SR. ROBERTO')).toContain('SR.');
      expect(detectAbbreviations('SRA. PATRICIA')).toContain('SRA.');
      expect(detectAbbreviations('SRTA. LAURA')).toContain('SRTA.');
    });

    it('should detect abbreviations in the middle of names', () => {
      expect(detectAbbreviations('JUAN DR. PEREZ')).toContain('DR.');
      expect(detectAbbreviations('MARIA ING. LOPEZ GARCIA')).toContain('ING.');
    });

    it('should detect abbreviations at the end of names', () => {
      expect(detectAbbreviations('CARLOS GARCIA JR.')).toContain('JR.');
      expect(detectAbbreviations('LUIS MARTINEZ III')).toContain('III');
    });

    it('should return empty array for names without abbreviations', () => {
      expect(detectAbbreviations('JUAN PEREZ GARCIA')).toHaveLength(0);
      expect(detectAbbreviations('MARIA ELENA LOPEZ')).toHaveLength(0);
      expect(detectAbbreviations('CARLOS')).toHaveLength(0);
    });

    it('should handle null and undefined', () => {
      expect(detectAbbreviations(null as any)).toHaveLength(0);
      expect(detectAbbreviations(undefined as any)).toHaveLength(0);
      expect(detectAbbreviations('')).toHaveLength(0);
    });

    it('should be case insensitive', () => {
      expect(detectAbbreviations('dr. juan perez')).toContain('DR.');
      expect(detectAbbreviations('ing. carlos garcia')).toContain('ING.');
    });
  });

  describe('removeAbbreviations', () => {
    it('should remove professional titles from start', () => {
      expect(removeAbbreviations('DR. JUAN PEREZ')).toBe('JUAN PEREZ');
      expect(removeAbbreviations('ING. CARLOS GARCIA')).toBe('CARLOS GARCIA');
    });

    it('should remove honorifics from start', () => {
      expect(removeAbbreviations('SR. ROBERTO SILVA')).toBe('ROBERTO SILVA');
      expect(removeAbbreviations('SRA. MARIA LOPEZ')).toBe('MARIA LOPEZ');
    });

    it('should remove abbreviations from middle', () => {
      expect(removeAbbreviations('JUAN DR. PEREZ')).toBe('JUAN PEREZ');
    });

    it('should remove JR. suffix', () => {
      expect(removeAbbreviations('CARLOS GARCIA JR.')).toBe('CARLOS GARCIA');
    });

    it('should clean up multiple spaces', () => {
      expect(removeAbbreviations('DR.  JUAN  PEREZ')).toBe('JUAN PEREZ');
    });

    it('should handle names without abbreviations', () => {
      expect(removeAbbreviations('JUAN PEREZ')).toBe('JUAN PEREZ');
    });

    it('should handle null and undefined', () => {
      expect(removeAbbreviations(null as any)).toBe('');
      expect(removeAbbreviations(undefined as any)).toBe('');
    });
  });

  describe('validateNameField', () => {
    it('should validate clean names successfully', () => {
      const result = validateNameField('JUAN CARLOS', 'Nombre');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedValue).toBe('JUAN CARLOS');
    });

    it('should normalize to uppercase', () => {
      const result = validateNameField('juan carlos', 'Nombre');
      expect(result.normalizedValue).toBe('JUAN CARLOS');
    });

    it('should detect abbreviations and fail validation', () => {
      const result = validateNameField('DR. JUAN PEREZ', 'Nombre');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('abreviaciones'))).toBe(true);
    });

    it('should detect trailing periods and fail validation', () => {
      const result = validateNameField('JUAN PEREZ.', 'Nombre');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('punto'))).toBe(true);
    });

    it('should enforce max length of 50 characters', () => {
      const longName = 'A'.repeat(51);
      const result = validateNameField(longName, 'Nombre');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('50 caracteres'))).toBe(true);
    });

    it('should accept names at max length', () => {
      const maxName = 'A'.repeat(50);
      const result = validateNameField(maxName, 'Nombre');
      expect(result.isValid).toBe(true);
    });

    it('should handle empty values', () => {
      const result = validateNameField('', 'Nombre');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe('');
    });

    it('should handle null and undefined', () => {
      const result1 = validateNameField(null, 'Nombre');
      expect(result1.isValid).toBe(true);
      expect(result1.normalizedValue).toBe('');

      const result2 = validateNameField(undefined, 'Nombre');
      expect(result2.isValid).toBe(true);
      expect(result2.normalizedValue).toBe('');
    });

    it('debe rechazar caracteres no permitidos para captura CURP', () => {
      const result = validateNameField('JUAN@PEREZ', 'Nombre');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('no permitidos'))).toBe(true);
    });

    it('should allow accented characters', () => {
      const result = validateNameField('JOSÉ MARÍA PÉREZ', 'Nombre');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should allow CURP special characters in names', () => {
      const result = validateNameField('D/AMICO', 'Primer apellido');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateTrabajadorNames', () => {
    it('should validate all name fields together', () => {
      const result = validateTrabajadorNames('JUAN', 'PEREZ', 'GARCIA');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalized.nombre).toBe('JUAN');
      expect(result.normalized.primerApellido).toBe('PEREZ');
      expect(result.normalized.segundoApellido).toBe('GARCIA');
    });

    it('should collect errors from all fields', () => {
      const result = validateTrabajadorNames(
        'DR. JUAN',
        'ING. PEREZ',
        'LIC. GARCIA',
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle optional segundoApellido', () => {
      const result = validateTrabajadorNames('JUAN', 'PEREZ', '');
      expect(result.isValid).toBe(true);
      expect(result.normalized.segundoApellido).toBe('');
    });

    it('should normalize all fields to uppercase', () => {
      const result = validateTrabajadorNames('juan', 'perez', 'garcia');
      expect(result.normalized.nombre).toBe('JUAN');
      expect(result.normalized.primerApellido).toBe('PEREZ');
      expect(result.normalized.segundoApellido).toBe('GARCIA');
    });

    it('should provide cleaned values even when validation fails', () => {
      const result = validateTrabajadorNames('DR. JUAN', 'PEREZ', 'GARCIA');
      expect(result.isValid).toBe(false);
      expect(result.normalized.nombre).toBe('JUAN'); // Cleaned version
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle typical Mexican names', () => {
      const validNames = [
        {
          nombre: 'JUAN CARLOS',
          primerApellido: 'HERNANDEZ',
          segundoApellido: 'LOPEZ',
        },
        {
          nombre: 'MARIA GUADALUPE',
          primerApellido: 'GARCIA',
          segundoApellido: 'MARTINEZ',
        },
        {
          nombre: 'JOSE LUIS',
          primerApellido: 'RAMIREZ',
          segundoApellido: 'SANCHEZ',
        },
        {
          nombre: 'ANA MARIA',
          primerApellido: 'GONZALEZ',
          segundoApellido: 'PEREZ',
        },
      ];

      validNames.forEach(({ nombre, primerApellido, segundoApellido }) => {
        const result = validateTrabajadorNames(
          nombre,
          primerApellido,
          segundoApellido,
        );
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject names with common title errors', () => {
      const invalidNames = [
        {
          nombre: 'DR. PEDRO',
          primerApellido: 'SANCHEZ',
          segundoApellido: 'RUIZ',
        },
        {
          nombre: 'MARIA',
          primerApellido: 'ING. LOPEZ',
          segundoApellido: 'GARCIA',
        },
        { nombre: 'SR. JUAN', primerApellido: 'MARTINEZ', segundoApellido: '' },
        { nombre: 'CARLOS', primerApellido: 'GARCIA', segundoApellido: 'JR.' },
      ];

      invalidNames.forEach(({ nombre, primerApellido, segundoApellido }) => {
        const result = validateTrabajadorNames(
          nombre,
          primerApellido,
          segundoApellido,
        );
        expect(result.isValid).toBe(false);
      });
    });

    it('should handle names with accents correctly', () => {
      const result = validateTrabajadorNames('JOSÉ MARÍA', 'LÓPEZ', 'NÚÑEZ');
      expect(result.isValid).toBe(true);
    });

    it('should handle compound surnames', () => {
      const result = validateTrabajadorNames(
        'CARLOS',
        'DE LA CRUZ',
        'Y MENDOZA',
      );
      expect(result.isValid).toBe(true);
    });
  });
});
