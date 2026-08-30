import { BadRequestException } from '@nestjs/common';
import path from 'path';
import { convertirFechaISOaDDMMYYYY } from '../../../utils/dates';
import {
  assertTrabajadorIdsConsistent,
  buildClinicalDirectoryPath,
  buildExternalDocumentFilename,
  getWriteBase,
  resolveAndContain,
  sanitizePathSegment,
} from './clinical-directory-path';

/** Copia fiel de frontend/src/helpers/clinicalPath.ts — verificación de rollback. */
function frontendSanitizePathSegment(name: string): string {
  return name.replace(/[/\\]/g, '-').trim();
}

function frontendBuildClinicalDirectoryPath(
  empresa: string,
  centro: string,
  trabajadorNombre: string,
  trabajadorId: string,
): string {
  const e = frontendSanitizePathSegment(empresa);
  const c = frontendSanitizePathSegment(centro);
  const t = frontendSanitizePathSegment(trabajadorNombre);
  return `expedientes-medicos/${e}/${c}/${t}_${trabajadorId}`;
}

/** Fórmula diskStorage.filename del controller previo a IMP-009. */
function legacyMulterFilename(
  nombreDocumento: string,
  fechaDocumento: string,
  originalname: string,
): string {
  const fecha = convertirFechaISOaDDMMYYYY(fechaDocumento);
  const extension = path.extname(originalname);
  return `${nombreDocumento || 'documento'} ${fecha}${extension}`.replace(
    /[<>:"/\\|?*]/g,
    '-',
  );
}

describe('clinical-directory-path', () => {
  const previousEnv = process.env.EXPEDIENTES_DIR;

  afterEach(() => {
    if (previousEnv === undefined) {
      delete process.env.EXPEDIENTES_DIR;
    } else {
      process.env.EXPEDIENTES_DIR = previousEnv;
    }
  });

  describe('sanitizePathSegment / buildClinicalDirectoryPath', () => {
    it('reemplaza barras por guiones y conserva espacios y acentos', () => {
      expect(sanitizePathSegment('MEGA PRODUCTO / NUEVOS INGRESOS')).toBe(
        'MEGA PRODUCTO - NUEVOS INGRESOS',
      );
      expect(sanitizePathSegment('José Pérez')).toBe('José Pérez');
      expect(sanitizePathSegment('  ACEROS  ')).toBe('ACEROS');
    });

    it('reproduce el vector de clinicalPath.spec.ts del frontend', () => {
      expect(
        buildClinicalDirectoryPath(
          'ACEROS DE GUATEMALA',
          'MEGA PRODUCTO / NUEVOS INGRESOS',
          'JAIME EMANUEL',
          '6a3d25e4cd1e8332593053fc',
        ),
      ).toBe(
        'expedientes-medicos/ACEROS DE GUATEMALA/MEGA PRODUCTO - NUEVOS INGRESOS/JAIME EMANUEL_6a3d25e4cd1e8332593053fc',
      );
    });

    it('es idéntico a la función del frontend para los mismos inputs', () => {
      const args: [string, string, string, string] = [
        'ACEROS DE GUATEMALA',
        'MEGA PRODUCTO / NUEVOS INGRESOS',
        'JAIME EMANUEL',
        '6a3d25e4cd1e8332593053fc',
      ];
      expect(buildClinicalDirectoryPath(...args)).toBe(
        frontendBuildClinicalDirectoryPath(...args),
      );
    });
  });

  describe('getWriteBase / resolveAndContain', () => {
    it('getWriteBase usa path.resolve(EXPEDIENTES_DIR || "")', () => {
      process.env.EXPEDIENTES_DIR = '/tmp/ramazzini-write-base';
      expect(getWriteBase()).toBe(
        path.resolve('/tmp/ramazzini-write-base'),
      );
    });

    it('rechaza relativa con ../ y ..\\', () => {
      const writeBase = path.resolve('/tmp/write-base');
      expect(() => resolveAndContain(writeBase, '../../../etc')).toThrow(
        BadRequestException,
      );
      expect(() =>
        resolveAndContain(writeBase, 'expedientes-medicos\\..\\..\\etc'),
      ).toThrow(BadRequestException);
    });

    it('rechaza rutas absolutas Unix y Windows', () => {
      const writeBase = path.resolve('/tmp/write-base');
      expect(() => resolveAndContain(writeBase, '/etc/passwd')).toThrow(
        BadRequestException,
      );
      expect(() =>
        resolveAndContain(writeBase, 'C:\\Windows\\System32'),
      ).toThrow(BadRequestException);
    });

    it('acepta relativa canónica y la deja dentro de writeBase', () => {
      const writeBase = path.resolve('/tmp/write-base');
      const relative =
        'expedientes-medicos/ACEROS DE GUATEMALA/PLANTA/JAIME_507f1f77bcf86cd799439014';
      const absolute = resolveAndContain(writeBase, relative);
      expect(absolute.startsWith(writeBase + path.sep)).toBe(true);
      expect(absolute).toBe(path.resolve(writeBase, relative));
    });

    it('rechaza segmentos . y .. tras sanitize sin reescribir nombres', () => {
      const writeBase = path.resolve('/tmp/write-base');
      const withDot = buildClinicalDirectoryPath('.', 'Centro', 'Nombre', 'id1');
      const withDotDot = buildClinicalDirectoryPath(
        '..',
        'Centro',
        'Nombre',
        'id1',
      );
      expect(withDot).toBe('expedientes-medicos/./Centro/Nombre_id1');
      expect(withDotDot).toBe('expedientes-medicos/../Centro/Nombre_id1');
      expect(() => resolveAndContain(writeBase, withDot)).toThrow(
        BadRequestException,
      );
      expect(() => resolveAndContain(writeBase, withDotDot)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('buildExternalDocumentFilename — rollback de fórmula', () => {
    it('coincide con diskStorage.filename previo a IMP-009', () => {
      const nombre = 'Prueba de laboratorio';
      const fechaIso = '2024-10-25T07:00:00.000+00:00';
      const originalname = 'scan.PDF';
      expect(
        buildExternalDocumentFilename(nombre, fechaIso, originalname),
      ).toBe(legacyMulterFilename(nombre, fechaIso, originalname));
    });

    it('sanitiza caracteres prohibidos y conserva extname original', () => {
      expect(
        buildExternalDocumentFilename(
          'a/b:c',
          '2024-01-02T00:00:00.000Z',
          'foto.JPEG',
        ),
      ).toBe('a-b-c 02-01-2024.JPEG');
    });

    it('un nombre ".." no produce un filename igual a . o ..', () => {
      const filename = buildExternalDocumentFilename(
        '..',
        '2024-01-02T00:00:00.000Z',
        'x.pdf',
      );
      expect(filename).toBe('.. 02-01-2024.pdf');
      expect(path.basename(filename)).not.toBe('.');
      expect(path.basename(filename)).not.toBe('..');
    });
  });

  describe('assertTrabajadorIdsConsistent', () => {
    const urlId = '507f1f77bcf86cd799439011';

    it('acepta IDs iguales como string', () => {
      expect(() =>
        assertTrabajadorIdsConsistent(urlId, urlId),
      ).not.toThrow();
    });

    it('acepta body ausente o vacío', () => {
      expect(() => assertTrabajadorIdsConsistent(urlId)).not.toThrow();
      expect(() => assertTrabajadorIdsConsistent(urlId, '')).not.toThrow();
    });

    it('rechaza IDs distintos', () => {
      expect(() =>
        assertTrabajadorIdsConsistent(urlId, '507f191e810c19729de860ea'),
      ).toThrow(BadRequestException);
    });
  });

  describe('fixtures históricas (sin recálculo)', () => {
    const withObjectId =
      'expedientes-medicos/Empresa/Centro/Nombre_507f1f77bcf86cd799439014';
    const withoutObjectId = 'expedientes-medicos/Empresa/Centro/Nombre';
    const withFilename =
      'expedientes-medicos/Empresa/Centro/Nombre_507f1f77bcf86cd799439014/lab 25-10-2024.pdf';

    it('no reescribe localizadores históricos', () => {
      expect(withObjectId).not.toBe(
        buildClinicalDirectoryPath(
          'Otra Empresa',
          'Otro Centro',
          'Otro Nombre',
          '507f1f77bcf86cd799439014',
        ),
      );
      expect(withoutObjectId).toBe(
        'expedientes-medicos/Empresa/Centro/Nombre',
      );
      expect(withFilename.endsWith('.pdf')).toBe(true);
    });
  });
});
