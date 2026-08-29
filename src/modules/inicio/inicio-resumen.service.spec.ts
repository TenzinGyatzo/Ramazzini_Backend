import { Types } from 'mongoose';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InicioResumenService } from './inicio-resumen.service';
import { DocumentoEstado } from '../expedientes/enums/documento-estado.enum';

const PROVEEDOR_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f1f77bcf86cd799439012';
const OTHER_USER_ID = '507f1f77bcf86cd799439013';
const EMPRESA_ID = '507f1f77bcf86cd799439021';
const CENTRO_ID = '507f1f77bcf86cd799439022';
const OTHER_CENTRO_ID = '507f1f77bcf86cd799439023';
const TRABAJADOR_ID = '507f1f77bcf86cd799439031';
const FUSED_ID = '507f1f77bcf86cd799439032';
const CANONICAL_ID = TRABAJADOR_ID;

function oid(id: string) {
  return new Types.ObjectId(id);
}

function createCursor(docs: any[]) {
  const state = { docs, sortKey: '', dir: -1, limitCount: docs.length };
  const cursor = {
    sort: (spec: Record<string, number>) => {
      const [key, dir] = Object.entries(spec)[0] ?? ['updatedAt', -1];
      state.sortKey = key;
      state.dir = dir;
      return cursor;
    },
    limit: (n: number) => {
      state.limitCount = n;
      return cursor;
    },
    toArray: async () => {
      const sorted = [...state.docs].sort((a, b) => {
        const av = new Date(a[state.sortKey] ?? 0).getTime();
        const bv = new Date(b[state.sortKey] ?? 0).getTime();
        return state.dir * (av - bv);
      });
      return sorted.slice(0, state.limitCount);
    },
  };
  return cursor;
}

function matchesFilter(doc: any, filter: any): boolean {
  if (filter.estado?.$ne && doc.estado === filter.estado.$ne) return false;
  if (filter.estado && !filter.estado.$ne && doc.estado !== filter.estado) {
    return false;
  }
  if (filter._id?.$in) {
    const ids = filter._id.$in.map(String);
    if (!ids.includes(String(doc._id))) return false;
  }
  if (filter.createdBy?.$in && !filter.$or) {
    const ids = filter.createdBy.$in.map(String);
    if (!ids.includes(String(doc.createdBy))) return false;
  }
  if (filter.updatedBy?.$in && !filter.$or) {
    const ids = filter.updatedBy.$in.map(String);
    if (!ids.includes(String(doc.updatedBy))) return false;
  }
  if (filter.$or) {
    return filter.$or.some((clause: any) => matchesFilter(doc, clause));
  }
  if (filter.createdAt) {
    const at = new Date(doc.createdAt).getTime();
    if (filter.createdAt.$gte && at < filter.createdAt.$gte.getTime()) return false;
    if (filter.createdAt.$lt && at >= filter.createdAt.$lt.getTime()) return false;
  }
  if (filter.updatedAt) {
    const at = new Date(doc.updatedAt).getTime();
    if (filter.updatedAt.$gte && at < filter.updatedAt.$gte.getTime()) return false;
    if (filter.updatedAt.$lt && at >= filter.updatedAt.$lt.getTime()) return false;
  }
  return true;
}

describe('InicioResumenService', () => {
  const now = new Date('2026-08-28T18:00:00.000Z');
  let collections: Record<string, any[]>;
  let findCalls: { name: string; filter: any }[];
  let service: InicioResumenService;
  let usersService: any;
  let proveedoresSaludService: any;
  let regulatoryPolicyService: any;
  let workerFusionService: any;
  let notasMedicasBorradoresService: any;
  let trabajadorModel: any;
  let centroTrabajoModel: any;
  let empresaModel: any;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    collections = {
      historiaclinicas: [],
      notamedicas: [],
      aptitudpuestos: [],
    };
    findCalls = [];

    const connection = {
      db: {
        collection: (name: string) => ({
          find: (filter: any) => {
            findCalls.push({ name, filter });
            return createCursor(
              (collections[name] ?? []).filter((doc) =>
                matchesFilter(doc, filter),
              ),
            );
          },
        }),
      },
    };

    usersService = {
      findById: jest.fn(),
      findByProveedorSaludId: jest.fn(),
    };
    proveedoresSaludService = {
      findOne: jest.fn().mockResolvedValue({ pais: 'MX' }),
    };
    regulatoryPolicyService = {
      getRegulatoryPolicy: jest.fn().mockResolvedValue({
        regime: 'SIRES_NOM024',
      }),
    };
    workerFusionService = {
      resolveCanonicalIdMap: jest.fn(async (ids: string[]) => {
        const map = new Map<string, string>();
        for (const id of ids) {
          map.set(id, id === FUSED_ID ? CANONICAL_ID : id);
        }
        return map;
      }),
    };
    notasMedicasBorradoresService = {
      findBorradoresPendientes: jest.fn().mockResolvedValue({
        propios: [],
        equipo: [],
        resumen: { totalPropios: 0, totalEquipo: 0, nivelMaximo: 'info' },
      }),
    };

    const chain = (result: any[]) => ({
      select: () => ({
        lean: () => ({
          exec: async () => result,
        }),
      }),
    });

    trabajadorModel = {
      find: jest.fn().mockImplementation((query) => {
        const ids = (query._id.$in as Types.ObjectId[]).map(String);
        const all = [
          {
            _id: oid(TRABAJADOR_ID),
            nombre: 'Juan',
            primerApellido: 'Pérez',
            segundoApellido: '',
            idCentroTrabajo: oid(CENTRO_ID),
          },
          {
            _id: oid(FUSED_ID),
            nombre: 'Juan',
            primerApellido: 'Pérez',
            segundoApellido: '',
            idCentroTrabajo: oid(CENTRO_ID),
            idTrabajadorCanonico: oid(CANONICAL_ID),
          },
          {
            _id: oid('507f1f77bcf86cd799439033'),
            nombre: 'Ana',
            primerApellido: 'López',
            segundoApellido: '',
            idCentroTrabajo: oid(OTHER_CENTRO_ID),
          },
        ];
        return chain(all.filter((row) => ids.includes(String(row._id))));
      }),
      exists: jest.fn().mockImplementation(async (query) => {
        const inIds = ((query.idCentroTrabajo?.$in as Types.ObjectId[]) ?? []).map(
          String,
        );
        const workerCentros = [CENTRO_ID, OTHER_CENTRO_ID];
        const found = workerCentros.some((id) => inIds.includes(id));
        return found ? { _id: oid(TRABAJADOR_ID) } : null;
      }),
    };
    centroTrabajoModel = {
      find: jest.fn().mockImplementation(() =>
        chain([
          {
            _id: oid(CENTRO_ID),
            nombreCentro: 'Planta Norte',
            idEmpresa: oid(EMPRESA_ID),
          },
        ]),
      ),
    };
    empresaModel = {
      find: jest.fn().mockImplementation(() =>
        chain([
          {
            _id: oid(EMPRESA_ID),
            nombreComercial: 'Empresa Demo',
          },
        ]),
      ),
    };

    service = new InicioResumenService(
      connection as any,
      trabajadorModel,
      centroTrabajoModel,
      empresaModel,
      usersService,
      proveedoresSaludService,
      regulatoryPolicyService,
      workerFusionService,
      notasMedicasBorradoresService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function medicoUser() {
    return {
      _id: oid(USER_ID),
      username: 'Dr. Juan',
      role: 'Médico',
      idProveedorSalud: oid(PROVEEDOR_ID),
      centrosTrabajoAsignados: [oid(CENTRO_ID)],
      permisos: { accesoCompletoEmpresasCentros: false },
    };
  }

  function principalUser() {
    return {
      _id: oid(USER_ID),
      username: 'Principal',
      role: 'Principal',
      idProveedorSalud: oid(PROVEEDOR_ID),
      centrosTrabajoAsignados: [],
      permisos: { accesoCompletoEmpresasCentros: true },
    };
  }

  it('rechaza usuario sin proveedor', async () => {
    usersService.findById.mockResolvedValue({ role: 'Médico' });
    await expect(service.getResumen(USER_ID)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('cuenta actividad personal y omite la de compañeros para un médico', async () => {
    usersService.findById.mockResolvedValue(medicoUser());
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439041'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T16:00:00.000Z'),
        updatedAt: new Date('2026-08-28T16:00:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
      },
      {
        _id: oid('507f1f77bcf86cd799439042'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(OTHER_USER_ID),
        updatedBy: oid(OTHER_USER_ID),
        createdAt: new Date('2026-08-28T16:10:00.000Z'),
        updatedAt: new Date('2026-08-28T16:10:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
      },
    ];

    const resumen = await service.getResumen(USER_ID);
    expect(resumen.activityScope).toBe('user');
    expect(resumen.hasActivity).toBe(true);
    expect(resumen.hoy.documentosCreados).toBe(1);
    expect(resumen.hoy.trabajadoresUnicos).toBe(1);
    expect(resumen.expedientesRecientes[0]?.actorUsername).toBeUndefined();
  });

  it('el Principal ve actividad del equipo y el username del actor', async () => {
    usersService.findById.mockResolvedValue(principalUser());
    usersService.findByProveedorSaludId.mockResolvedValue([
      { _id: oid(USER_ID), username: 'Principal' },
      { _id: oid(OTHER_USER_ID), username: 'Dra. Ana' },
    ]);
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439041'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(OTHER_USER_ID),
        updatedBy: oid(OTHER_USER_ID),
        createdAt: new Date('2026-08-28T16:00:00.000Z'),
        updatedAt: new Date('2026-08-28T16:00:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
      },
    ];

    const resumen = await service.getResumen(USER_ID);
    expect(resumen.activityScope).toBe('tenant');
    expect(resumen.hoy.documentosCreados).toBe(1);
    expect(resumen.clientesRecientes[0]?.actorUsername).toBe('Dra. Ana');
    expect(resumen.expedientesRecientes[0]?.actorUsername).toBe('Dra. Ana');
  });

  it('no cuenta dos veces a un trabajador fusionado', async () => {
    usersService.findById.mockResolvedValue(medicoUser());
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439041'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T16:00:00.000Z'),
        updatedAt: new Date('2026-08-28T16:00:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
      },
      {
        _id: oid('507f1f77bcf86cd799439042'),
        idTrabajador: oid(FUSED_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T16:20:00.000Z'),
        updatedAt: new Date('2026-08-28T16:20:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
      },
    ];

    const resumen = await service.getResumen(USER_ID);
    expect(resumen.hoy.documentosCreados).toBe(2);
    expect(resumen.hoy.trabajadoresUnicos).toBe(1);
  });

  it('omite documentos anulados y centros no asignados', async () => {
    usersService.findById.mockResolvedValue({
      ...medicoUser(),
      centrosTrabajoAsignados: [oid(CENTRO_ID)],
    });
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439041'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T16:00:00.000Z'),
        updatedAt: new Date('2026-08-28T16:00:00.000Z'),
        estado: DocumentoEstado.ANULADO,
      },
    ];

    const resumen = await service.getResumen(USER_ID);
    expect(resumen.hasActivity).toBe(false);
    expect(resumen.hasTrabajadores).toBe(true);
    expect(resumen.hoy.documentosCreados).toBe(0);
  });

  it('en SIN_REGIMEN expone centros y oculta borradores y atención SIRES', async () => {
    usersService.findById.mockResolvedValue(medicoUser());
    regulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue({
      regime: 'SIN_REGIMEN',
    });
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439041'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T16:00:00.000Z'),
        updatedAt: new Date('2026-08-28T16:00:00.000Z'),
        estado: DocumentoEstado.BORRADOR,
      },
    ];

    const resumen = await service.getResumen(USER_ID);
    expect(resumen.regimen).toBe('SIN_REGIMEN');
    expect(resumen.hoy.centrosConActividad).toBe(1);
    expect(resumen.hoy.borradoresPendientes).toBeUndefined();
    expect(resumen.atencion).toEqual([]);
    expect(resumen.pendientes).toEqual([]);
    expect(resumen.consejo?.id).not.toBe('sires-nota-aclaratoria');
    expect(notasMedicasBorradoresService.findBorradoresPendientes).not.toHaveBeenCalled();
  });

  it('en SIRES cuenta borradores propios y reutiliza atención NM', async () => {
    usersService.findById.mockResolvedValue(medicoUser());
    collections.notamedicas = [
      {
        _id: oid('507f1f77bcf86cd799439051'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-20T16:00:00.000Z'),
        updatedAt: new Date('2026-08-20T16:00:00.000Z'),
        estado: DocumentoEstado.BORRADOR,
      },
    ];
    notasMedicasBorradoresService.findBorradoresPendientes.mockResolvedValue({
      propios: [
        {
          id: '507f1f77bcf86cd799439051',
          idTrabajador: TRABAJADOR_ID,
          idCentroTrabajo: CENTRO_ID,
          idEmpresa: EMPRESA_ID,
          trabajadorNombre: 'Pérez Juan',
          createdAt: '2026-08-20T16:00:00.000Z',
        },
      ],
      equipo: [],
      resumen: { totalPropios: 1, totalEquipo: 0, nivelMaximo: 'warning' },
    });

    const resumen = await service.getResumen(USER_ID);
    expect(resumen.hoy.borradoresPendientes).toBe(1);
    expect(resumen.atencion[0]?.tipo).toBe('borrador_nm_propio');
    expect(resumen.atencion[0]?.titulo).toBe(
      '1 nota médica con más de 72 horas sin finalizar',
    );
    expect(resumen.pendientes).toHaveLength(1);
  });

  it('cuenta borradores recientes en el indicador y no en atención', async () => {
    usersService.findById.mockResolvedValue(medicoUser());
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439061'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T16:00:00.000Z'),
        updatedAt: new Date('2026-08-28T16:00:00.000Z'),
        estado: DocumentoEstado.BORRADOR,
      },
      {
        _id: oid('507f1f77bcf86cd799439062'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-24T16:00:00.000Z'),
        updatedAt: new Date('2026-08-24T16:00:00.000Z'),
        estado: DocumentoEstado.BORRADOR,
      },
    ];

    const resumen = await service.getResumen(USER_ID);
    expect(resumen.hoy.borradoresPendientes).toBe(2);
    expect(resumen.atencion).toHaveLength(1);
    expect(resumen.atencion[0]?.tipo).toBe('borrador_otro');
    expect(resumen.atencion[0]?.count).toBe(1);
    expect(resumen.atencion[0]?.titulo).toBe(
      '1 otro documento con más de 72 horas en borrador',
    );
    expect(resumen.atencion[0]?.items[0]?.idDocumento).toBe(
      '507f1f77bcf86cd799439062',
    );
  });

  it('no mete notas médicas en el grupo de otros documentos', async () => {
    usersService.findById.mockResolvedValue(medicoUser());
    collections.notamedicas = [
      {
        _id: oid('507f1f77bcf86cd799439051'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-20T16:00:00.000Z'),
        updatedAt: new Date('2026-08-20T16:00:00.000Z'),
        estado: DocumentoEstado.BORRADOR,
      },
    ];
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439062'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-24T16:00:00.000Z'),
        updatedAt: new Date('2026-08-24T16:00:00.000Z'),
        estado: DocumentoEstado.BORRADOR,
      },
    ];
    notasMedicasBorradoresService.findBorradoresPendientes.mockResolvedValue({
      propios: [
        {
          id: '507f1f77bcf86cd799439051',
          idTrabajador: TRABAJADOR_ID,
          idCentroTrabajo: CENTRO_ID,
          idEmpresa: EMPRESA_ID,
          trabajadorNombre: 'Pérez Juan',
          createdAt: '2026-08-20T16:00:00.000Z',
        },
      ],
      equipo: [],
      resumen: { totalPropios: 1, totalEquipo: 0, nivelMaximo: 'warning' },
    });

    const resumen = await service.getResumen(USER_ID);
    expect(resumen.hoy.borradoresPendientes).toBe(2);
    expect(resumen.atencion.map((grupo) => grupo.tipo)).toEqual([
      'borrador_nm_propio',
      'borrador_otro',
    ]);
    expect(resumen.atencion[0]?.titulo).toContain('72 horas');
    expect(resumen.atencion[1]?.titulo).toContain('72 horas en borrador');
    expect(
      resumen.atencion[1]?.items.some(
        (item) => item.tipoDocumento === 'notaMedica',
      ),
    ).toBe(false);
  });

  it('titula las notas del equipo con el umbral de 7 días', async () => {
    usersService.findById.mockResolvedValue(principalUser());
    usersService.findByProveedorSaludId.mockResolvedValue([
      { _id: oid(USER_ID), username: 'Principal' },
      { _id: oid(OTHER_USER_ID), username: 'Dra. Ana' },
    ]);
    notasMedicasBorradoresService.findBorradoresPendientes.mockResolvedValue({
      propios: [],
      equipo: [
        {
          id: '507f1f77bcf86cd799439071',
          idTrabajador: TRABAJADOR_ID,
          idCentroTrabajo: CENTRO_ID,
          idEmpresa: EMPRESA_ID,
          trabajadorNombre: 'Pérez Juan',
          createdAt: '2026-08-01T16:00:00.000Z',
        },
      ],
      resumen: { totalPropios: 0, totalEquipo: 1, nivelMaximo: 'warning' },
    });

    const resumen = await service.getResumen(USER_ID);
    expect(resumen.atencion[0]?.tipo).toBe('borrador_nm_equipo');
    expect(resumen.atencion[0]?.titulo).toBe(
      '1 nota médica del equipo con más de 7 días sin finalizar',
    );
  });

  it('omite actividad de un centro que el médico ya no tiene asignado', async () => {
    const otherWorkerId = '507f1f77bcf86cd799439033';
    usersService.findById.mockResolvedValue(medicoUser());
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439041'),
        idTrabajador: oid(otherWorkerId),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T16:00:00.000Z'),
        updatedAt: new Date('2026-08-28T16:00:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
      },
    ];

    const resumen = await service.getResumen(USER_ID);
    expect(resumen.hasActivity).toBe(false);
    expect(resumen.hasTrabajadores).toBe(true);
    expect(resumen.hoy.documentosCreados).toBe(0);
    expect(resumen.clientesRecientes).toEqual([]);
    expect(resumen.expedientesRecientes).toEqual([]);
  });

  it('no cuenta como hoy un documento creado antes de la medianoche local MX', async () => {
    usersService.findById.mockResolvedValue(medicoUser());
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439041'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T05:30:00.000Z'),
        updatedAt: new Date('2026-08-28T05:30:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
      },
    ];

    const resumen = await service.getResumen(USER_ID);
    expect(resumen.hoy.documentosCreados).toBe(0);
    expect(resumen.hoy.trabajadoresUnicos).toBe(0);
    expect(resumen.clientesRecientes).toHaveLength(1);
  });

  it('expone dateKey del día de negocio', async () => {
    usersService.findById.mockResolvedValue(medicoUser());
    const resumen = await service.getResumen(USER_ID);
    expect(resumen.dateKey).toBe('2026-08-28');
  });

  it('marca hasTrabajadores si hay trabajador en alcance aunque no haya documentos hoy', async () => {
    usersService.findById.mockResolvedValue(medicoUser());
    const resumen = await service.getResumen(USER_ID);
    expect(resumen.hasActivity).toBe(false);
    expect(resumen.hasTrabajadores).toBe(true);
    expect(resumen.consejo).not.toBeNull();
    expect(resumen.consejo?.texto).toBeTruthy();
    expect(trabajadorModel.exists).toHaveBeenCalled();
  });

  it('marca hasTrabajadores en false si no hay trabajadores en el alcance', async () => {
    usersService.findById.mockResolvedValue({
      ...medicoUser(),
      centrosTrabajoAsignados: [oid('507f1f77bcf86cd799439099')],
    });
    const resumen = await service.getResumen(USER_ID);
    expect(resumen.hasActivity).toBe(false);
    expect(resumen.hasTrabajadores).toBe(false);
    const query = trabajadorModel.exists.mock.calls[0]?.[0];
    const inIds = (query?.idCentroTrabajo?.$in ?? []).map(String);
    expect(inIds).toEqual(['507f1f77bcf86cd799439099']);
    expect(inIds).not.toContain(OTHER_CENTRO_ID);
  });

  it('el médico sin centro asignado no cuenta trabajadores de otro centro', async () => {
    usersService.findById.mockResolvedValue({
      ...medicoUser(),
      centrosTrabajoAsignados: [],
    });
    const resumen = await service.getResumen(USER_ID);
    expect(resumen.hasTrabajadores).toBe(false);
    expect(trabajadorModel.exists).not.toHaveBeenCalled();
  });

  it('lista documentos de hoy, omite ayer y anulados, y coincide con el indicador', async () => {
    usersService.findById.mockResolvedValue(medicoUser());
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439041'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T16:00:00.000Z'),
        updatedAt: new Date('2026-08-28T16:00:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
        finalizadoPor: oid(USER_ID),
      },
      {
        _id: oid('507f1f77bcf86cd799439042'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-27T16:00:00.000Z'),
        updatedAt: new Date('2026-08-27T16:00:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
      },
      {
        _id: oid('507f1f77bcf86cd799439043'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T17:00:00.000Z'),
        updatedAt: new Date('2026-08-28T17:00:00.000Z'),
        estado: DocumentoEstado.ANULADO,
      },
    ];

    const resumen = await service.getResumen(USER_ID);
    const list = await service.listHoyDocumentos(USER_ID);
    expect(resumen.hoy.documentosCreados).toBe(1);
    expect(list.total).toBe(1);
    expect(list.truncated).toBe(false);
    expect(list.items[0]?.idDocumento).toBe('507f1f77bcf86cd799439041');
    expect(list.items[0]?.estado).toBe('finalizado');
    expect(list.items.some((item) => item.idDocumento === '507f1f77bcf86cd799439043')).toBe(
      false,
    );
  });

  it('lista trabajadores únicos coincidentes con el resumen y fusiona canónicos', async () => {
    usersService.findById.mockResolvedValue(medicoUser());
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439041'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T16:00:00.000Z'),
        updatedAt: new Date('2026-08-28T16:00:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
      },
      {
        _id: oid('507f1f77bcf86cd799439042'),
        idTrabajador: oid(FUSED_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T16:20:00.000Z'),
        updatedAt: new Date('2026-08-28T16:20:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
      },
    ];

    const resumen = await service.getResumen(USER_ID);
    const list = await service.listHoyTrabajadores(USER_ID);
    expect(resumen.hoy.trabajadoresUnicos).toBe(1);
    expect(list.total).toBe(1);
    expect(list.items[0]?.idTrabajador).toBe(CANONICAL_ID);
    expect(list.items[0]?.actorUsername).toBeUndefined();
  });

  it('rechaza centros en SIRES y los lista en SIN_REGIMEN', async () => {
    usersService.findById.mockResolvedValue(medicoUser());
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439041'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T16:00:00.000Z'),
        updatedAt: new Date('2026-08-28T16:00:00.000Z'),
        estado: DocumentoEstado.BORRADOR,
      },
    ];

    await expect(service.listHoyCentros(USER_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    regulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue({
      regime: 'SIN_REGIMEN',
    });
    const resumen = await service.getResumen(USER_ID);
    const list = await service.listHoyCentros(USER_ID);
    expect(resumen.hoy.centrosConActividad).toBe(1);
    expect(list.total).toBe(1);
    expect(list.items[0]?.idCentroTrabajo).toBe(CENTRO_ID);
  });

  it('el Principal ve actividad del equipo en las listas de hoy', async () => {
    usersService.findById.mockResolvedValue(principalUser());
    usersService.findByProveedorSaludId.mockResolvedValue([
      { _id: oid(USER_ID), username: 'Principal' },
      { _id: oid(OTHER_USER_ID), username: 'Dra. Ana' },
    ]);
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439041'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(OTHER_USER_ID),
        updatedBy: oid(OTHER_USER_ID),
        createdAt: new Date('2026-08-28T16:00:00.000Z'),
        updatedAt: new Date('2026-08-28T16:00:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
      },
    ];

    const list = await service.listHoyTrabajadores(USER_ID);
    expect(list.total).toBe(1);
    expect(list.items[0]?.actorUsername).toBe('Dra. Ana');
  });

  it('omite de las listas de hoy centros no asignados al médico', async () => {
    const otherWorkerId = '507f1f77bcf86cd799439033';
    usersService.findById.mockResolvedValue(medicoUser());
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439041'),
        idTrabajador: oid(otherWorkerId),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T16:00:00.000Z'),
        updatedAt: new Date('2026-08-28T16:00:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
      },
    ];

    const resumen = await service.getResumen(USER_ID);
    const trabajadores = await service.listHoyTrabajadores(USER_ID);
    const documentos = await service.listHoyDocumentos(USER_ID);
    expect(resumen.hoy.documentosCreados).toBe(0);
    expect(trabajadores.total).toBe(0);
    expect(documentos.total).toBe(0);
  });

  it('ordena documentos por createdAt desc con desempate _id', async () => {
    usersService.findById.mockResolvedValue(medicoUser());
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439041'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T16:00:00.000Z'),
        updatedAt: new Date('2026-08-28T16:00:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
      },
      {
        _id: oid('507f1f77bcf86cd799439042'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T17:00:00.000Z'),
        updatedAt: new Date('2026-08-28T17:00:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
      },
    ];

    const list = await service.listHoyDocumentos(USER_ID);
    expect(list.items.map((item) => item.idDocumento)).toEqual([
      '507f1f77bcf86cd799439042',
      '507f1f77bcf86cd799439041',
    ]);
  });

  it('resuelve actores con un $in y no por ítem', async () => {
    usersService.findById.mockResolvedValue(medicoUser());
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439041'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T16:00:00.000Z'),
        updatedAt: new Date('2026-08-28T16:00:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
        finalizadoPor: oid(OTHER_USER_ID),
      },
    ];

    await service.listHoyDocumentos(USER_ID);
    const usersFinds = findCalls.filter((call) => call.name === 'users');
    expect(usersFinds).toHaveLength(1);
    expect(usersFinds[0]?.filter._id.$in.map(String)).toEqual([OTHER_USER_ID]);
    expect(usersService.findById).toHaveBeenCalledTimes(1);
  });

  it('en SIN_REGIMEN no expone estado SIRES ni finalizadoPor', async () => {
    usersService.findById.mockResolvedValue(medicoUser());
    regulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue({
      regime: 'SIN_REGIMEN',
    });
    collections.historiaclinicas = [
      {
        _id: oid('507f1f77bcf86cd799439041'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T16:00:00.000Z'),
        updatedAt: new Date('2026-08-28T16:00:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
        finalizadoPor: oid(USER_ID),
      },
    ];

    const list = await service.listHoyDocumentos(USER_ID);
    expect(list.items[0]?.estado).toBeUndefined();
    expect(list.items[0]?.finalizadoPorUsername).toBeUndefined();
    expect(list.items[0]?.creadorUsername).toBe('Dr. Juan');
  });

  it('expone el nombre real de un documento externo', async () => {
    usersService.findById.mockResolvedValue(medicoUser());
    collections.documentoexternos = [
      {
        _id: oid('507f1f77bcf86cd799439081'),
        idTrabajador: oid(TRABAJADOR_ID),
        createdBy: oid(USER_ID),
        updatedBy: oid(USER_ID),
        createdAt: new Date('2026-08-28T16:00:00.000Z'),
        updatedAt: new Date('2026-08-28T16:00:00.000Z'),
        estado: DocumentoEstado.FINALIZADO,
        nombreDocumento: 'Laboratorio 2026.pdf',
      },
    ];

    const list = await service.listHoyDocumentos(USER_ID);
    const externo = list.items.find((item) => item.tipoDocumento === 'documentoExterno');
    expect(externo?.nombreDocumento).toBe('Laboratorio 2026.pdf');
    expect(externo?.etiquetaTipo).toBe('Documento externo');
  });
});
