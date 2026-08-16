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

    it('exige CURP genérica con entidad 00 o 99', () => {
      for (const entidadNacimiento of ['00', '99'] as const) {
        expect(() =>
          validateCurpForSires(
            'GALJ900515HDFRPN08',
            true,
            { ...demographics, entidadNacimiento },
            {
              allowGenericCurp: true,
              subjectLabel: 'trabajador',
            },
          ),
        ).toThrow(BadRequestException);

        expect(() =>
          validateCurpForSires(
            'XXXX999999XXXXXX99',
            true,
            { ...demographics, entidadNacimiento },
            {
              allowGenericCurp: true,
              subjectLabel: 'trabajador',
            },
          ),
        ).not.toThrow();
      }
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
        expect(String(response.summary)).toMatch(/Pos\. \d+/);
        expect(String(response.message)).not.toContain('demográficos');
        expect(Array.isArray(response.userMessages)).toBe(true);
        expect(Array.isArray(response.details)).toBe(true);
        const details = response.details as Array<{
          code?: string;
          positions?: number[];
        }>;
        expect(details.some((d) => d.code === 'CURP_CROSS_INICIALES')).toBe(true);
        expect(
          details
            .filter((d) => d.code === 'CURP_CROSS_INICIALES')
            .every((d) => d.positions?.length === 1),
        ).toBe(true);
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
        expect(String(response.message)).toMatch(/Pos\. \d+/);
        expect(String(response.message)).toContain('fecha AAMMDD');
        expect(String(response.message)).not.toContain('fechaNacimiento');
        const details = response.details as Array<{
          code?: string;
          positions?: number[];
        }>;
        expect(details.some((d) => d.code === 'CURP_CROSS_FECHA')).toBe(true);
        expect(
          details
            .filter((d) => d.code === 'CURP_CROSS_FECHA')
            .every((d) => d.positions?.length === 1),
        ).toBe(true);
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
