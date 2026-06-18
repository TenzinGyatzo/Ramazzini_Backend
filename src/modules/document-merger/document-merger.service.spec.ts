import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DocumentMergerService } from './document-merger.service';
import { ClinicalFilesService } from '../files/clinical-files.service';
import { EXPEDIENTES_DIR } from 'src/utils/expedientes-dir';

describe('DocumentMergerService', () => {
  let service: DocumentMergerService;
  let clinicalFilesService: ClinicalFilesService;

  beforeEach(() => {
    clinicalFilesService = new ClinicalFilesService();
    service = new DocumentMergerService(clinicalFilesService);
  });

  it('rechaza filePaths vacío', async () => {
    await expect(service.mergeFiles([])).rejects.toThrow(BadRequestException);
  });

  it('rechaza rutas fuera de expedientes-medicos', async () => {
    await expect(
      service.mergeFiles(['/var/www/backend/.env']),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rechaza path traversal', async () => {
    await expect(
      service.mergeFiles(['../../package.json']),
    ).rejects.toThrow(ForbiddenException);
  });

  it('fusiona PDFs válidos dentro de expedientes-medicos', async () => {
    const relativeDir = path.join('__tests__', 'document-merger');
    const absoluteDir = path.join(EXPEDIENTES_DIR, relativeDir);
    await fs.mkdir(absoluteDir, { recursive: true });

    const fileA = path.join(absoluteDir, 'a.pdf');
    const fileB = path.join(absoluteDir, 'b.pdf');
    const minimalPdf = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\ntrailer<</Root 1 0 R>>\n%%EOF',
    );
    await fs.writeFile(fileA, minimalPdf);
    await fs.writeFile(fileB, minimalPdf);

    const routeA = `expedientes-medicos/${relativeDir.replace(/\\/g, '/')}/a.pdf`;
    const routeB = `expedientes-medicos/${relativeDir.replace(/\\/g, '/')}/b.pdf`;

    const merged = await service.mergeFiles([routeA, routeB]);
    expect(merged.subarray(0, 4).toString()).toBe('%PDF');

    await fs.rm(absoluteDir, { recursive: true, force: true });
  });
});
