import { BadRequestException } from '@nestjs/common';
import {
  validateFechaNacimiento,
  validateFechaDocumento,
  AGE_MIN_YEARS,
  AGE_MAX_YEARS,
} from './date-validators';

describe('Date Validators', () => {
  describe('validateFechaNacimiento (A2)', () => {
    it('debe lanzar error si fechaNacimiento es futura', () => {
      const fechaFutura = new Date();
      fechaFutura.setFullYear(fechaFutura.getFullYear() + 1);
      expect(() => validateFechaNacimiento(fechaFutura)).toThrow(
        BadRequestException,
      );
      expect(() => validateFechaNacimiento(fechaFutura)).toThrow(
        'La fecha de nacimiento no puede ser futura',
      );
    });

    it('debe lanzar error si edad > 70 años', () => {
      const fechaHace71 = new Date();
      fechaHace71.setFullYear(fechaHace71.getFullYear() - 71);
      expect(() => validateFechaNacimiento(fechaHace71)).toThrow(
        BadRequestException,
      );
      expect(() => validateFechaNacimiento(fechaHace71)).toThrow(
        `La edad calculada (71 años) está fuera del rango válido (${AGE_MIN_YEARS}-${AGE_MAX_YEARS} años)`,
      );
    });

    it('debe lanzar error si edad < 18 años', () => {
      const fechaHace10 = new Date();
      fechaHace10.setFullYear(fechaHace10.getFullYear() - 10);
      expect(() => validateFechaNacimiento(fechaHace10)).toThrow(
        BadRequestException,
      );
      expect(() => validateFechaNacimiento(fechaHace10)).toThrow(
        `La edad calculada (10 años) está fuera del rango válido (${AGE_MIN_YEARS}-${AGE_MAX_YEARS} años)`,
      );
    });

    it('debe permitir fechaNacimiento válida (18 años)', () => {
      const fechaHace18 = new Date();
      fechaHace18.setFullYear(fechaHace18.getFullYear() - 18);
      expect(() => validateFechaNacimiento(fechaHace18)).not.toThrow();
    });

    it('debe permitir fechaNacimiento válida (70 años)', () => {
      const fechaHace70 = new Date();
      fechaHace70.setFullYear(fechaHace70.getFullYear() - 70);
      expect(() => validateFechaNacimiento(fechaHace70)).not.toThrow();
    });

    it('debe aceptar string ISO como fechaNacimiento', () => {
      const fechaString = '1990-01-01T00:00:00.000Z';
      expect(() => validateFechaNacimiento(fechaString)).not.toThrow();
    });

    it('debe lanzar error si fechaNacimiento es string inválido', () => {
      const fechaInvalida = 'fecha-invalida';
      expect(() => validateFechaNacimiento(fechaInvalida)).toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar error si edad es negativa (fecha muy futura)', () => {
      const fechaMuyFutura = new Date();
      fechaMuyFutura.setFullYear(fechaMuyFutura.getFullYear() + 10);
      expect(() => validateFechaNacimiento(fechaMuyFutura)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateFechaDocumento (E1)', () => {
    it('debe lanzar error si fechaDocumento es futura', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(12, 0, 0, 0);
      expect(() => validateFechaDocumento(fechaFutura)).toThrow(
        BadRequestException,
      );
      expect(() => validateFechaDocumento(fechaFutura)).toThrow(
        'La fecha del documento no puede ser futura',
      );
    });

    it('debe lanzar error si fechaDocumento < fechaNacimiento', () => {
      const fechaNac = new Date('1990-01-01');
      const fechaDoc = new Date('1989-12-31');
      expect(() => validateFechaDocumento(fechaDoc, fechaNac)).toThrow(
        BadRequestException,
      );
      expect(() => validateFechaDocumento(fechaDoc, fechaNac)).toThrow(
        'La fecha del documento no puede ser anterior a la fecha de nacimiento del trabajador',
      );
    });

    it('debe permitir fechaDocumento = fechaNacimiento', () => {
      const fecha = new Date('1990-01-01');
      expect(() => validateFechaDocumento(fecha, fecha)).not.toThrow();
    });

    it('debe permitir fechaDocumento válida sin fechaNacimiento', () => {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      expect(() => validateFechaDocumento(hoy)).not.toThrow();
    });

    it('debe permitir fechaDocumento válida después de fechaNacimiento', () => {
      const fechaNac = new Date('1990-01-01');
      const fechaDoc = new Date('2000-01-01');
      expect(() => validateFechaDocumento(fechaDoc, fechaNac)).not.toThrow();
    });

    it('debe permitir fechaDocumento = hoy (fin del día)', () => {
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);
      expect(() => validateFechaDocumento(hoy)).not.toThrow();
    });

    it('debe aceptar string ISO como fechaDocumento', () => {
      const fechaString = '2020-01-01T00:00:00.000Z';
      expect(() => validateFechaDocumento(fechaString)).not.toThrow();
    });

    it('debe aceptar string ISO como fechaNacimiento', () => {
      const fechaDoc = new Date('2020-01-01');
      const fechaNacString = '1990-01-01T00:00:00.000Z';
      expect(() =>
        validateFechaDocumento(fechaDoc, fechaNacString),
      ).not.toThrow();
    });

    it('debe lanzar error si fechaDocumento es string inválido', () => {
      const fechaInvalida = 'fecha-invalida';
      expect(() => validateFechaDocumento(fechaInvalida)).toThrow(
        BadRequestException,
      );
    });

    it('debe manejar null como fechaNacimiento (solo valida que no sea futura)', () => {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      expect(() => validateFechaDocumento(hoy, null)).not.toThrow();
    });

    it('debe manejar undefined como fechaNacimiento (solo valida que no sea futura)', () => {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      expect(() => validateFechaDocumento(hoy, undefined)).not.toThrow();
    });

    it('debe permitir fecha futura cuando rejectFuture es false', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      expect(() =>
        validateFechaDocumento(fechaFutura, null, { rejectFuture: false }),
      ).not.toThrow();
    });

    it('debe seguir validando nacimiento cuando rejectFuture es false', () => {
      const fechaNac = new Date('1990-01-01');
      const fechaDoc = new Date('1989-12-31');
      expect(() =>
        validateFechaDocumento(fechaDoc, fechaNac, { rejectFuture: false }),
      ).toThrow(
        'La fecha del documento no puede ser anterior a la fecha de nacimiento del trabajador',
      );
    });
  });
});
