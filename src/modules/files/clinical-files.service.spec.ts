import { ForbiddenException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ClinicalFilesService } from './clinical-files.service';
import { EXPEDIENTES_DIR } from 'src/utils/expedientes-dir';

describe('ClinicalFilesService', () => {
  let service: ClinicalFilesService;

  beforeEach(() => {
    service = new ClinicalFilesService();
  });

  it('rechaza path traversal fuera del directorio base', () => {
    expect(() => service.resolveSafePath('../../package.json')).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza extensiones no permitidas', () => {
    expect(() =>
      service.resolveSafePath('expedientes-medicos/empresa/centro/archivo.exe'),
    ).toThrow(ForbiddenException);
  });

  it('resuelve rutas válidas dentro de expedientes-medicos', async () => {
    const relativeDir = path.join('__tests__', 'clinical-files');
    const absoluteDir = path.join(EXPEDIENTES_DIR, relativeDir);
    await fs.mkdir(absoluteDir, { recursive: true });
    const fileName = 'Historia Clinica 01-01-2026.pdf';
    const absoluteFile = path.join(absoluteDir, fileName);
    await fs.writeFile(absoluteFile, '%PDF-1.4 sample');

    const resolved = service.resolveSafePath(
      `expedientes-medicos/${relativeDir.replace(/\\/g, '/')}/${fileName}`,
    );

    expect(resolved).toBe(absoluteFile);
    await expect(service.assertFileExists(resolved)).resolves.toBeUndefined();

    await fs.rm(absoluteDir, { recursive: true, force: true });
  });

  it('lanza NotFoundException si el archivo no existe', async () => {
    const missing = service.resolveSafePath(
      'expedientes-medicos/__tests__/clinical-files/inexistente.pdf',
    );
    await expect(service.assertFileExists(missing)).rejects.toThrow(
      NotFoundException,
    );
  });
});
