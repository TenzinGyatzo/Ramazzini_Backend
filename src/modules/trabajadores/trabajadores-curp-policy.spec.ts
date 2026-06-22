import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TrabajadoresService } from './trabajadores.service';
import { Trabajador } from './schemas/trabajador.schema';
import { NOM024ComplianceUtil } from '../../utils/nom024-compliance.util';
import { CatalogsService } from '../catalogs/catalogs.service';
import { FilesService } from '../files/files.service';
import { GeographyValidator } from '../catalogs/validators/geography.validator';
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';
import { WorkerFusionService } from './worker-fusion.service';

describe('TrabajadoresService - CURP by country and regime', () => {
  let service: TrabajadoresService;
  let mockNom024Util: { getProveedorPais: jest.Mock };
  let mockRegulatoryPolicyService: { getRegulatoryPolicy: jest.Mock };

  const createMockModel = () => ({
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
      exec: jest.fn().mockResolvedValue(null),
    }),
  });

  beforeEach(async () => {
    mockNom024Util = {
      getProveedorPais: jest.fn().mockResolvedValue('MX'),
    };

    mockRegulatoryPolicyService = {
      getRegulatoryPolicy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrabajadoresService,
        {
          provide: getModelToken(Trabajador.name),
          useValue: createMockModel(),
        },
        { provide: getModelToken('Antidoping'), useValue: createMockModel() },
        { provide: getModelToken('AptitudPuesto'), useValue: createMockModel() },
        { provide: getModelToken('Audiometria'), useValue: createMockModel() },
        { provide: getModelToken('Certificado'), useValue: createMockModel() },
        {
          provide: getModelToken('CertificadoExpedito'),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken('DocumentoExterno'),
          useValue: createMockModel(),
        },
        { provide: getModelToken('ExamenVista'), useValue: createMockModel() },
        {
          provide: getModelToken('ExploracionFisica'),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken('HistoriaClinica'),
          useValue: createMockModel(),
        },
        { provide: getModelToken('NotaMedica'), useValue: createMockModel() },
        {
          provide: getModelToken('NotaAclaratoria'),
          useValue: createMockModel(),
        },
        { provide: getModelToken('Receta'), useValue: createMockModel() },
        {
          provide: getModelToken('ControlPrenatal'),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken('ConstanciaAptitud'),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken('EntrevistaPsicologica'),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken('TrastornosEstadoAnimo'),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken('CuestionarioProdromalBreve'),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken('TrastornoLimitePersonalidad'),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken('EventoSeguimientoCardiometabolico'),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken('InformeLongitudinalCardiometabolico'),
          useValue: createMockModel(),
        },
        { provide: getModelToken('RiesgoTrabajo'), useValue: createMockModel() },
        {
          provide: getModelToken('ResultadoClinico'),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken('CentroTrabajo'),
          useValue: createMockModel(),
        },
        { provide: getModelToken('User'), useValue: createMockModel() },
        { provide: getModelToken('Empresa'), useValue: createMockModel() },
        { provide: NOM024ComplianceUtil, useValue: mockNom024Util },
        {
          provide: CatalogsService,
          useValue: { validateINEGI: jest.fn(), validateGIISPais: jest.fn() },
        },
        {
          provide: FilesService,
          useValue: { uploadFile: jest.fn(), deleteFile: jest.fn() },
        },
        {
          provide: GeographyValidator,
          useValue: { validateGeography: jest.fn() },
        },
        {
          provide: RegulatoryPolicyService,
          useValue: mockRegulatoryPolicyService,
        },
        {
          provide: WorkerFusionService,
          useValue: {
            findDuplicateInEmpresa: jest.fn().mockResolvedValue(null),
            getIdEmpresaFromCentro: jest.fn(),
            createDuplicateAlert: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TrabajadoresService);
  });

  it('omite validación CURP para proveedores no-MX', async () => {
    mockNom024Util.getProveedorPais.mockResolvedValue('GT');

    await expect(
      (service as any).validateCURPForMX('1234567890123', '507f1f77bcf86cd799439077'),
    ).resolves.toBeUndefined();

    expect(mockRegulatoryPolicyService.getRegulatoryPolicy).not.toHaveBeenCalled();
  });

  it('permite crear trabajador GT con DPI sin validar RENAPO', async () => {
    const gtProveedorId = '507f1f77bcf86cd799439077';
    const centroTrabajoId = '507f1f77bcf86cd799439011';

    mockNom024Util.getProveedorPais.mockResolvedValue('GT');
    mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue({
      regime: 'SIN_REGIMEN',
      validation: { workerCurp: 'optional' },
    });

    jest
      .spyOn(service as any, 'getProveedorSaludIdFromCentroTrabajo')
      .mockResolvedValue(gtProveedorId);
    jest
      .spyOn(service as any, 'validateGeographyHierarchy')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'validateNOM024NameFormat')
      .mockResolvedValue(undefined);

    const mockSave = jest.fn().mockResolvedValue({ _id: 'new-id' });
    (service as any).trabajadorModel = jest
      .fn()
      .mockImplementation((data: unknown) => ({ ...(data as object), save: mockSave }));

    const result = await service.create({
      primerApellido: 'López',
      nombre: 'María',
      fechaNacimiento: new Date('1990-01-01'),
      sexo: 'Femenino',
      escolaridad: 'Licenciatura',
      puesto: 'Operador',
      estadoCivil: 'Soltero/a',
      estadoLaboral: 'Activo',
      idCentroTrabajo: centroTrabajoId,
      createdBy: '507f1f77bcf86cd799439012',
      updatedBy: '507f1f77bcf86cd799439012',
      curp: '1234567890123',
    } as any);

    expect(result).toBeDefined();
    expect(mockSave).toHaveBeenCalled();
  });

  it('acepta identificador local corto (p. ej. AEEFAE) para GT', async () => {
    const gtProveedorId = '507f1f77bcf86cd799439077';
    const centroTrabajoId = '507f1f77bcf86cd799439011';

    mockNom024Util.getProveedorPais.mockResolvedValue('GT');
    mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue({
      regime: 'SIN_REGIMEN',
      validation: { workerCurp: 'optional', geoFields: 'optional' },
    });

    jest
      .spyOn(service as any, 'getProveedorSaludIdFromCentroTrabajo')
      .mockResolvedValue(gtProveedorId);
    jest
      .spyOn(service as any, 'validateGeographyHierarchy')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'validateNOM024NameFormat')
      .mockResolvedValue(undefined);

    const mockSave = jest.fn().mockResolvedValue({ _id: 'new-id' });
    (service as any).trabajadorModel = jest
      .fn()
      .mockImplementation((data: unknown) => ({ ...(data as object), save: mockSave }));

    const result = await service.create({
      primerApellido: 'López',
      nombre: 'María',
      fechaNacimiento: new Date('1990-01-01'),
      sexo: 'Femenino',
      escolaridad: 'Licenciatura',
      puesto: 'Operador',
      estadoCivil: 'Soltero/a',
      estadoLaboral: 'Activo',
      idCentroTrabajo: centroTrabajoId,
      createdBy: '507f1f77bcf86cd799439012',
      updatedBy: '507f1f77bcf86cd799439012',
      curp: 'AEEFAE',
    } as any);

    expect(result).toBeDefined();
    expect(mockSave).toHaveBeenCalled();
  });
});
