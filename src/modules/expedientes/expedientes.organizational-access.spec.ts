import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs/promises';

jest.mock('fs/promises', () => {
  const actual = jest.requireActual('fs/promises');
  return {
    ...actual,
    writeFile: jest.fn(actual.writeFile),
    mkdir: jest.fn(actual.mkdir),
  };
});

import { OrganizationalAccessService } from '../../utils/organizational-access.service';
import { ExpedientesService } from './expedientes.service';
import { ExpedientesController } from './expedientes.controller';
import { PdfStatus } from './enums/pdf-status.enum';

/**
 * IMP-008 — aislamiento organizacional de expedientes.
 * Demuestra ausencia de lectura / modificación / eliminación / creación /
 * inferencia cross-org. Fusión: 10 / 11 / 11b / 11c según plan aprobado.
 */

const USER_A = '507f1f77bcf86cd7994390aa';
const USER_B = '507f1f77bcf86cd7994390bb';
const USER_SOLO_A1 = '507f1f77bcf86cd7994390cc';
const USER_PRINCIPAL_A = '507f1f77bcf86cd7994390dd';
const USER_MEDICO = '507f1f77bcf86cd7994390ee';

const TRABAJADOR_A = '507f1f77bcf86cd799439011';
const TRABAJADOR_B = '507f1f77bcf86cd799439012';
const TRABAJADOR_A2 = '507f1f77bcf86cd799439013';
const FUSION_A_ELIMINADO = '507f1f77bcf86cd7994390a1';
const FUSION_B_VIGENTE = '507f1f77bcf86cd7994390b2';

const DOC_A = '507f1f77bcf86cd799439021';
const DOC_B = '507f1f77bcf86cd799439022';
const DOC_FUSION_B = '507f1f77bcf86cd799439023';
const DOC_MISSING = '507f1f77bcf86cd799439099';

const CROSS_ORG_FORBIDDEN = 'No tiene permiso para acceder a este recurso';
const WORKER_NOT_FOUND = 'Trabajador no encontrado';

function execChain(value: unknown) {
  return {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(value),
    }),
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

function createIsolationService(options?: {
  allow?: Record<string, string[]>;
  deletedTrabajadores?: string[];
  canonical?: Record<string, string>;
  documents?: Record<string, { _id: string; idTrabajador: string } | null>;
}) {
  const allow = options?.allow ?? {
    [USER_A]: [TRABAJADOR_A],
    [USER_B]: [TRABAJADOR_B],
    [USER_SOLO_A1]: [TRABAJADOR_A],
    [USER_PRINCIPAL_A]: [TRABAJADOR_A, TRABAJADOR_A2],
    [USER_MEDICO]: [TRABAJADOR_A],
  };
  const deleted = new Set(options?.deletedTrabajadores ?? []);
  const canonicalMap = options?.canonical ?? {};
  const documents = options?.documents ?? {
    [DOC_A]: { _id: DOC_A, idTrabajador: TRABAJADOR_A },
    [DOC_B]: { _id: DOC_B, idTrabajador: TRABAJADOR_B },
    [DOC_FUSION_B]: { _id: DOC_FUSION_B, idTrabajador: FUSION_B_VIGENTE },
    [DOC_MISSING]: null,
  };

  const oas = {
    assertUserCanAccessTrabajadorId: jest.fn(
      async (userId: string, trabajadorId: string) => {
        if (deleted.has(trabajadorId)) {
          throw new NotFoundException(WORKER_NOT_FOUND);
        }
        const allowed = allow[userId] ?? [];
        if (!allowed.includes(trabajadorId)) {
          throw new ForbiddenException(CROSS_ORG_FORBIDDEN);
        }
      },
    ),
  };

  const workerFusionService = {
    getCanonicalTrabajadorId: jest.fn(async (id: string) => canonicalMap[id] ?? id),
  };

  const findById = jest.fn((id: string) => execChain(documents[id] ?? null));
  const find = jest.fn(() => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  }));
  const findOne = jest.fn(() => ({
    sort: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(null),
  }));
  const findByIdAndUpdate = jest.fn(() => ({
    exec: jest.fn().mockResolvedValue({ _id: DOC_A }),
  }));
  const findByIdAndDelete = jest.fn(() => ({
    exec: jest.fn().mockResolvedValue({ _id: DOC_A }),
  }));
  const save = jest.fn().mockResolvedValue({ _id: 'created' });

  function ModelCtor(this: any, dto: any) {
    Object.assign(this, dto);
    this.save = save;
  }
  Object.assign(ModelCtor, {
    findById,
    find,
    findOne,
    findByIdAndUpdate,
    findByIdAndDelete,
    exists: jest.fn().mockResolvedValue(null),
  });

  const service = Object.create(
    ExpedientesService.prototype,
  ) as ExpedientesService;

  (service as any).organizationalAccessService = oas;
  (service as any).workerFusionService = workerFusionService;
  (service as any).models = {
    notaMedica: ModelCtor,
    documentoExterno: ModelCtor,
    exploracionFisica: ModelCtor,
    controlPrenatal: ModelCtor,
    historiaClinica: ModelCtor,
  };
  (service as any).dateFields = {
    notaMedica: 'fechaNotaMedica',
    documentoExterno: 'fechaDocumento',
  };
  (service as any).deteccionModel = ModelCtor;
  (service as any).exploracionFisicaModel = ModelCtor;
  (service as any).controlPrenatalModel = ModelCtor;
  (service as any).historiaClinicaModel = ModelCtor;
  (service as any).resultadoClinicoModel = {
    aggregate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        { byTipo: [], latest: [] },
      ]),
    }),
  };
  (service as any).actualizarUpdatedAtTrabajador = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).assertDocumentTypeEnabledForRegime = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).resolveDocumentRegimeContext = jest.fn().mockResolvedValue({
    proveedorSaludId: null,
    policy: null,
  });
  (service as any).countAllDocumentStatsForWorker = jest
    .fn()
    .mockResolvedValue([]);
  (service as any).validateDocumentDateE1 = jest.fn().mockResolvedValue(undefined);
  (service as any).validateCIE10ForDocument = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).validateVitalSignsForNOM024 = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).validateAndNormalizeEmbarazoForNotaMedica = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).validateDerechohabienciaAgainstAfiliacionCatalog = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).tryCapturarFichaSnapshot = jest.fn().mockResolvedValue(null);
  (service as any).recordDocDraftCreated = jest.fn().mockResolvedValue(undefined);
  (service as any).validateDeteccionRules = jest.fn().mockResolvedValue(undefined);
  (service as any).getCluesFromProveedorSalud = jest.fn().mockResolvedValue(null);
  (service as any).findDocumentsForList = jest.fn().mockResolvedValue([]);
  (service as any).resolveIncludeControlPrenatalForCounts = jest
    .fn()
    .mockResolvedValue(true);
  (service as any).documentTypeToStoreKey = { notaMedica: 'notasMedicas' };

  return {
    service,
    oas,
    workerFusionService,
    save,
    findById,
    findByIdAndUpdate,
    findByIdAndDelete,
  };
}

describe('IMP-008 ExpedientesService — aislamiento organizacional', () => {
  describe('1 / 2 — acceso por trabajador', () => {
    it('1. usuario A → trabajador A: allow', async () => {
      const { service, oas } = createIsolationService();
      await service.findDocuments('notaMedica', TRABAJADOR_A, USER_A);
      expect(oas.assertUserCanAccessTrabajadorId).toHaveBeenCalledWith(
        USER_A,
        TRABAJADOR_A,
      );
    });

    it('2. usuario A → trabajador B: deny (sin lectura cross-org)', async () => {
      const { service, oas } = createIsolationService();
      await expect(
        service.findDocuments('notaMedica', TRABAJADOR_B, USER_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(oas.assertUserCanAccessTrabajadorId).toHaveBeenCalledWith(
        USER_A,
        TRABAJADOR_B,
      );
    });
  });

  describe('3 / 4 — lectura por documentId (no por URL)', () => {
    it('3. usuario A + documentId B: deny sin payload clínico', async () => {
      const { service } = createIsolationService();
      await expect(
        service.findDocument('notaMedica', DOC_B, USER_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('4. URL A + documentId B: deny (autoriza el doc, no la URL)', async () => {
      const { service, oas } = createIsolationService();
      await expect(
        service.findDocument('notaMedica', DOC_B, USER_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(oas.assertUserCanAccessTrabajadorId).toHaveBeenCalledWith(
        USER_A,
        TRABAJADOR_B,
      );
      expect(oas.assertUserCanAccessTrabajadorId).not.toHaveBeenCalledWith(
        USER_A,
        TRABAJADOR_A,
      );
    });
  });

  describe('5 — create URL/body inconsistente', () => {
    it('URL A + body.idTrabajador B: 400, sin persistir', async () => {
      const { service, save, oas } = createIsolationService();
      await expect(
        service.createDocument(
          'notaMedica',
          { idTrabajador: TRABAJADOR_B, fechaNotaMedica: new Date() },
          USER_A,
          TRABAJADOR_A,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(save).not.toHaveBeenCalled();
      expect(oas.assertUserCanAccessTrabajadorId).not.toHaveBeenCalled();
    });
  });

  describe('6 / 7 / 8 / 9 — permiso funcional ≠ org; Principal; centros', () => {
    it('6. médico con permiso documental pero sin centro de B: deny', async () => {
      const { service } = createIsolationService();
      await expect(
        service.findDocument('notaMedica', DOC_B, USER_MEDICO),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('7. Principal A → recurso proveedor A: allow', async () => {
      const { service, oas } = createIsolationService();
      await service.findDocuments('notaMedica', TRABAJADOR_A, USER_PRINCIPAL_A);
      expect(oas.assertUserCanAccessTrabajadorId).toHaveBeenCalledWith(
        USER_PRINCIPAL_A,
        TRABAJADOR_A,
      );
    });

    it('8. Principal A → proveedor B: deny (sin cross-proveedor)', async () => {
      const { service } = createIsolationService();
      await expect(
        service.findDocuments('notaMedica', TRABAJADOR_B, USER_PRINCIPAL_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('9. usuario solo A1 → trabajador A2: deny', async () => {
      const { service } = createIsolationService();
      await expect(
        service.findDocuments('notaMedica', TRABAJADOR_A2, USER_SOLO_A1),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('10 / 11 / 11b / 11c — fusión (sin historial de autorización)', () => {
    it('10 (a). usuario autorizado a B, expediente pedido con id B: allow', async () => {
      const { service, oas } = createIsolationService({
        allow: { [USER_B]: [FUSION_B_VIGENTE] },
      });
      await service.findDocuments('notaMedica', FUSION_B_VIGENTE, USER_B);
      expect(oas.assertUserCanAccessTrabajadorId).toHaveBeenCalledWith(
        USER_B,
        FUSION_B_VIGENTE,
      );
      expect(oas.assertUserCanAccessTrabajadorId).not.toHaveBeenCalledWith(
        expect.anything(),
        FUSION_A_ELIMINADO,
      );
    });

    it('10 (a). documento cuyo idTrabajador es B: allow', async () => {
      const { service, oas } = createIsolationService({
        allow: { [USER_B]: [FUSION_B_VIGENTE] },
      });
      const doc = await service.findDocument('notaMedica', DOC_FUSION_B, USER_B);
      expect(doc).toBeTruthy();
      expect(oas.assertUserCanAccessTrabajadorId).toHaveBeenCalledWith(
        USER_B,
        FUSION_B_VIGENTE,
      );
    });

    it('11 (a). usuario solo autorizado al antiguo centro de A, expediente con id B: deny', async () => {
      const { service, oas } = createIsolationService({
        allow: { [USER_SOLO_A1]: [FUSION_A_ELIMINADO] },
      });
      await expect(
        service.findDocuments('notaMedica', FUSION_B_VIGENTE, USER_SOLO_A1),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(oas.assertUserCanAccessTrabajadorId).toHaveBeenCalledWith(
        USER_SOLO_A1,
        FUSION_B_VIGENTE,
      );
    });

    it('11b (b). 410 A→B no concede: la llamada de expedientes usa B y sigue sujeta a OAS(B)', async () => {
      const { service, oas } = createIsolationService({
        allow: { [USER_SOLO_A1]: [FUSION_A_ELIMINADO] },
      });
      const redirectTo = FUSION_B_VIGENTE;
      await expect(
        service.findAllDocuments(redirectTo, USER_SOLO_A1),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(oas.assertUserCanAccessTrabajadorId).toHaveBeenCalledWith(
        USER_SOLO_A1,
        redirectTo,
      );
      expect(oas.assertUserCanAccessTrabajadorId).not.toHaveBeenCalledWith(
        USER_SOLO_A1,
        FUSION_A_ELIMINADO,
      );
    });

    it('11c (c). llamada directa con A eliminado: 404; no se trata como A fusionado → B permitido', async () => {
      const { service, oas, workerFusionService } = createIsolationService({
        deletedTrabajadores: [FUSION_A_ELIMINADO],
        allow: { [USER_A]: [FUSION_B_VIGENTE] },
      });
      await expect(
        service.findDocuments('notaMedica', FUSION_A_ELIMINADO, USER_A),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(workerFusionService.getCanonicalTrabajadorId).toHaveBeenCalledWith(
        FUSION_A_ELIMINADO,
      );
      expect(oas.assertUserCanAccessTrabajadorId).toHaveBeenCalledWith(
        USER_A,
        FUSION_A_ELIMINADO,
      );
      expect(oas.assertUserCanAccessTrabajadorId).not.toHaveBeenCalledWith(
        USER_A,
        FUSION_B_VIGENTE,
      );
    });
  });

  describe('12 / 13 — contratos de inexistencia e id inválido', () => {
    it('12. documento inexistente: findDocument devuelve null (GET 200+mensaje en controller)', async () => {
      const { service, oas } = createIsolationService();
      const result = await service.findDocument(
        'notaMedica',
        DOC_MISSING,
        USER_A,
      );
      expect(result).toBeNull();
      expect(oas.assertUserCanAccessTrabajadorId).not.toHaveBeenCalled();
    });

    it('13. ObjectId inválido en controller: 400', async () => {
      const controller = new ExpedientesController(
        { findDocument: jest.fn() } as any,
        {} as any,
        {} as any,
      );
      await expect(
        controller.findDocument('notaMedica', 'no-es-objectid', {
          userId: USER_A,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('14–18 — create / read / update / finalize / delete', () => {
    it('14. create cross-org: deny (sin creación cross-org)', async () => {
      const { service, save } = createIsolationService();
      await expect(
        service.createDocument(
          'notaMedica',
          { idTrabajador: TRABAJADOR_B },
          USER_A,
          TRABAJADOR_B,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(save).not.toHaveBeenCalled();
    });

    it('14b. create propio: OAS allow sobre canónico de URL y persiste', async () => {
      const { service, oas, save } = createIsolationService();
      const created = await service.createDocument(
        'notaMedica',
        { idTrabajador: TRABAJADOR_A, fechaNotaMedica: '2024-01-01' },
        USER_A,
        TRABAJADOR_A,
      );
      expect(oas.assertUserCanAccessTrabajadorId).toHaveBeenCalledWith(
        USER_A,
        TRABAJADOR_A,
      );
      expect(save).toHaveBeenCalled();
      expect(created).toEqual({ _id: 'created' });
    });

    it('15. read propio: allow', async () => {
      const { service } = createIsolationService();
      const doc = await service.findDocument('notaMedica', DOC_A, USER_A);
      expect(doc).toBeTruthy();
    });

    it('16. update cross-org: deny (sin modificación cross-org)', async () => {
      const { service, findByIdAndUpdate } = createIsolationService();
      await expect(
        service.updateOrCreateDocument(
          'notaMedica',
          DOC_B,
          {
            idTrabajador: TRABAJADOR_B,
            fechaNotaMedica: '2024-01-01',
          },
          USER_A,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('16b. update que reasigna idTrabajador: 400', async () => {
      const { service } = createIsolationService();
      await expect(
        service.updateOrCreateDocument(
          'notaMedica',
          DOC_A,
          {
            idTrabajador: TRABAJADOR_B,
            fechaNotaMedica: '2024-01-01',
          },
          USER_A,
        ),
      ).rejects.toMatchObject({
        message: expect.stringContaining('reasignar'),
      });
    });

    it('17. finalize cross-org: deny', async () => {
      const { service } = createIsolationService();
      await expect(
        service.finalizarDocumento('notaMedica', DOC_B, USER_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('18. delete cross-org: deny (sin eliminación cross-org)', async () => {
      const { service, findByIdAndDelete } = createIsolationService();
      await expect(
        service.removeDocument('notaMedica', DOC_B, USER_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(findByIdAndDelete).not.toHaveBeenCalled();
    });
  });

  describe('19–21 — list / conteos / pdf-status (sin inferencia cross-org)', () => {
    it('19. list cross-org: deny', async () => {
      const { service } = createIsolationService();
      await expect(
        service.findAllDocuments(TRABAJADOR_B, USER_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('20. conteos cross-org: deny', async () => {
      const { service } = createIsolationService();
      await expect(
        service.countDocumentosByTrabajador(TRABAJADOR_B, USER_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('20b. altura y motivo cross-org: deny', async () => {
      const { service } = createIsolationService();
      await expect(
        service.getAlturaDisponible(TRABAJADOR_B, USER_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.getMotivoExamenReciente(TRABAJADOR_B, USER_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('21. pdf-status cross-org: deny', async () => {
      const { service } = createIsolationService();
      await expect(
        service.getDocumentPdfStatus('notaMedica', DOC_B, USER_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.setPdfStatus('notaMedica', DOC_B, PdfStatus.GENERATING, USER_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('21b. conteos propios: allow sobre canónico', async () => {
      const { service, oas } = createIsolationService();
      await service.countDocumentosByTrabajador(TRABAJADOR_A, USER_A);
      expect(oas.assertUserCanAccessTrabajadorId).toHaveBeenCalledWith(
        USER_A,
        TRABAJADOR_A,
      );
    });
  });

  describe('22 — upload OAS antes de escribir (IMP-009 intacto)', () => {
    it('upload cross-org: deny antes de persistir', async () => {
      const { service, save } = createIsolationService();
      const writeFile = fs.writeFile as jest.Mock;
      const mkdir = fs.mkdir as jest.Mock;
      writeFile.mockClear();
      mkdir.mockClear();
      await expect(
        service.uploadDocument(
          {
            idTrabajador: TRABAJADOR_B,
            fechaDocumento: '2024-10-25T07:00:00.000Z',
            nombreDocumento: 'Lab',
          },
          { buffer: Buffer.from('%PDF'), originalname: 'lab.pdf' } as any,
          TRABAJADOR_B,
          USER_A,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(save).not.toHaveBeenCalled();
      expect(writeFile).not.toHaveBeenCalled();
      expect(mkdir).not.toHaveBeenCalled();
    });
  });

  describe('detecciones alcanzables', () => {
    it('create deteccion cross-org: deny', async () => {
      const { service, save } = createIsolationService();
      await expect(
        service.createDeteccion(
          { idTrabajador: TRABAJADOR_B },
          USER_A,
          TRABAJADOR_B,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(save).not.toHaveBeenCalled();
    });

    it('update / delete / finalizar deteccion cross-org: deny', async () => {
      const { service } = createIsolationService({
        documents: {
          [DOC_B]: { _id: DOC_B, idTrabajador: TRABAJADOR_B },
        },
      });
      await expect(
        service.updateDeteccion(DOC_B, { idTrabajador: TRABAJADOR_B }, USER_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.deleteDeteccion(DOC_B, USER_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.finalizarDeteccion(DOC_B, USER_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('OAS real — aislamiento entre proveedores', () => {
    const PROVEEDOR_A = '507f1f77bcf86cd799431001';
    const PROVEEDOR_B = '507f1f77bcf86cd799431002';
    const EMPRESA_PROV_A = '507f1f77bcf86cd799431011';
    const EMPRESA_PROV_B = '507f1f77bcf86cd799431012';
    const CENTRO_PROV_A = '507f1f77bcf86cd799431021';
    const CENTRO_PROV_B = '507f1f77bcf86cd799431022';

    function mockExec(value: unknown) {
      return { exec: jest.fn().mockResolvedValue(value) };
    }

    function createServiceWithRealOas() {
      const trabajadores: Record<string, { _id: string; idCentroTrabajo: string }> =
        {
          [TRABAJADOR_A]: { _id: TRABAJADOR_A, idCentroTrabajo: CENTRO_PROV_A },
          [TRABAJADOR_B]: { _id: TRABAJADOR_B, idCentroTrabajo: CENTRO_PROV_B },
        };
      const centros: Record<string, { _id: string; idEmpresa: string }> = {
        [CENTRO_PROV_A]: { _id: CENTRO_PROV_A, idEmpresa: EMPRESA_PROV_A },
        [CENTRO_PROV_B]: { _id: CENTRO_PROV_B, idEmpresa: EMPRESA_PROV_B },
      };
      const empresas: Record<string, { _id: string; idProveedorSalud: string }> =
        {
          [EMPRESA_PROV_A]: {
            _id: EMPRESA_PROV_A,
            idProveedorSalud: PROVEEDOR_A,
          },
          [EMPRESA_PROV_B]: {
            _id: EMPRESA_PROV_B,
            idProveedorSalud: PROVEEDOR_B,
          },
        };
      const users: Record<string, object> = {
        [USER_PRINCIPAL_A]: {
          _id: USER_PRINCIPAL_A,
          role: 'Principal',
          idProveedorSalud: PROVEEDOR_A,
          centrosTrabajoAsignados: [],
          permisos: {},
        },
        [USER_A]: {
          _id: USER_A,
          role: 'Médico',
          idProveedorSalud: PROVEEDOR_A,
          centrosTrabajoAsignados: [CENTRO_PROV_A],
          permisos: {},
        },
      };

      const oas = new OrganizationalAccessService(
        { findById: jest.fn((id: string) => mockExec(users[id] ?? null)) } as any,
        {
          findById: jest.fn((id: string) => mockExec(centros[id] ?? null)),
          findOne: jest.fn(),
        } as any,
        { findById: jest.fn((id: string) => mockExec(empresas[id] ?? null)) } as any,
        {
          findById: jest.fn((id: string) => mockExec(trabajadores[id] ?? null)),
        } as any,
      );

      const isolation = createIsolationService({
        documents: {
          [DOC_A]: { _id: DOC_A, idTrabajador: TRABAJADOR_A },
          [DOC_B]: { _id: DOC_B, idTrabajador: TRABAJADOR_B },
        },
      });
      (isolation.service as any).organizationalAccessService = oas;
      return isolation.service;
    }

    it('Principal proveedor A → documento de proveedor B → DENY', async () => {
      const service = createServiceWithRealOas();
      await expect(
        service.findDocument('notaMedica', DOC_B, USER_PRINCIPAL_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('usuario proveedor A → listado trabajador proveedor B → DENY', async () => {
      const service = createServiceWithRealOas();
      await expect(
        service.findAllDocuments(TRABAJADOR_B, USER_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('usuario proveedor A → documento propio A → allow', async () => {
      const service = createServiceWithRealOas();
      const doc = await service.findDocument('notaMedica', DOC_A, USER_A);
      expect(doc).toBeTruthy();
    });
  });
});
