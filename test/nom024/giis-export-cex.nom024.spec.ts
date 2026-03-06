/**
 * NOM-024 GIIS Export CEX integration (Phase 1 — 1C)
 * Create batch, generate CEX from 1 NotaMedica (consulta externa) fixture, verify file and batch.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
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
import { DocumentoEstado } from '../../src/modules/expedientes/enums/documento-estado.enum';
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
import { GiisValidationService } from '../../src/modules/giis-export/validation/giis-validation.service';
import { GiisCryptoService } from '../../src/modules/giis-export/crypto/giis-crypto.service';
import { DgisCifradoService } from '../../src/modules/giis-export/crypto/dgis-cifrado.service';
import { GiisExportAuditService } from '../../src/modules/giis-export/giis-export-audit.service';
import { FirmanteHelper } from '../../src/modules/expedientes/helpers/firmante-helper';
import { CatalogsService } from '../../src/modules/catalogs/catalogs.service';
import { validNotaMedicaCex } from '../fixtures/nota-medica.fixtures';

const mockGiisValidationService = {
  validateAndFilterRows: jest
    .fn()
    .mockImplementation(async (_g: string, rows: any[]) => ({
      validRows: rows,
      excludedReport: { entries: [], totalExcluded: 0 },
      warnings: [],
    })),
};
import { validMXTrabajador } from '../fixtures/trabajador.fixtures';
import {
  mapNotaMedicaToCexRow,
  getCexSchema,
  extractCieCode,
  isCodigoTuberculosisPulmonar,
} from '../../src/modules/giis-export/transformers/cex.mapper';

describe('NOM-024 GIIS Export CEX (Phase 1C)', () => {
  let service: GiisBatchService;
  let notaMedicaModel: any;
  let trabajadorModel: any;
  let testingModule: TestingModule;
  let mongoUri: string;
  const proveedorId = new Types.ObjectId().toString();
  const yearMonth = '2025-01';

  beforeAll(async () => {
    mongoUri = await startMongoMemoryServer();
    process.env.GIIS_3DES_KEY_BASE64 =
      process.env.GIIS_3DES_KEY_BASE64 ||
      Buffer.alloc(24, 0x01).toString('base64');
    testingModule = await Test.createTestingModule({
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
        { provide: ProveedoresSaludService, useValue: { findOne: jest.fn() } },
        { provide: GiisValidationService, useValue: mockGiisValidationService },
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
    service = testingModule.get<GiisBatchService>(GiisBatchService);
    notaMedicaModel = testingModule.get('NotaMedicaModel');
    trabajadorModel = testingModule.get('TrabajadorModel');
  }, 30000);

  afterAll(async () => {
    delete process.env.GIIS_3DES_KEY_BASE64;
    await stopMongoMemoryServer();
  }, 10000);

  it('should create batch, generate CEX with 1 consulta externa, and produce valid TXT', async () => {
    const empresaModel = testingModule.get('EmpresaModel');
    const centroTrabajoModel = testingModule.get('CentroTrabajoModel');
    const createdBy = new Types.ObjectId();

    const empresa = await empresaModel.create({
      nombreComercial: 'Test SA',
      razonSocial: 'Test SA',
      RFC: 'TST123456ABC',
      idProveedorSalud: proveedorId,
      createdBy,
      updatedBy: createdBy,
    });
    const centro = await centroTrabajoModel.create({
      nombreCentro: 'Centro 1',
      idEmpresa: empresa._id,
      createdBy,
      updatedBy: createdBy,
    });

    const batch = await service.createBatch(proveedorId, yearMonth);
    const batchId = batch._id.toString();

    const trabajador = await trabajadorModel.create({
      ...validMXTrabajador,
      _id: validNotaMedicaCex.idTrabajador,
      escolaridad: 'Licenciatura',
      puesto: 'OPERADOR',
      estadoCivil: 'Soltero/a',
      estadoLaboral: 'Activo',
      idCentroTrabajo: centro._id,
      createdBy,
      updatedBy: createdBy,
    });

    await notaMedicaModel.create({
      ...validNotaMedicaCex,
      _id: new Types.ObjectId(),
      fechaNotaMedica: new Date('2025-01-15'),
      idTrabajador: trabajador._id,
      estado: DocumentoEstado.FINALIZADO,
    });

    const updated = await service.generateBatchCex(batchId);
    expect(updated).toBeDefined();
    expect(updated!.artifacts).toBeDefined();
    const cexArtifact = updated!.artifacts?.find((a) => a.guide === 'CEX');
    expect(cexArtifact).toBeDefined();
    expect(cexArtifact!.guide).toBe('CEX');
    expect(cexArtifact!.rowCount).toBe(1);

    const relativePath = cexArtifact!.path;
    const fullPath = path.join(process.cwd(), relativePath);
    expect(fs.existsSync(fullPath)).toBe(true);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    const headerLine = lines[0];
    const dataLine = lines[1];
    expect(headerLine).toContain('clues');
    expect(headerLine).toContain('fechaConsulta');
    const delimiter = '|';
    const dataCols = dataLine.split(delimiter);
    expect(dataCols.length).toBe(106);
  });
});

describe('CEX mapper unit', () => {
  it('should output 106 keys from schema and include clues and required fields', () => {
    const schema = getCexSchema();
    expect(schema.fields.length).toBe(106);

    const consulta = {
      fechaNotaMedica: new Date('2025-01-15'),
      codigoCIE10Principal: 'Z00 - EXAMEN GENERAL',
      relacionTemporal: 0,
    };
    const trabajador = {
      curp: 'PEGJ850102HDFRNN08',
      nombre: 'JUAN',
      primerApellido: 'PEREZ',
      segundoApellido: 'GONZALEZ',
      fechaNacimiento: new Date('1985-01-02'),
      sexo: 'Masculino',
      entidadNacimiento: '09',
    };
    const row = mapNotaMedicaToCexRow(
      consulta,
      { clues: 'DFSSA001234' },
      trabajador,
    );

    expect(Object.keys(row).length).toBe(106);
    expect(row.clues).toBe('DFSSA001234');
    expect(row.curpPaciente).toBe('PEGJ850102HDFRNN08');
    expect(row.fechaConsulta).toBe('15/01/2025');
    expect(row.codigoCIEDiagnostico1).toBe('Z00');
  });

  it('should extract CIE code from "CODE - DESCRIPTION" format', () => {
    expect(extractCieCode('A30 - LEPRA')).toBe('A30');
    expect(extractCieCode('R69X')).toBe('R69X');
    expect(extractCieCode('')).toBe('');
    expect(extractCieCode(undefined)).toBe('');
  });

  describe('isCodigoTuberculosisPulmonar', () => {
    it('should return true for pulmonary TB codes with or without dot', () => {
      expect(isCodigoTuberculosisPulmonar('A15.0')).toBe(true);
      expect(isCodigoTuberculosisPulmonar('A150')).toBe(true);
      expect(isCodigoTuberculosisPulmonar('A162')).toBe(true);
      expect(isCodigoTuberculosisPulmonar('A16.2')).toBe(true);
      expect(isCodigoTuberculosisPulmonar('a15.1')).toBe(true);
    });
    it('should return false for non-TB or other TB codes', () => {
      expect(isCodigoTuberculosisPulmonar('A15')).toBe(false);
      expect(isCodigoTuberculosisPulmonar('A169')).toBe(false);
      expect(isCodigoTuberculosisPulmonar('J00')).toBe(false);
      expect(isCodigoTuberculosisPulmonar('')).toBe(false);
      expect(isCodigoTuberculosisPulmonar(undefined)).toBe(false);
    });
  });

  describe('sintomaticoRespiratorioTb', () => {
    const context = { clues: 'DFSSA001234' };
    const trabajador = {
      curp: 'PEGJ850102HDFRNN08',
      nombre: 'JUAN',
      primerApellido: 'PEREZ',
      segundoApellido: 'GONZALEZ',
      fechaNacimiento: new Date('1985-01-02'),
      sexo: 'Masculino',
      entidadNacimiento: '09',
    };
    const prestadorTipo2 = { curp: 'X', nombre: 'Dr X', tipoPersonal: 2 };
    const prestadorTipo15 = { curp: 'X', nombre: 'Psic X', tipoPersonal: 15 };
    const prestadorTipo16 = { curp: 'X', nombre: 'Psic X', tipoPersonal: 16 };

    it('should be 1 when tipoPersonal 2 and principal code is pulmonary TB (A150)', () => {
      const consulta = {
        fechaNotaMedica: new Date('2025-01-15'),
        codigoCIE10Principal: 'A150',
        relacionTemporal: 0,
      };
      const row = mapNotaMedicaToCexRow(
        consulta,
        context,
        trabajador,
        prestadorTipo2,
      );
      expect(row.sintomaticoRespiratorioTb).toBe(1);
    });

    it('should be 1 when tipoPersonal 2 and principal code is A15.0 format', () => {
      const consulta = {
        fechaNotaMedica: new Date('2025-01-15'),
        codigoCIE10Principal: 'A15.0 - Tuberculosis respiratoria',
        relacionTemporal: 0,
      };
      const row = mapNotaMedicaToCexRow(
        consulta,
        context,
        trabajador,
        prestadorTipo2,
      );
      expect(row.sintomaticoRespiratorioTb).toBe(1);
    });

    it('should be 1 when tipoPersonal 2 and TB code is in complementarios only', () => {
      const consulta = {
        fechaNotaMedica: new Date('2025-01-15'),
        codigoCIE10Principal: 'Z00',
        codigosCIE10Complementarios: ['J00', 'A161 - TB pulmonar'],
        relacionTemporal: 0,
      };
      const row = mapNotaMedicaToCexRow(
        consulta,
        context,
        trabajador,
        prestadorTipo2,
      );
      expect(row.sintomaticoRespiratorioTb).toBe(1);
    });

    it('should be 1 when tipoPersonal 2 and TB code is in codigoCIEDiagnostico2', () => {
      const consulta = {
        fechaNotaMedica: new Date('2025-01-15'),
        codigoCIE10Principal: 'J00',
        codigoCIEDiagnostico2: 'A161',
        relacionTemporal: 0,
      };
      const row = mapNotaMedicaToCexRow(
        consulta,
        context,
        trabajador,
        prestadorTipo2,
      );
      expect(row.sintomaticoRespiratorioTb).toBe(1);
    });

    it('should be 0 when tipoPersonal 2 and no TB code', () => {
      const consulta = {
        fechaNotaMedica: new Date('2025-01-15'),
        codigoCIE10Principal: 'J00',
        relacionTemporal: 0,
      };
      const row = mapNotaMedicaToCexRow(
        consulta,
        context,
        trabajador,
        prestadorTipo2,
      );
      expect(row.sintomaticoRespiratorioTb).toBe(0);
    });

    it('should be -1 when tipoPersonal 15 even with TB code', () => {
      const consulta = {
        fechaNotaMedica: new Date('2025-01-15'),
        codigoCIE10Principal: 'A150',
        relacionTemporal: 0,
      };
      const row = mapNotaMedicaToCexRow(
        consulta,
        context,
        trabajador,
        prestadorTipo15,
      );
      expect(row.sintomaticoRespiratorioTb).toBe(-1);
    });

    it('should be -1 when tipoPersonal 16 even with TB code', () => {
      const consulta = {
        fechaNotaMedica: new Date('2025-01-15'),
        codigoCIE10Principal: 'A150',
        relacionTemporal: 0,
      };
      const row = mapNotaMedicaToCexRow(
        consulta,
        context,
        trabajador,
        prestadorTipo16,
      );
      expect(row.sintomaticoRespiratorioTb).toBe(-1);
    });
  });
});
