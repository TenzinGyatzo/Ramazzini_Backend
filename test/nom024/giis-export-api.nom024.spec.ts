/**
 * NOM-024 GIIS Export API (Phase 1 — 1E)
 * POST batches, GET batch status, GET download; gate SIRES_NOM024.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import {
  startMongoMemoryServer,
  stopMongoMemoryServer,
} from '../utils/mongodb-memory.util';
import { GiisExportController } from '../../src/modules/giis-export/giis-export.controller';
import { GiisBatchService } from '../../src/modules/giis-export/giis-batch.service';
import { GiisSerializerService } from '../../src/modules/giis-export/giis-serializer.service';
import {
  GiisBatch,
  GiisBatchSchema,
} from '../../src/modules/giis-export/schemas/giis-batch.schema';
import {
  NotaMedica,
  NotaMedicaSchema,
} from '../../src/modules/expedientes/schemas/nota-medica.schema';
import {
  Lesion,
  LesionSchema,
} from '../../src/modules/expedientes/schemas/lesion.schema';
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
import { AuditService } from '../../src/modules/audit/audit.service';
import { ProveedoresSaludService } from '../../src/modules/proveedores-salud/proveedores-salud.service';
import { UsersService } from '../../src/modules/users/users.service';
import { GiisValidationService } from '../../src/modules/giis-export/validation/giis-validation.service';
import { GiisCryptoService } from '../../src/modules/giis-export/crypto/giis-crypto.service';
import { GiisExportAuditService } from '../../src/modules/giis-export/giis-export-audit.service';
import { FirmanteHelper } from '../../src/modules/expedientes/helpers/firmante-helper';
import { CatalogsService } from '../../src/modules/catalogs/catalogs.service';

const mockGiisValidationService = {
  validateAndFilterRows: jest
    .fn()
    .mockImplementation(async (_g: string, rows: any[]) => ({
      validRows: rows,
      excludedReport: { entries: [], totalExcluded: 0 },
      warnings: [],
    })),
  preValidate: jest.fn().mockResolvedValue({ errors: [], totalRows: 0 }),
};

describe('NOM-024 GIIS Export API (Phase 1E)', () => {
  let app: INestApplication;
  let giisBatchService: GiisBatchService;
  let usersService: UsersService;
  let proveedorSaludModel: any;
  let userModel: any;
  let testingModule: TestingModule;
  let mongoUri: string;
  const proveedorId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  beforeAll(async () => {
    mongoUri = await startMongoMemoryServer();
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.GIIS_3DES_KEY_BASE64 =
      process.env.GIIS_3DES_KEY_BASE64 || Buffer.alloc(24, 0x01).toString('base64');

    const policySires = {
      getRegulatoryPolicy: jest
        .fn()
        .mockResolvedValue({ regime: 'SIRES_NOM024' }),
    };
    const policySinRegimen = {
      getRegulatoryPolicy: jest
        .fn()
        .mockResolvedValue({ regime: 'SIN_REGIMEN' }),
    };

    testingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: GiisBatch.name, schema: GiisBatchSchema },
          { name: NotaMedica.name, schema: NotaMedicaSchema },
          { name: Lesion.name, schema: LesionSchema },
          { name: Trabajador.name, schema: TrabajadorSchema },
          { name: CentroTrabajo.name, schema: CentroTrabajoSchema },
          { name: Empresa.name, schema: EmpresaSchema },
        ]),
      ],
      controllers: [GiisExportController],
      providers: [
        GiisBatchService,
        GiisSerializerService,
        { provide: RegulatoryPolicyService, useValue: policySires },
        {
          provide: ProveedoresSaludService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({ clues: 'DFSSA001234' }),
          },
        },
        { provide: GiisValidationService, useValue: mockGiisValidationService },
        GiisCryptoService,
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
            getFirmanteDataForLes: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: CatalogsService,
          useValue: { getPaisCatalogKeyFromNacionalidad: jest.fn().mockReturnValue(142) },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockImplementation((id: string) => {
              if (id === userId)
                return Promise.resolve({ idProveedorSalud: proveedorId });
              return Promise.resolve(null);
            }),
          },
        },
      ],
    }).compile();

    app = testingModule.createNestApplication();
    await app.init();

    giisBatchService = testingModule.get<GiisBatchService>(GiisBatchService);
  }, 30000);

  afterAll(async () => {
    await app?.close();
    await stopMongoMemoryServer();
  }, 10000);

  function tokenForUser(uid: string): string {
    return jwt.sign({ id: uid }, process.env.JWT_SECRET!);
  }

  it('POST /api/giis-export/batches with SIRES → 201 and batchId', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/giis-export/batches')
      .set('Authorization', `Bearer ${tokenForUser(userId)}`)
      .send({ yearMonth: '2025-01' })
      .expect(201);

    expect(res.body.batchId).toBeDefined();
    expect(res.body.status).toBeDefined();
    expect(res.body.yearMonth).toBe('2025-01');
  });

  it('GET /giis-export/batches/:batchId → 200 and artifacts', async () => {
    const batch = await giisBatchService.createBatchForExport(
      proveedorId,
      '2025-01',
    );
    await giisBatchService.generateBatchCex(batch._id.toString());
    await giisBatchService.generateBatchLes(batch._id.toString());

    const res = await request(app.getHttpServer())
      .get(`/api/giis-export/batches/${batch._id.toString()}`)
      .set('Authorization', `Bearer ${tokenForUser(userId)}`)
      .expect(200);

    expect(res.body.status).toBe('completed');
    expect(Array.isArray(res.body.artifacts)).toBe(true);
    const cex = res.body.artifacts.find((a: any) => a.guide === 'CEX');
    const les = res.body.artifacts.find((a: any) => a.guide === 'LES');
    expect(cex).toBeDefined();
    expect(les).toBeDefined();
  });

  it('GET /giis-export/batches/:batchId/download/CEX → 200 and header line', async () => {
    const batch = await giisBatchService.createBatchForExport(
      proveedorId,
      '2025-01',
    );
    await giisBatchService.generateBatchCex(batch._id.toString());

    const res = await request(app.getHttpServer())
      .get(`/api/giis-export/batches/${batch._id.toString()}/download/CEX`)
      .set('Authorization', `Bearer ${tokenForUser(userId)}`)
      .expect(200);

    const firstLine = res.text.split('\n')[0];
    expect(firstLine).toContain('clues');
  });

  it('GET /giis-export/batches/:batchId/download-deliverable/:guide → 200 and ZIP with Content-Disposition', async () => {
    const batch = await giisBatchService.createBatchForExport(
      proveedorId,
      '2025-02',
    );
    await giisBatchService.generateBatchCex(batch._id.toString());
    await giisBatchService.generateBatchLes(batch._id.toString());

    const res = await request(app.getHttpServer())
      .get(
        `/api/giis-export/batches/${batch._id.toString()}/download-deliverable/CEX`,
      )
      .set('Authorization', `Bearer ${tokenForUser(userId)}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('application/zip');
    expect(res.headers['content-disposition']).toBeDefined();
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('.ZIP');
    expect(Buffer.isBuffer(res.body) || typeof res.body === 'object').toBe(true);
  });
});

describe('GIIS Export gate SIRES', () => {
  let service: GiisBatchService;
  let mongoUri: string;
  const proveedorId = new Types.ObjectId().toString();

  beforeAll(async () => {
    mongoUri = await startMongoMemoryServer();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: GiisBatch.name, schema: GiisBatchSchema },
          { name: NotaMedica.name, schema: NotaMedicaSchema },
          { name: Lesion.name, schema: LesionSchema },
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
          useValue: {
            getRegulatoryPolicy: jest
              .fn()
              .mockResolvedValue({ regime: 'SIN_REGIMEN' }),
          },
        },
        { provide: ProveedoresSaludService, useValue: { findOne: jest.fn() } },
        { provide: GiisValidationService, useValue: mockGiisValidationService },
        { provide: GiisCryptoService, useValue: {} },
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
            getFirmanteDataForLes: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: CatalogsService,
          useValue: { getPaisCatalogKeyFromNacionalidad: jest.fn().mockReturnValue(142) },
        },
      ],
    }).compile();
    service = module.get<GiisBatchService>(GiisBatchService);
  }, 30000);

  afterAll(async () => {
    await stopMongoMemoryServer();
  }, 10000);

  it('createBatchForExport with SIN_REGIMEN → 403', async () => {
    await expect(
      service.createBatchForExport(proveedorId, '2025-01'),
    ).rejects.toThrow('SIRES_NOM024');
  });
});
