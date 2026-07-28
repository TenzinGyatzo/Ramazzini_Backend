import { ForbiddenException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ClinicalFilesService } from './clinical-files.service';
import { EXPEDIENTES_DIR } from 'src/utils/expedientes-dir';
import { OrganizationalAccessService } from 'src/utils/organizational-access.service';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';

describe('ClinicalFilesService', () => {
  let service: ClinicalFilesService;
  let organizationalAccessService: {
    assertUserCanAccessClinicalPath: jest.Mock;
    assertUserCanAccessTrabajadorId: jest.Mock;
  };
  let auditService: { record: jest.Mock };
  let usersService: { findById: jest.Mock };

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
    service = new ClinicalFilesService(
      organizationalAccessService as unknown as OrganizationalAccessService,
      auditService as unknown as AuditService,
      usersService as unknown as UsersService,
    );
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
    await fs.writeFile(absoluteFile, '%PDF-1.4');

    const relativePath = `expedientes-medicos/${relativeDir.replace(/\\/g, '/')}/${fileName}`;
    expect(service.resolveSafePath(relativePath)).toBe(absoluteFile);

    await fs.rm(absoluteDir, { recursive: true, force: true });
  });

  it('recordClinicalFileDownload emite CLINICAL_FILE_DOWNLOAD', async () => {
    await service.recordClinicalFileDownload('user-1', {
      documentId: '507f1f77bcf86cd799439012',
      documentType: 'historiaClinica',
      trabajadorId: '507f1f77bcf86cd799439013',
      filename: 'hc.pdf',
      mediaKind: 'pdf',
      origen: 'lista',
    });

    expect(
      organizationalAccessService.assertUserCanAccessTrabajadorId,
    ).toHaveBeenCalledWith('user-1', '507f1f77bcf86cd799439013');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.CLINICAL_FILE_DOWNLOAD,
        resourceType: 'historiaClinica',
        resourceId: '507f1f77bcf86cd799439012',
        eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
        payload: expect.objectContaining({
          documentId: '507f1f77bcf86cd799439012',
          documentType: 'historiaClinica',
          trabajadorId: '507f1f77bcf86cd799439013',
        }),
      }),
    );
  });

  it('assertFileExists lanza NotFoundException si no hay archivo', async () => {
    await expect(
      service.assertFileExists(path.join(EXPEDIENTES_DIR, 'no-existe.pdf')),
    ).rejects.toThrow(NotFoundException);
  });
});
