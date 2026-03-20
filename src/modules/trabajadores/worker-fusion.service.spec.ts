import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import { WorkerFusionService } from './worker-fusion.service';
import { Trabajador } from './schemas/trabajador.schema';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { CreateTrabajadorDto } from './dto/create-trabajador.dto';

describe('WorkerFusionService', () => {
  let service: WorkerFusionService;
  let trabajadorModel: Model<Trabajador>;
  let centroTrabajoModel: Model<CentroTrabajo>;

  const mockTrabajadorModel = {
    find: jest.fn(),
    findById: jest.fn(),
  };

  const mockCentroTrabajoModel = {
    find: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerFusionService,
        {
          provide: getModelToken(Trabajador.name),
          useValue: mockTrabajadorModel,
        },
        {
          provide: getModelToken(CentroTrabajo.name),
          useValue: mockCentroTrabajoModel,
        },
      ],
    }).compile();

    service = module.get<WorkerFusionService>(WorkerFusionService);
    trabajadorModel = module.get<Model<Trabajador>>(
      getModelToken(Trabajador.name),
    );
    centroTrabajoModel = module.get<Model<CentroTrabajo>>(
      getModelToken(CentroTrabajo.name),
    );

    jest.clearAllMocks();
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

    it('should return given id when worker not found', async () => {
      mockTrabajadorModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getCanonicalTrabajadorId(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toBe('507f1f77bcf86cd799439011');
    });
  });

  describe('findDuplicateInEmpresa', () => {
    it('should return null when centro has no idEmpresa', async () => {
      mockCentroTrabajoModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findDuplicateInEmpresa(
        {} as CreateTrabajadorDto,
        '507f1f77bcf86cd799439011',
      );
      expect(result).toBeNull();
    });
  });
});
