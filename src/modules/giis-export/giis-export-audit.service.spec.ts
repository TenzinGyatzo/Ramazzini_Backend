import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { GiisExportAuditService } from './giis-export-audit.service';
import { GiisExportAudit } from './schemas/giis-export-audit.schema';
import {
  enableAuditTrailPersist,
  disableAuditTrailPersist,
} from '../../../test/utils/audit-trail-test.util';

describe('GiisExportAuditService — AUDIT_TRAIL_PERSIST gate', () => {
  let service: GiisExportAuditService;
  let auditModelMock: { create: jest.Mock };
  const originalPersist = process.env.AUDIT_TRAIL_PERSIST;

  const payload = {
    proveedorSaludId: '507f1f77bcf86cd799439011',
    periodo: '2026-01',
    establecimientoClues: 'CLUES01',
    tipoGuia: 'CEX' as const,
    nombreArchivoOficial: 'file.txt',
    resumenValidacion: 'ok',
    batchId: '507f1f77bcf86cd799439012',
  };

  beforeEach(async () => {
    auditModelMock = {
      create: jest.fn().mockResolvedValue({ _id: 'audit1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GiisExportAuditService,
        {
          provide: getModelToken(GiisExportAudit.name),
          useValue: auditModelMock,
        },
      ],
    }).compile();

    service = module.get<GiisExportAuditService>(GiisExportAuditService);
  });

  afterEach(() => {
    if (originalPersist === undefined) {
      delete process.env.AUDIT_TRAIL_PERSIST;
    } else {
      process.env.AUDIT_TRAIL_PERSIST = originalPersist;
    }
  });

  it('does not persist when AUDIT_TRAIL_PERSIST is disabled', async () => {
    disableAuditTrailPersist();

    const result = await service.recordGenerationAudit(payload);

    expect(result).toBeNull();
    expect(auditModelMock.create).not.toHaveBeenCalled();
  });

  it('persists when AUDIT_TRAIL_PERSIST is enabled', async () => {
    enableAuditTrailPersist();

    await service.recordGenerationAudit(payload);

    expect(auditModelMock.create).toHaveBeenCalledTimes(1);
  });
});
