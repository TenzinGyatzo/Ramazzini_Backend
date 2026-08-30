import { BadRequestException } from '@nestjs/common';
import path from 'path';
import { convertirFechaISOaDDMMYYYY } from '../../../utils/dates';

export const MAX_EXTERNAL_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** Espejo fiel de frontend/src/helpers/clinicalPath.ts */
export function sanitizePathSegment(name: string): string {
  return name.replace(/[/\\]/g, '-').trim();
}

/** Espejo fiel de frontend/src/helpers/clinicalPath.ts */
export function buildClinicalDirectoryPath(
  empresa: string,
  centro: string,
  trabajadorNombre: string,
  trabajadorId: string,
): string {
  const e = sanitizePathSegment(empresa);
  const c = sanitizePathSegment(centro);
  const t = sanitizePathSegment(trabajadorNombre);
  return `expedientes-medicos/${e}/${c}/${t}_${trabajadorId}`;
}

/** Misma base que multer usa hoy para destination. */
export function getWriteBase(): string {
  return path.resolve(process.env.EXPEDIENTES_DIR || '');
}

/**
 * Resuelve relative contra writeBase y exige que el absoluto quede contenido
 * en esa misma base. No usa la constante EXPEDIENTES_DIR de lecturas.
 */
export function resolveAndContain(writeBase: string, relativePath: string): string {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new BadRequestException('Ruta de almacenamiento no permitida');
  }

  const normalized = relativePath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new BadRequestException('Ruta de almacenamiento no permitida');
  }

  const base = path.resolve(writeBase);
  const absolute = path.resolve(base, relativePath);
  if (absolute !== base && !absolute.startsWith(base + path.sep)) {
    throw new BadRequestException('Ruta de almacenamiento no permitida');
  }

  return absolute;
}

/**
 * Misma fórmula que diskStorage.filename en el controller previo a IMP-009.
 */
export function buildExternalDocumentFilename(
  nombreDocumento: string,
  fechaDocumento: Date | string,
  originalname: string,
): string {
  const fechaInput =
    fechaDocumento instanceof Date
      ? fechaDocumento.toISOString()
      : fechaDocumento;
  const fechaDocumentoFmt = convertirFechaISOaDDMMYYYY(fechaInput);
  const extension = path.extname(originalname);
  const filename = `${nombreDocumento || 'documento'} ${fechaDocumentoFmt}${extension}`.replace(
    /[<>:"/\\|?*]/g,
    '-',
  );

  const base = path.basename(filename);
  if (!base || base === '.' || base === '..') {
    throw new BadRequestException('Nombre de archivo no válido');
  }

  return filename;
}

export function assertTrabajadorIdsConsistent(
  urlTrabajadorId: string,
  bodyTrabajadorId?: string,
): void {
  if (
    bodyTrabajadorId != null &&
    bodyTrabajadorId !== '' &&
    String(bodyTrabajadorId) !== String(urlTrabajadorId)
  ) {
    throw new BadRequestException(
      'El trabajador del documento no coincide con el de la ruta',
    );
  }
}
