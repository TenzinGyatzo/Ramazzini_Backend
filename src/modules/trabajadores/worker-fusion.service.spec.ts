import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkerFusionService } from './worker-fusion.service';
import { Trabajador } from './schemas/trabajador.schema';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { WorkerDuplicateAlert } from './schemas/worker-duplicate-alert.schema';
import { WorkerFusionHistory } from './schemas/worker-fusion-history.schema';
import { Consentimiento } from '../consentimientos/schemas/consentimiento.schema';
import { AuditService } from '../audit/audit.service';

describe('WorkerFusionService', () => {
  let service: WorkerFusionService;

  const mockTrabajadorModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockCentroTrabajoModel = {
    find: jest.fn(),
    findById: jest.fn(),
  };

  const mockDuplicateAlertModel = {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    exists: jest.fn(),
    updateMany: jest.fn(),
  };

  const mockFusionHistoryModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockConsentimientoModel = {
    find: jest.fn(),
    exists: jest.fn(),
    deleteOne: jest.fn(),
  };

  const mockConnection = {
    model: jest.fn(),
    startSession: jest.fn(),
  };

  const mockAuditService = {
    record: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerFusionService,
        { provide: getModelToken(Trabajador.name), useValue: mockTrabajadorModel },
        { provide: getModelToken(CentroTrabajo.name), useValue: mockCentroTrabajoModel },
        { provide: getModelToken(WorkerDuplicateAlert.name), useValue: mockDuplicateAlertModel },
        { provide: getModelToken(WorkerFusionHistory.name), useValue: mockFusionHistoryModel },
        { provide: getModelToken(Consentimiento.name), useValue: mockConsentimientoModel },
        { provide: getConnectionToken(), useValue: mockConnection },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<WorkerFusionService>(WorkerFusionService);
    jest.clearAllMocks();
    (service as any).clearCanonicalCache();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCanonicalTrabajadorId', () => {
    it('should return same id when worker has no idTrabajadorCanonico', async () => {
      const workerId = '507f1f77bcf86cd799439011';
      mockTrabajadorModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ _id: workerId }),
      });

      const result = await service.getCanonicalTrabajadorId(workerId);
      expect(result).toBe(workerId);
    });

    it('should return idTrabajadorCanonico when worker has it', async () => {
      const workerId = '507f1f77bcf86cd799439011';
      const canonicalId = '507f1f77bcf86cd799439012';
      mockTrabajadorModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: workerId,
          idTrabajadorCanonico: canonicalId,
        }),
      });

      const result = await service.getCanonicalTrabajadorId(workerId);
      expect(result).toBe(canonicalId);
    });

    it('reuses cache on second call (same id)', async () => {
      const workerId = '507f1f77bcf86cd799439011';
      const canonicalId = '507f1f77bcf86cd799439012';
      const exec = jest.fn().mockResolvedValue({
        _id: workerId,
        idTrabajadorCanonico: canonicalId,
      });
      mockTrabajadorModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec,
      });

      await expect(service.getCanonicalTrabajadorId(workerId)).resolves.toBe(
        canonicalId,
      );
      await expect(service.getCanonicalTrabajadorId(workerId)).resolves.toBe(
        canonicalId,
      );
      expect(exec).toHaveBeenCalledTimes(1);
    });

    it('dedupes concurrent lookups for the same id', async () => {
      const workerId = '507f1f77bcf86cd799439011';
      let resolveExec: (value: unknown) => void;
      const execPromise = new Promise((resolve) => {
        resolveExec = resolve;
      });
      const exec = jest.fn().mockReturnValue(execPromise);
      mockTrabajadorModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec,
      });

      const p1 = service.getCanonicalTrabajadorId(workerId);
      const p2 = service.getCanonicalTrabajadorId(workerId);
      resolveExec!({ _id: workerId });
      await expect(Promise.all([p1, p2])).resolves.toEqual([
        workerId,
        workerId,
      ]);
      expect(exec).toHaveBeenCalledTimes(1);
    });
  });

  describe('findDuplicateInEmpresa', () => {
    it('returns null when centro has no empresa', async () => {
      mockCentroTrabajoModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findDuplicateInEmpresa(
        { folio: 'ABC123456789012AB', idCentroTrabajo: '507f1f77bcf86cd799439088' } as any,
        '507f1f77bcf86cd799439088',
      );
      expect(result).toBeNull();
    });

    it('returns null when folio is missing and curp is generic', async () => {
      const result = await service.findDuplicateInEmpresa(
        { curp: 'XXXX999999XXXXXX99', idCentroTrabajo: '507f1f77bcf86cd799439088' } as any,
        '507f1f77bcf86cd799439088',
      );
      expect(result).toBeNull();
    });

    it('matches by real CURP with indexed findOne', async () => {
      const empresaId = '507f1f77bcf86cd799439099';
      const centroId = '507f1f77bcf86cd799439088';
      const existingId = '507f1f77bcf86cd799439012';
      const curp = 'GOML850101HDFNRR09';

      mockCentroTrabajoModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ idEmpresa: empresaId }),
      });
      mockCentroTrabajoModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: centroId }]),
      });
      mockTrabajadorModel.findOne
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnThis(),
          lean: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(null),
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnThis(),
          lean: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue({
            _id: existingId,
            nombre: 'Juan',
            primerApellido: 'Perez',
            curp,
            idCentroTrabajo: centroId,
          }),
        });

      const result = await service.findDuplicateInEmpresa(
        { folio: 'UNIQUEFOLIO123456', curp, idCentroTrabajo: centroId } as any,
        centroId,
      );

      expect(result).not.toBeNull();
      expect(result?.criterio).toBe('CURP');
      expect(result?.trabajadorId).toBe(existingId);
    });

    it('matches by folio with indexed findOne', async () => {
      const empresaId = '507f1f77bcf86cd799439099';
      const centroId = '507f1f77bcf86cd799439088';
      const existingId = '507f1f77bcf86cd799439012';
      const folio = 'ABC123456789012AB';

      mockCentroTrabajoModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ idEmpresa: empresaId }),
      });
      mockCentroTrabajoModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: centroId }]),
      });
      mockTrabajadorModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: existingId,
          nombre: 'Juan',
          primerApellido: 'Perez',
          folio,
          idCentroTrabajo: centroId,
        }),
      });

      const result = await service.findDuplicateInEmpresa(
        { folio, idCentroTrabajo: centroId } as any,
        centroId,
      );

      expect(result).not.toBeNull();
      expect(result?.criterio).toBe('FOLIO');
      expect(result?.trabajadorId).toBe(existingId);
      expect(result?.trabajador.folio).toBe(folio);
    });
  });

  describe('getFusionRedirect', () => {
    it('returns destinoId when fusion history exists', async () => {
      const fuenteId = '507f1f77bcf86cd799439011';
      const destinoId = '507f1f77bcf86cd799439012';
      mockFusionHistoryModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ destinoId }),
      });

      const result = await service.getFusionRedirect(fuenteId);
      expect(result).toBe(destinoId);
    });

    it('returns null when no fusion history', async () => {
      mockFusionHistoryModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getFusionRedirect('507f1f77bcf86cd799439011');
      expect(result).toBeNull();
    });
  });
});
