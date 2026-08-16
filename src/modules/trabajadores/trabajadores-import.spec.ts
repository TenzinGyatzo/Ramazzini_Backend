import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TrabajadoresService } from './trabajadores.service';
import { Trabajador } from './schemas/trabajador.schema';
import { NOM024ComplianceUtil } from '../../utils/nom024-compliance.util';
import { CatalogsService } from '../catalogs/catalogs.service';
import { FilesService } from '../files/files.service';
import { GeographyValidator } from '../catalogs/validators/geography.validator';
import {
  RegulatoryPolicy,
  RegulatoryPolicyService,
} from '../../utils/regulatory-policy.service';
import { WorkerFusionService } from './worker-fusion.service';
import { AuditService } from '../audit/audit.service';

describe('TrabajadoresService - importarTrabajadores', () => {
  let service: TrabajadoresService;
  let mockRegulatoryPolicyService: jest.Mocked<RegulatoryPolicyService>;

  const centroTrabajoId = '507f1f77bcf86cd799439011';
  const proveedorSaludId = '507f1f77bcf86cd799439055';
  const createdBy = '507f1f77bcf86cd799439012';

  const createMockModel = () => ({
    create: jest.fn(),
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
      exec: jest.fn().mockResolvedValue(null),
    }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
        exec: jest.fn().mockResolvedValue([]),
      }),
      lean: jest.fn().mockResolvedValue([]),
      exec: jest.fn().mockResolvedValue([]),
    }),
    findByIdAndUpdate: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
      exec: jest.fn().mockResolvedValue(null),
    }),
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
      exec: jest.fn().mockResolvedValue(null),
    }),
    save: jest.fn(),
    countDocuments: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    }),
  });

  const createSiresPolicy = (): RegulatoryPolicy => ({
    regime: 'SIRES_NOM024',
    features: {
      sessionTimeoutEnabled: true,
      enforceDocumentImmutabilityUI: true,
      documentImmutabilityEnabled: true,
      showSiresUI: true,
      giisExportEnabled: true,
      notaAclaratoriaEnabled: true,
      cluesFieldVisible: true,
      dailyConsentEnabled: true,
      confidentialityAgreementEnabled: true,
      workerIdentificationImmutable: true,
      auditTrailEnabled: true,
      controlPrenatalEnabled: false,
    },
    validation: {
      curpFirmantes: 'required',
      workerCurp: 'required_strict',
      cie10Principal: 'required',
      geoFields: 'required',
    },
  });

  const createSinRegimenPolicy = (): RegulatoryPolicy => ({
    regime: 'SIN_REGIMEN',
    features: {
      sessionTimeoutEnabled: false,
      enforceDocumentImmutabilityUI: false,
      documentImmutabilityEnabled: false,
      showSiresUI: false,
      giisExportEnabled: false,
      notaAclaratoriaEnabled: false,
      cluesFieldVisible: false,
      dailyConsentEnabled: false,
      confidentialityAgreementEnabled: false,
      workerIdentificationImmutable: false,
      auditTrailEnabled: false,
      controlPrenatalEnabled: true,
    },
    validation: {
      curpFirmantes: 'optional',
      workerCurp: 'optional',
      cie10Principal: 'optional',
      geoFields: 'optional',
    },
  });

  const baseSinRegimenRow = {
    primerApellido: 'GARCIA',
    nombre: 'JUAN',
    fechaNacimiento: new Date('1990-05-15'),
    sexo: 'Masculino',
    escolaridad: 'Licenciatura',
    puesto: 'Operador',
    estadoCivil: 'Soltero/a',
  };

  const baseSiresRow = {
    ...baseSinRegimenRow,
    curp: 'XXXX999999XXXXXX99',
    sexoCURP: 1,
    entidadNacimiento: '09',
    paisNacimiento: 142,
    entidadResidencia: '09',
    municipioResidencia: '015',
    localidadResidencia: '0001',
    paisResidencia: 142,
  };

  beforeEach(async () => {
    const mockNom024Util = {
      requiresNOM024Compliance: jest.fn().mockResolvedValue(true),
      getProveedorPais: jest.fn().mockResolvedValue('MX'),
    };

    const mockCatalogsService = {
      validateINEGI: jest.fn().mockResolvedValue(true),
      validateGIISPais: jest.fn().mockReturnValue({
        valid: true,
        catalogLoaded: true,
      }),
    };

    const mockGeographyValidator = {
      validateEntidad: jest.fn().mockResolvedValue(true),
      validateGeography: jest.fn().mockResolvedValue({ valid: true, errors: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrabajadoresService,
        { provide: getModelToken(Trabajador.name), useValue: createMockModel() },
        { provide: getModelToken('Antidoping'), useValue: createMockModel() },
        { provide: getModelToken('AptitudPuesto'), useValue: createMockModel() },
        { provide: getModelToken('Audiometria'), useValue: createMockModel() },
        { provide: getModelToken('Certificado'), useValue: createMockModel() },
        { provide: getModelToken('CertificadoExpedito'), useValue: createMockModel() },
        { provide: getModelToken('DocumentoExterno'), useValue: createMockModel() },
        { provide: getModelToken('ExamenVista'), useValue: createMockModel() },
        { provide: getModelToken('ExploracionFisica'), useValue: createMockModel() },
        { provide: getModelToken('HistoriaClinica'), useValue: createMockModel() },
        { provide: getModelToken('NotaMedica'), useValue: createMockModel() },
        { provide: getModelToken('NotaAclaratoria'), useValue: createMockModel() },
        { provide: getModelToken('ControlPrenatal'), useValue: createMockModel() },
        { provide: getModelToken('ConstanciaAptitud'), useValue: createMockModel() },
        { provide: getModelToken('Receta'), useValue: createMockModel() },
        { provide: getModelToken('EntrevistaPsicologica'), useValue: createMockModel() },
        { provide: getModelToken('TrastornosEstadoAnimo'), useValue: createMockModel() },
        { provide: getModelToken('CuestionarioProdromalBreve'), useValue: createMockModel() },
        { provide: getModelToken('TrastornoLimitePersonalidad'), useValue: createMockModel() },
        { provide: getModelToken('EventoSeguimientoCardiometabolico'), useValue: createMockModel() },
        { provide: getModelToken('InformeLongitudinalCardiometabolico'), useValue: createMockModel() },
        { provide: getModelToken('RiesgoTrabajo'), useValue: createMockModel() },
        { provide: getModelToken('ResultadoClinico'), useValue: createMockModel() },
        { provide: getModelToken('CentroTrabajo'), useValue: createMockModel() },
        { provide: getModelToken('User'), useValue: createMockModel() },
        { provide: getModelToken('Empresa'), useValue: createMockModel() },
        { provide: NOM024ComplianceUtil, useValue: mockNom024Util },
        { provide: CatalogsService, useValue: mockCatalogsService },
        { provide: FilesService, useValue: {} },
        { provide: GeographyValidator, useValue: mockGeographyValidator },
        {
          provide: RegulatoryPolicyService,
          useValue: (mockRegulatoryPolicyService = {
            getRegulatoryPolicy: jest.fn(),
          } as any),
        },
        {
          provide: WorkerFusionService,
          useValue: {
            findDuplicateInEmpresa: jest.fn().mockResolvedValue(null),
            getIdEmpresaFromCentro: jest.fn(),
            createDuplicateAlert: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TrabajadoresService>(TrabajadoresService);

    jest
      .spyOn(service as any, 'getProveedorSaludIdFromCentroTrabajo')
      .mockResolvedValue(proveedorSaludId);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('SIN_REGIMEN: importa fila básica sin geo ni CURP', async () => {
    mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
      createSinRegimenPolicy(),
    );

    const createSpy = jest.spyOn(service, 'create').mockResolvedValue({
      trabajador: { toObject: () => ({ _id: 'new-id', ...baseSinRegimenRow }) },
      posibleDuplicado: null,
    } as any);

    const result = await service.importarTrabajadores(
      [baseSinRegimenRow],
      centroTrabajoId,
      createdBy,
    );

    expect(result.successful).toBe(1);
    expect(result.failed).toBe(0);
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it('SIN_REGIMEN: importa fila sin primerApellido ni segundoApellido', async () => {
    mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
      createSinRegimenPolicy(),
    );

    const createSpy = jest.spyOn(service, 'create').mockResolvedValue({
      trabajador: {
        toObject: () => ({ _id: 'new-id', nombre: 'JUAN' }),
      },
      posibleDuplicado: null,
    } as any);

    const { primerApellido, ...sinApellidos } = baseSinRegimenRow;
    const result = await service.importarTrabajadores(
      [sinApellidos],
      centroTrabajoId,
      createdBy,
    );

    expect(result.successful).toBe(1);
    expect(result.failed).toBe(0);
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it('SIN_REGIMEN: rechaza segundoApellido sin primerApellido', async () => {
    mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
      createSinRegimenPolicy(),
    );

    const createSpy = jest.spyOn(service, 'create');

    const result = await service.importarTrabajadores(
      [
        {
          ...baseSinRegimenRow,
          primerApellido: '',
          segundoApellido: 'LOPEZ',
        },
      ],
      centroTrabajoId,
      createdBy,
    );

    expect(result.successful).toBe(0);
    expect(result.failed).toBe(1);
    expect(createSpy).not.toHaveBeenCalled();
    expect(result.data[0].validationErrors?.join(' ')).toMatch(
      /segundo apellido sin primer apellido/i,
    );
  });

  it('SIRES_NOM024: rechaza fila sin CURP antes de create', async () => {
    mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
      createSiresPolicy(),
    );

    const createSpy = jest.spyOn(service, 'create');

    const { entidadNacimiento, paisNacimiento, entidadResidencia, municipioResidencia, localidadResidencia, paisResidencia, curp, ...sinCurp } =
      baseSiresRow;

    const result = await service.importarTrabajadores(
      [sinCurp],
      centroTrabajoId,
      createdBy,
    );

    expect(result.successful).toBe(0);
    expect(result.failed).toBe(1);
    expect(createSpy).not.toHaveBeenCalled();
    expect(result.data[0].validationErrors?.join(' ')).toMatch(/curp/i);
  });

  it('SIRES_NOM024: importa fila completa con campos geo', async () => {
    mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
      createSiresPolicy(),
    );

    const createSpy = jest.spyOn(service, 'create').mockImplementation(async (dto: any) => ({
      trabajador: { toObject: () => ({ _id: 'new-id', ...dto }) },
      posibleDuplicado: null,
    }));

    const result = await service.importarTrabajadores(
      [baseSiresRow],
      centroTrabajoId,
      createdBy,
    );

    expect(result.successful).toBe(1);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        curp: 'XXXX999999XXXXXX99',
        entidadNacimiento: '09',
        paisNacimiento: 142,
        entidadResidencia: '09',
        municipioResidencia: '015',
        localidadResidencia: '0001',
        paisResidencia: 142,
      }),
    );
  });

  it('SIRES_NOM024: mapea columnas geo con alias en español', async () => {
    mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
      createSiresPolicy(),
    );

    const createSpy = jest.spyOn(service, 'create').mockImplementation(async (dto: any) => ({
      trabajador: { toObject: () => ({ _id: 'new-id', ...dto }) },
      posibleDuplicado: null,
    }));

    const rowWithSpanishHeaders = {
      ...baseSinRegimenRow,
      curp: 'XXXX999999XXXXXX99',
      sexoCURP: 2,
      'Entidad Nacimiento': '09',
      'País de nacimiento': 142,
      'Entidad Residencia': '09',
      'Municipio Residencia': '015',
      'Localidad Residencia': '0001',
      'País de residencia': 142,
    };

    const result = await service.importarTrabajadores(
      [rowWithSpanishHeaders],
      centroTrabajoId,
      createdBy,
    );

    expect(result.successful).toBe(1);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entidadNacimiento: '09',
        paisNacimiento: 142,
        entidadResidencia: '09',
        sexoCURP: 2,
      }),
    );
  });

  it('SIRES_NOM024: normaliza columna Sexo CURP en import', async () => {
    mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
      createSiresPolicy(),
    );

    const createSpy = jest.spyOn(service, 'create').mockImplementation(async (dto: any) => ({
      trabajador: { toObject: () => ({ _id: 'new-id', ...dto }) },
      posibleDuplicado: null,
    }));

    const row = {
      ...baseSiresRow,
      sexoCURP: undefined,
      'Sexo CURP': 'No binario',
    };

    const result = await service.importarTrabajadores(
      [row],
      centroTrabajoId,
      createdBy,
    );

    expect(result.successful).toBe(1);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ sexoCURP: 3 }),
    );
  });

  it('SIRES_NOM024: rechaza CURP inválida antes de create', async () => {
    mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
      createSiresPolicy(),
    );

    const createSpy = jest.spyOn(service, 'create');

    const result = await service.importarTrabajadores(
      [{ ...baseSiresRow, curp: 'INVALIDA' }],
      centroTrabajoId,
      createdBy,
    );

    expect(result.successful).toBe(0);
    expect(result.failed).toBe(1);
    expect(createSpy).not.toHaveBeenCalled();
    expect(result.data[0].validationErrors?.join(' ')).toMatch(/CURP/i);
  });
});
