import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DocumentMergerService } from './document-merger.service';
import { ClinicalFilesService } from '../files/clinical-files.service';
import { EXPEDIENTES_DIR } from 'src/utils/expedientes-dir';
import { OrganizationalAccessService } from 'src/utils/organizational-access.service';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { AuditActionType } from '../audit/constants/audit-action-type';

describe('DocumentMergerService', () => {
  let service: DocumentMergerService;
  let clinicalFilesService: ClinicalFilesService;
  let auditService: { record: jest.Mock };
  let usersService: { findById: jest.Mock };
  let organizationalAccessService: {
    assertUserCanAccessClinicalPath: jest.Mock;
    assertUserCanAccessTrabajadorId: jest.Mock;
  };
  const userId = '507f1f77bcf86cd799439015';
  const trabajadorId = '507f1f77bcf86cd799439014';

  beforeEach(() => {
    organizationalAccessService = {
      assertUserCanAccessClinicalPath: jest.fn().mockResolvedValue(undefined),
      assertUserCanAccessTrabajadorId: jest.fn().mockResolvedValue(undefined),
    };
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    usersService = {
      findById: jest.fn().mockResolvedValue({
        idProveedorSalud: '507f1f77bcf86cd799439011',
      }),
    };
    clinicalFilesService = new ClinicalFilesService(
      organizationalAccessService as unknown as OrganizationalAccessService,
      auditService as unknown as AuditService,
      usersService as unknown as UsersService,
    );
    service = new DocumentMergerService(
      clinicalFilesService,
      auditService as unknown as AuditService,
      usersService as unknown as UsersService,
      organizationalAccessService as unknown as OrganizationalAccessService,
    );
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

  it('fusiona PDFs válidos y audita sin filePath en payload', async () => {
    const relativeWorkerDir = path.join(
      'Empresa',
      'Centro',
      `Juan_${trabajadorId}`,
    );
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

    const documents = [
      {
        documentId: '507f1f77bcf86cd799439021',
        documentType: 'historiaClinica',
        filePath: routeA,
      },
      {
        documentId: '507f1f77bcf86cd799439022',
        documentType: 'aptitud',
        filePath: routeB,
      },
    ];

    const merged = await service.mergeDocuments(
      userId,
      trabajadorId,
      documents,
    );
    expect(merged.subarray(0, 4).toString()).toBe('%PDF');

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.CLINICAL_FILES_MERGED_DOWNLOAD,
        resourceType: 'Trabajador',
        resourceId: trabajadorId,
        payload: {
          trabajadorId,
          count: 2,
          documents: [
            {
              documentId: '507f1f77bcf86cd799439021',
              documentType: 'historiaClinica',
            },
            {
              documentId: '507f1f77bcf86cd799439022',
              documentType: 'aptitud',
            },
          ],
        },
      }),
    );
    const payload = auditService.record.mock.calls[0][0].payload;
    expect(JSON.stringify(payload)).not.toContain('filePath');
    expect(JSON.stringify(payload)).not.toContain('expedientes-medicos');

    await fs.rm(path.join(EXPEDIENTES_DIR, 'Empresa'), {
      recursive: true,
      force: true,
    });
  });

  it('no audita si falla el assert de archivo', async () => {
    await expect(
      service.mergeDocuments(userId, trabajadorId, [
        {
          documentId: '507f1f77bcf86cd799439021',
          documentType: 'historiaClinica',
          filePath: `expedientes-medicos/Empresa/Centro/Juan_${trabajadorId}/missing.pdf`,
        },
      ]),
    ).rejects.toThrow();

    expect(auditService.record).not.toHaveBeenCalled();
  });
});
