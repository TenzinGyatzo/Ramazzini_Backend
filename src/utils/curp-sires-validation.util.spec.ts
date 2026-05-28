import { BadRequestException } from '@nestjs/common';
import {
  validateCurpForSires,
  validateOptionalCurpSinRegimen,
} from './curp-sires-validation.util';
import { isGenericCURP } from './curp-validator.util';

describe('curp-sires-validation.util', () => {
  const demographics = {
    fechaNacimiento: '1985-01-02',
    sexo: 'Masculino',
    entidadNacimiento: '09',
  };

  // ROAJ850102HDFLRN06 - format valid; cross-check depends on checksum
  const validFormatCurp = 'ROAJ850102HDFLRN06';

  describe('validateCurpForSires', () => {
    it('no hace nada si CURP no es requerida', () => {
      expect(() =>
        validateCurpForSires(undefined, false, demographics, {
          allowGenericCurp: true,
          subjectLabel: 'trabajador',
        }),
      ).not.toThrow();
    });

    it('lanza error si CURP requerida y falta', () => {
      expect(() =>
        validateCurpForSires(undefined, true, demographics, {
          allowGenericCurp: true,
          subjectLabel: 'trabajador',
          regime: 'SIRES_NOM024',
        }),
      ).toThrow();
    });

    it('permite CURP genérica para trabajadores', () => {
      expect(() =>
        validateCurpForSires('XXXX999999XXXXXX99', true, demographics, {
          allowGenericCurp: true,
          subjectLabel: 'trabajador',
        }),
      ).not.toThrow();
    });

    it('rechaza CURP genérica para firmantes', () => {
      expect(() =>
        validateCurpForSires('XXXX999999XXXXXX99', true, demographics, {
          allowGenericCurp: false,
          subjectLabel: 'firmante',
        }),
      ).toThrow(BadRequestException);
    });

    it('rechaza formato inválido', () => {
      expect(() =>
        validateCurpForSires('INVALID', true, demographics, {
          allowGenericCurp: true,
          subjectLabel: 'trabajador',
        }),
      ).toThrow(BadRequestException);
    });

    it('devuelve mensaje legible A1 para discrepancia de iniciales', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      try {
        validateCurpForSires('GALJ900515HDFRPN08', true, {
          fechaNacimiento: '1990-05-15',
          sexo: 'Masculino',
          entidadNacimiento: '09',
          nombre: 'JUAN',
          primerApellido: 'GIRACIA',
          segundoApellido: 'LOPEZ',
        }, {
          allowGenericCurp: true,
          subjectLabel: 'trabajador',
        });
        fail('Se esperaba BadRequestException');
      } catch (error) {
        const response = (error as BadRequestException).getResponse() as Record<
          string,
          unknown
        >;

        expect(response.ruleId).toBe('A1');
        expect(response.summary).toBe(
          'La CURP no coincide con las iniciales del nombre y apellidos (posiciones 1 a 4).',
        );
        expect(response.message).toBe(response.summary);
        expect(response.message).not.toContain('demográficos');
        expect(response.message).not.toContain('iniciales,');
        expect(Array.isArray(response.userMessages)).toBe(true);
        expect(Array.isArray(response.details)).toBe(true);
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('devuelve mensaje legible A1 para discrepancia de fecha de nacimiento', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      try {
        validateCurpForSires('GALJ900515HDFRPN08', true, {
          fechaNacimiento: '1991-05-15',
          sexo: 'Masculino',
          entidadNacimiento: '09',
          nombre: 'JUAN',
          primerApellido: 'GARCIA',
          segundoApellido: 'LOPEZ',
        }, {
          allowGenericCurp: true,
          subjectLabel: 'trabajador',
        });
        fail('Se esperaba BadRequestException');
      } catch (error) {
        const response = (error as BadRequestException).getResponse() as Record<
          string,
          unknown
        >;

        expect(response.ruleId).toBe('A1');
        expect(response.message).toBe(
          'La CURP no coincide con la fecha de nacimiento. (posiciones 5 a 10).',
        );
        expect(response.message).not.toContain('fechaNacimiento');
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe('validateOptionalCurpSinRegimen', () => {
    it('no hace nada si CURP vacía', () => {
      expect(() => validateOptionalCurpSinRegimen(undefined)).not.toThrow();
    });

    it('no lanza si formato inválido (solo warn)', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      expect(() => validateOptionalCurpSinRegimen('INVALID')).not.toThrow();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});

describe('isGenericCURP', () => {
  it('detecta CURP genérica estándar', () => {
    expect(isGenericCURP('XXXX999999XXXXXX99')).toBe(true);
  });
});
