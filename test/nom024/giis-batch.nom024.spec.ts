/**
 * NOM-024 GIIS Batch Tests (Phase 1 — 1A)
 *
 * Tests GiisBatch schema and GiisBatchService: createBatch, getBatch.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Types } from 'mongoose';
import {
  startMongoMemoryServer,
  stopMongoMemoryServer,
} from '../utils/mongodb-memory.util';
import {
  GiisBatch,
  GiisBatchSchema,
} from '../../src/modules/giis-export/schemas/giis-batch.schema';
import { GiisBatchService } from '../../src/modules/giis-export/giis-batch.service';
import { GiisSerializerService } from '../../src/modules/giis-export/giis-serializer.service';
import {
  Deteccion,
  DeteccionSchema,
} from '../../src/modules/expedientes/schemas/deteccion.schema';
import {
  NotaMedica,
  NotaMedicaSchema,
} from '../../src/modules/expedientes/schemas/nota-medica.schema';
import {
  Trabajador,
  TrabajadorSchema,
} from '../../src/modules/trabajadores/schemas/trabajador.schema';
import {
  CentroTrabajo,
  CentroTrabajoSchema,
} from '../../src/modules/centros-trabajo/schemas/centro-trabajo.schema';
import {
  Empresa,
  EmpresaSchema,
} from '../../src/modules/empresas/schemas/empresa.schema';
import { RegulatoryPolicyService } from '../../src/utils/regulatory-policy.service';
import { ProveedoresSaludService } from '../../src/modules/proveedores-salud/proveedores-salud.service';
import { GiisValidationService } from '../../src/modules/giis-export/validation/giis-validation.service';
import { GiisCryptoService } from '../../src/modules/giis-export/crypto/giis-crypto.service';
import { DgisCifradoService } from '../../src/modules/giis-export/crypto/dgis-cifrado.service';
import { GiisExportAuditService } from '../../src/modules/giis-export/giis-export-audit.service';
import { AuditService } from '../../src/modules/audit/audit.service';
import { FirmanteHelper } from '../../src/modules/expedientes/helpers/firmante-helper';
import { CatalogsService } from '../../src/modules/catalogs/catalogs.service';
import * as fs from 'fs';
import * as path from 'path';

const mockGiisValidationService = {
  validateAndFilterRows: jest.fn().mockImplementation(async (_guide, rows) => ({
    validRows: rows,
    excludedReport: { entries: [], totalExcluded: 0 },
    warnings: [],
  })),
};

describe('NOM-024 GIIS Batch (Phase 1A)', () => {
  let service: GiisBatchService;
  let mongoUri: string;

  beforeAll(async () => {
    mongoUri = await startMongoMemoryServer();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: GiisBatch.name, schema: GiisBatchSchema },
          { name: Deteccion.name, schema: DeteccionSchema },
          { name: NotaMedica.name, schema: NotaMedicaSchema },
          { name: Trabajador.name, schema: TrabajadorSchema },
          { name: CentroTrabajo.name, schema: CentroTrabajoSchema },
          { name: Empresa.name, schema: EmpresaSchema },
        ]),
      ],
      providers: [
        GiisBatchService,
        GiisSerializerService,
        {
          provide: RegulatoryPolicyService,
          useValue: { getRegulatoryPolicy: jest.fn() },
        },
        {
          provide: ProveedoresSaludService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: GiisValidationService,
          useValue: mockGiisValidationService,
        },
        { provide: GiisCryptoService, useValue: {} },
        {
          provide: DgisCifradoService,
          useValue: { isAvailable: () => false },
        },
        {
          provide: GiisExportAuditService,
          useValue: { recordGenerationAudit: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: AuditService,
          useValue: { record: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: FirmanteHelper,
          useValue: {
            getPrestadorDataFromUser: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: CatalogsService,
          useValue: {
            getPaisCatalogKeyFromNacionalidad: jest.fn().mockReturnValue(142),
          },
        },
      ],
    }).compile();
    service = module.get<GiisBatchService>(GiisBatchService);
  }, 30000);

  afterAll(async () => {
    await stopMongoMemoryServer();
  }, 10000);

  describe('createBatch and getBatch', () => {
    it('should create batch and read by ID with correct fields', async () => {
      const proveedorId = new Types.ObjectId().toString();
      const yearMonth = '2025-01';

      const batch = await service.createBatch(proveedorId, yearMonth);
      expect(batch).toBeDefined();
      expect(batch._id).toBeDefined();
      expect(batch.status).toBe('pending');
      expect(batch.yearMonth).toBe(yearMonth);
      expect(batch.proveedorSaludId.toString()).toBe(proveedorId);
      expect(batch.artifacts).toEqual([]);
      expect(batch.startedAt).toBeDefined();
      expect(batch.establecimientoClues).toBe('');

      const batchId = batch._id.toString();
      const found = await service.getBatch(batchId);
      expect(found).toBeDefined();
      expect(found!.status).toBe('pending');
      expect(found!.yearMonth).toBe('2025-01');
      expect(found!.proveedorSaludId.toString()).toBe(proveedorId);
    });

    it('should return null for invalid batchId', async () => {
      const found = await service.getBatch('invalid-id');
      expect(found).toBeNull();
    });
  });
});

describe('NOM-024 GIIS Batch Phase 6 — automatic encryption', () => {
  let service: GiisBatchService;
  let mongoUri: string;
  const KEY_BASE64 = Buffer.alloc(24, 0x01).toString('base64');
  const proveedorId = new Types.ObjectId().toString();
  const yearMonth = '2025-01';

  beforeAll(async () => {
    mongoUri = await startMongoMemoryServer();
    process.env.GIIS_3DES_KEY_BASE64 = KEY_BASE64;
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: GiisBatch.name, schema: GiisBatchSchema },
          { name: Deteccion.name, schema: DeteccionSchema },
          { name: NotaMedica.name, schema: NotaMedicaSchema },
          { name: Trabajador.name, schema: TrabajadorSchema },
          { name: CentroTrabajo.name, schema: CentroTrabajoSchema },
          { name: Empresa.name, schema: EmpresaSchema },
        ]),
      ],
      providers: [
        GiisBatchService,
        GiisSerializerService,
        {
          provide: RegulatoryPolicyService,
          useValue: { getRegulatoryPolicy: jest.fn() },
        },
        {
          provide: ProveedoresSaludService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: GiisValidationService,
          useValue: mockGiisValidationService,
        },
        GiisCryptoService,
        {
          provide: DgisCifradoService,
          useValue: { isAvailable: () => false },
        },
        {
          provide: GiisExportAuditService,
          useValue: { recordGenerationAudit: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: AuditService,
          useValue: { record: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: FirmanteHelper,
          useValue: {
            getPrestadorDataFromUser: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: CatalogsService,
          useValue: {
            getPaisCatalogKeyFromNacionalidad: jest.fn().mockReturnValue(142),
          },
        },
      ],
    }).compile();
    service = module.get<GiisBatchService>(GiisBatchService);
  }, 30000);

  afterAll(async () => {
    delete process.env.GIIS_3DES_KEY_BASE64;
    delete process.env.GIIS_ENCRYPTION_VALIDATED;
    await stopMongoMemoryServer();
  }, 10000);

  it('completing batch (CEX) without blockers → artifacts have zipPath and ZIP exists', async () => {
    process.env.GIIS_ENCRYPTION_VALIDATED = 'false';
    const batch = await service.createBatch(proveedorId, yearMonth);
    await service.generateBatchCex(batch._id.toString());

    const updated = await service.getBatch(batch._id.toString());
    expect(updated).toBeDefined();
    expect(updated!.status).toBe('completed');
    const cexArt = updated!.artifacts?.find((a) => a.guide === 'CEX');
    expect(cexArt?.zipPath).toBeDefined();
    expect(cexArt?.hashSha256).toBeDefined();

    const cwd = process.cwd();
    expect(fs.existsSync(path.join(cwd, cexArt!.zipPath!))).toBe(true);
  });

  it('with GIIS_ENCRYPTION_VALIDATED=false or undefined, encryption runs (no 409)', async () => {
    delete process.env.GIIS_ENCRYPTION_VALIDATED;
    const batch = await service.createBatch(proveedorId, '2025-02');
    await service.generateBatchCex(batch._id.toString());

    const updated = await service.getBatch(batch._id.toString());
    const cex = updated!.artifacts?.find((a) => a.guide === 'CEX');
    expect(cex?.zipPath).toBeDefined();
  });

  it('without GIIS_3DES_KEY_BASE64, completion throws ConflictException', async () => {
    const savedKey = process.env.GIIS_3DES_KEY_BASE64;
    delete process.env.GIIS_3DES_KEY_BASE64;

    const batch = await service.createBatch(proveedorId, '2025-03');

    await expect(
      service.generateBatchCex(batch._id.toString()),
    ).rejects.toThrow(/GIIS_3DES_KEY_BASE64/);

    process.env.GIIS_3DES_KEY_BASE64 = savedKey;
  });

  it('buildDeliverable (fallback) delegates to encryptAndZipArtifacts', async () => {
    const batch = await service.createBatch(proveedorId, '2025-04');
    await service.generateBatchCex(batch._id.toString());

    const built = await service.buildDeliverable(batch._id.toString());
    expect(built).toBeDefined();
    const cex = built!.artifacts?.find((a) => a.guide === 'CEX');
    expect(cex?.zipPath).toBeDefined();
  });
});
