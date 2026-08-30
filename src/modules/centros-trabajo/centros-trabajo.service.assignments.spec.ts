import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CentrosTrabajoService } from './centros-trabajo.service';
import { CentroTrabajo } from './schemas/centro-trabajo.schema';
import { GeographyValidator } from '../catalogs/validators/geography.validator';
import { TrabajadoresService } from '../trabajadores/trabajadores.service';
import { Empresa } from '../empresas/schemas/empresa.schema';
import { AuditService } from '../audit/audit.service';
import { DeletionCascadeService } from 'src/utils/services/deletion-cascade.service';
import { RegulatoryPolicyService } from 'src/utils/regulatory-policy.service';

const PROV_A = '507f1f77bcf86cd799439011';
const EMPRESA_A = '507f1f77bcf86cd799439021';
const EMPRESA_B = '507f1f77bcf86cd799439022';
const CENTRO_A = '507f1f77bcf86cd799439031';
const CENTRO_B = '507f1f77bcf86cd799439032';
const USER_ID = '507f1f77bcf86cd799439041';

describe('CentrosTrabajoService — findByUserAssignments (alcance por proveedor)', () => {
  let service: CentrosTrabajoService;
  let userModel: { findById: jest.Mock };
  let empresaModel: { find: jest.Mock };
  let centroTrabajoModel: { find: jest.Mock };

  const createMockModel = () => ({
    create: jest.fn(),
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
      exec: jest.fn().mockResolvedValue(null),
    }),
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
      exec: jest.fn().mockResolvedValue([]),
    }),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    countDocuments: jest.fn(),
    db: { startSession: jest.fn() },
  });

  beforeEach(async () => {
    userModel = createMockModel();
    empresaModel = createMockModel();
    centroTrabajoModel = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CentrosTrabajoService,
        { provide: getModelToken(CentroTrabajo.name), useValue: centroTrabajoModel },
        { provide: getModelToken('Trabajador'), useValue: createMockModel() },
        { provide: getModelToken('Antidoping'), useValue: createMockModel() },
        { provide: getModelToken('AptitudPuesto'), useValue: createMockModel() },
        { provide: getModelToken('Certificado'), useValue: createMockModel() },
        { provide: getModelToken('DocumentoExterno'), useValue: createMockModel() },
        { provide: getModelToken('ExamenVista'), useValue: createMockModel() },
        { provide: getModelToken('ExploracionFisica'), useValue: createMockModel() },
        { provide: getModelToken('HistoriaClinica'), useValue: createMockModel() },
        { provide: getModelToken('NotaMedica'), useValue: createMockModel() },
        { provide: getModelToken('User'), useValue: userModel },
        { provide: getModelToken(Empresa.name), useValue: empresaModel },
        { provide: TrabajadoresService, useValue: { remove: jest.fn() } },
        {
          provide: GeographyValidator,
          useValue: { validateGeography: jest.fn() },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
        {
          provide: DeletionCascadeService,
          useValue: { countResguardedDocsByCentro: jest.fn() },
        },
        {
          provide: RegulatoryPolicyService,
          useValue: { getRegulatoryPolicy: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(CentrosTrabajoService);
  });

  function mockUser(user: Record<string, unknown> | null) {
    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(user),
    });
  }

  function mockEmpresasDelProveedor(ids: string[]) {
    empresaModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(ids.map((_id) => ({ _id }))),
        }),
      }),
    });
  }

  it('self-read restringido devuelve únicamente centros asignados del proveedor', async () => {
    mockUser({
      _id: USER_ID,
      role: 'Médico',
      idProveedorSalud: PROV_A,
      centrosTrabajoAsignados: [CENTRO_A],
      permisos: { accesoCompletoEmpresasCentros: false },
    });
    mockEmpresasDelProveedor([EMPRESA_A]);
    const assigned = [{ _id: CENTRO_A, idEmpresa: EMPRESA_A }];
    centroTrabajoModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue(assigned),
    });

    const result = await service.findByUserAssignments(USER_ID);

    expect(empresaModel.find).toHaveBeenCalledWith({
      idProveedorSalud: PROV_A,
    });
    expect(centroTrabajoModel.find).toHaveBeenCalledWith({
      _id: { $in: [CENTRO_A] },
      idEmpresa: { $in: [EMPRESA_A] },
    });
    expect(result).toEqual(assigned);
    expect(centroTrabajoModel.find).not.toHaveBeenCalledWith({});
  });

  it('target Principal devuelve únicamente centros de SU proveedor', async () => {
    mockUser({
      _id: USER_ID,
      role: 'Principal',
      idProveedorSalud: PROV_A,
      permisos: {},
    });
    mockEmpresasDelProveedor([EMPRESA_A]);
    const centrosProvA = [{ _id: CENTRO_A, idEmpresa: EMPRESA_A }];
    centroTrabajoModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue(centrosProvA),
    });

    const result = await service.findByUserAssignments(USER_ID);

    expect(centroTrabajoModel.find).toHaveBeenCalledWith({
      idEmpresa: { $in: [EMPRESA_A] },
    });
    expect(centroTrabajoModel.find).not.toHaveBeenCalledWith({});
    expect(result).toEqual(centrosProvA);
  });

  it('target con accesoCompletoEmpresasCentros devuelve únicamente centros de SU proveedor', async () => {
    mockUser({
      _id: USER_ID,
      role: 'Administrativo',
      idProveedorSalud: PROV_A,
      permisos: { accesoCompletoEmpresasCentros: true },
    });
    mockEmpresasDelProveedor([EMPRESA_A]);
    const centrosProvA = [{ _id: CENTRO_A, idEmpresa: EMPRESA_A }];
    centroTrabajoModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue(centrosProvA),
    });

    const result = await service.findByUserAssignments(USER_ID);

    expect(centroTrabajoModel.find).toHaveBeenCalledWith({
      idEmpresa: { $in: [EMPRESA_A] },
    });
    expect(centroTrabajoModel.find).not.toHaveBeenCalledWith({});
    expect(result).toEqual(centrosProvA);
  });

  it('nunca ejecuta find({}) global para Principal o acceso completo', async () => {
    mockUser({
      _id: USER_ID,
      role: 'Principal',
      idProveedorSalud: PROV_A,
    });
    mockEmpresasDelProveedor([EMPRESA_A, EMPRESA_B]);
    centroTrabajoModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });

    await service.findByUserAssignments(USER_ID);

    const queries = centroTrabajoModel.find.mock.calls.map((call) => call[0]);
    expect(queries).not.toContainEqual({});
    expect(queries).toContainEqual({
      idEmpresa: { $in: [EMPRESA_A, EMPRESA_B] },
    });
  });

  it('IDs de otro proveedor no se incorporan en la respuesta de un target restringido', async () => {
    mockUser({
      _id: USER_ID,
      role: 'Médico',
      idProveedorSalud: PROV_A,
      centrosTrabajoAsignados: [CENTRO_A, CENTRO_B],
      permisos: { accesoCompletoEmpresasCentros: false },
    });
    mockEmpresasDelProveedor([EMPRESA_A]);
    const onlyTenantA = [{ _id: CENTRO_A, idEmpresa: EMPRESA_A }];
    centroTrabajoModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue(onlyTenantA),
    });

    const result = await service.findByUserAssignments(USER_ID);

    expect(centroTrabajoModel.find).toHaveBeenCalledWith({
      _id: { $in: [CENTRO_A, CENTRO_B] },
      idEmpresa: { $in: [EMPRESA_A] },
    });
    expect(result).toEqual(onlyTenantA);
    expect(result.some((centro) => String(centro._id) === CENTRO_B)).toBe(
      false,
    );
  });

  it('sin idProveedorSalud no consulta la colección global de centros', async () => {
    mockUser({
      _id: USER_ID,
      role: 'Principal',
      idProveedorSalud: null,
    });

    const result = await service.findByUserAssignments(USER_ID);

    expect(result).toEqual([]);
    expect(centroTrabajoModel.find).not.toHaveBeenCalled();
  });
});
