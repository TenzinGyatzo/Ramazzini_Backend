import { ForbiddenException } from '@nestjs/common';
import {
  assertCanManageDocument,
  hasPermission,
  sanitizePermissionsForRole,
} from './role-permission-policy';

describe('role-permission-policy', () => {
  describe('sanitizePermissionsForRole', () => {
    it('Administrativo conserva externos y elimina clínicos/riesgos', () => {
      const result = sanitizePermissionsForRole('Administrativo', {
        gestionarDocumentosDiagnostico: true,
        gestionarDocumentosEvaluacion: true,
        gestionarDocumentosExternos: true,
        gestionarOtrosDocumentos: true,
        accesoRiesgosTrabajo: true,
      });

      expect(result.gestionarDocumentosDiagnostico).toBe(false);
      expect(result.gestionarDocumentosEvaluacion).toBe(false);
      expect(result.gestionarOtrosDocumentos).toBe(false);
      expect(result.accesoRiesgosTrabajo).toBe(false);
      expect(result.gestionarDocumentosExternos).toBe(true);
    });

    it('Técnico Evaluador nunca recibe diagnóstico ni riesgos', () => {
      const result = sanitizePermissionsForRole('Técnico Evaluador', {
        gestionarDocumentosDiagnostico: true,
        accesoRiesgosTrabajo: true,
      });

      expect(result.gestionarDocumentosDiagnostico).toBe(false);
      expect(result.accesoRiesgosTrabajo).toBe(false);
    });

    it('Enfermero/a puede recibir diagnóstico si el Principal lo otorga', () => {
      const result = sanitizePermissionsForRole('Enfermero/a', {
        gestionarDocumentosDiagnostico: true,
      });

      expect(result.gestionarDocumentosDiagnostico).toBe(true);
    });
  });

  describe('hasPermission / assertCanManageDocument', () => {
    const administrativo = {
      role: 'Administrativo',
      permisos: sanitizePermissionsForRole('Administrativo', {
        gestionarDocumentosExternos: true,
      }),
    };

    it('Administrativo puede gestionar documentos externos', () => {
      expect(
        hasPermission(administrativo, 'gestionarDocumentosExternos'),
      ).toBe(true);
      expect(() =>
        assertCanManageDocument(administrativo, 'documentoExterno'),
      ).not.toThrow();
    });

    it('Administrativo no puede crear aptitud', () => {
      expect(
        hasPermission(administrativo, 'gestionarDocumentosDiagnostico'),
      ).toBe(false);
      expect(() => assertCanManageDocument(administrativo, 'aptitud')).toThrow(
        ForbiddenException,
      );
    });

    it('Principal tiene bypass total', () => {
      const principal = { role: 'Principal', permisos: {} };
      expect(hasPermission(principal, 'gestionarDocumentosDiagnostico')).toBe(
        true,
      );
      expect(() => assertCanManageDocument(principal, 'notaMedica')).not.toThrow();
    });
  });
});
