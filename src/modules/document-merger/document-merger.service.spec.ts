import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DocumentMergerService } from './document-merger.service';
import { ClinicalFilesService } from '../files/clinical-files.service';
import { EXPEDIENTES_DIR } from 'src/utils/expedientes-dir';
import { OrganizationalAccessService } from 'src/utils/organizational-access.service';

describe('DocumentMergerService', () => {
  let service: DocumentMergerService;
  let clinicalFilesService: ClinicalFilesService;
  const userId = '507f1f77bcf86cd799439015';

  beforeEach(() => {
    const organizationalAccessService = {
      assertUserCanAccessClinicalPath: jest.fn().mockResolvedValue(undefined),
    } as unknown as OrganizationalAccessService;
    clinicalFilesService = new ClinicalFilesService(organizationalAccessService);
    service = new DocumentMergerService(clinicalFilesService);
  });

  it('rechaza filePaths vacío', async () => {
    await expect(service.mergeFiles(userId, [])).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rechaza rutas fuera de expedientes-medicos', async () => {
    await expect(
      service.mergeFiles(userId, ['/var/www/backend/.env']),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rechaza path traversal', async () => {
    await expect(
      service.mergeFiles(userId, ['../../package.json']),
    ).rejects.toThrow(ForbiddenException);
  });

  it('fusiona PDFs válidos dentro de expedientes-medicos', async () => {
    const trabajadorId = '507f1f77bcf86cd799439014';
    const relativeWorkerDir = path.join('Empresa', 'Centro', `Juan_${trabajadorId}`);
    const absoluteDir = path.join(EXPEDIENTES_DIR, relativeWorkerDir);
    await fs.mkdir(absoluteDir, { recursive: true });

    const fileA = path.join(absoluteDir, 'a.pdf');
    const fileB = path.join(absoluteDir, 'b.pdf');
    const minimalPdf = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\ntrailer<</Root 1 0 R>>\n%%EOF',
    );
    await fs.writeFile(fileA, minimalPdf);
    await fs.writeFile(fileB, minimalPdf);

    const routeA = `expedientes-medicos/Empresa/Centro/Juan_${trabajadorId}/a.pdf`;
    const routeB = `expedientes-medicos/Empresa/Centro/Juan_${trabajadorId}/b.pdf`;

    const merged = await service.mergeFiles(userId, [routeA, routeB]);
    expect(merged.subarray(0, 4).toString()).toBe('%PDF');

    await fs.rm(path.join(EXPEDIENTES_DIR, 'Empresa'), {
      recursive: true,
      force: true,
    });
  });
});
