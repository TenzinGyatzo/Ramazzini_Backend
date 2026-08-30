import { ExpedientesService } from './expedientes.service';
import { DocumentoEstado } from './enums/documento-estado.enum';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';

const PROVEEDOR_ID = '507f1f77bcf86cd799439011';
const DOC_ID = '507f1f77bcf86cd799439012';
const TRABAJADOR_ID = '507f1f77bcf86cd799439013';
const ACTOR_ID = 'actor-123';

describe('ExpedientesService — DOC_FINALIZE / DOC_ANULATE', () => {
  let service: ExpedientesService;
  let auditService: { record: jest.Mock };

  const createDocument = (estado: DocumentoEstado) => ({
    _id: { toString: () => DOC_ID },
    estado,
    idTrabajador: { toString: () => TRABAJADOR_ID },
    createdBy: { toString: () => ACTOR_ID },
    pdfStatus: undefined,
    rutaPDF: undefined,
    save: jest.fn().mockImplementation(function (this: { estado: DocumentoEstado }) {
      return Promise.resolve(this);
    }),
  });

  beforeEach(() => {
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    service = Object.create(ExpedientesService.prototype) as ExpedientesService;
    (service as any).auditService = auditService;
    (service as any).assertDocumentTypeEnabledForRegime = jest
      .fn()
      .mockResolvedValue(undefined);
    (service as any).resolveProveedorSaludIdOrFail = jest
      .fn()
      .mockResolvedValue(PROVEEDOR_ID);
    (service as any).tryCapturarFichaSnapshot = jest.fn().mockResolvedValue(null);
    (service as any).actualizarUpdatedAtTrabajador = jest
      .fn()
      .mockResolvedValue(undefined);
    (service as any).informesService = {
      regenerarInformeAlFinalizar: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).nom024Util = {
      requiresNOM024Compliance: jest.fn().mockResolvedValue(false),
    };
    (service as any).getProveedorSaludIdFromDocument = jest
      .fn()
      .mockResolvedValue(PROVEEDOR_ID);
    (service as any).isDocumentImmutable = jest.fn().mockResolvedValue(true);
    (service as any).regulatoryPolicyService = {
      getRegulatoryPolicy: jest.fn().mockResolvedValue({
        regime: 'SIRES_NOM024',
        features: { auditTrailEnabled: true },
      }),
    };
    (service as any).organizationalAccessService = {
      assertUserCanAccessTrabajadorId: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).workerFusionService = {
      getCanonicalTrabajadorId: jest.fn(async (id: string) => id),
    };
  });

  describe('finalizarDocumento', () => {
    it('emite DOC_FINALIZE Clase 1 con proveedor resuelto', async () => {
      const document = createDocument(DocumentoEstado.BORRADOR);
      (service as any).models = {
        historiaClinica: {
          findById: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(document),
          }),
        },
      };

      await service.finalizarDocumento(
        'historiaClinica',
        DOC_ID,
        ACTOR_ID,
        PROVEEDOR_ID,
      );

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: AuditActionType.DOC_FINALIZE,
          eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
          proveedorSaludId: PROVEEDOR_ID,
          actorId: ACTOR_ID,
          resourceType: 'historiaClinica',
          resourceId: DOC_ID,
          payload: expect.objectContaining({
            estadoAnterior: DocumentoEstado.BORRADOR,
            estadoNuevo: DocumentoEstado.FINALIZADO,
            documentType: 'historiaClinica',
            documentId: DOC_ID,
            trabajadorId: TRABAJADOR_ID,
          }),
        }),
      );
      expect(document.save).toHaveBeenCalled();
      expect(document.estado).toBe(DocumentoEstado.FINALIZADO);
    });

    it('si record rechaza, no llama save', async () => {
      auditService.record.mockRejectedValue(new Error('audit down'));
      const document = createDocument(DocumentoEstado.BORRADOR);
      (service as any).models = {
        historiaClinica: {
          findById: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(document),
          }),
        },
      };

      await expect(
        service.finalizarDocumento('historiaClinica', DOC_ID, ACTOR_ID),
      ).rejects.toThrow('audit down');

      expect(document.save).not.toHaveBeenCalled();
      expect(document.estado).toBe(DocumentoEstado.BORRADOR);
    });

    it('no emite DOC_FINALIZE en SIN_REGIMEN', async () => {
      (service as any).regulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
        {
          regime: 'SIN_REGIMEN',
          features: { auditTrailEnabled: true },
        },
      );
      const document = createDocument(DocumentoEstado.BORRADOR);
      (service as any).models = {
        historiaClinica: {
          findById: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(document),
          }),
        },
      };

      await service.finalizarDocumento(
        'historiaClinica',
        DOC_ID,
        ACTOR_ID,
        PROVEEDOR_ID,
      );

      expect(auditService.record).not.toHaveBeenCalled();
      expect(document.save).toHaveBeenCalled();
      expect(document.estado).toBe(DocumentoEstado.FINALIZADO);
    });
  });

  describe('removeDocument', () => {
    it('emite DOC_ANULATE Clase 1 antes de save', async () => {
      const document = createDocument(DocumentoEstado.FINALIZADO);
      document.save.mockImplementation(function (this: { estado: DocumentoEstado }) {
        expect(auditService.record).toHaveBeenCalled();
        return Promise.resolve(this);
      });
      (service as any).models = {
        historiaClinica: {
          findById: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(document),
          }),
        },
      };

      const result = await service.removeDocument(
        'historiaClinica',
        DOC_ID,
        ACTOR_ID,
        'Error de captura',
      );

      expect(result).toEqual({ deleted: false, anulado: true });
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: AuditActionType.DOC_ANULATE,
          eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
          proveedorSaludId: PROVEEDOR_ID,
          actorId: ACTOR_ID,
          resourceType: 'historiaClinica',
          resourceId: DOC_ID,
          payload: expect.objectContaining({
            estadoAnterior: DocumentoEstado.FINALIZADO,
            estadoNuevo: DocumentoEstado.ANULADO,
            razonAnulacion: 'Error de captura',
            trabajadorId: TRABAJADOR_ID,
          }),
        }),
      );
      expect(document.save).toHaveBeenCalled();
      expect(document.estado).toBe(DocumentoEstado.ANULADO);
    });

    it('si record rechaza, el estado no cambia y no llama save', async () => {
      auditService.record.mockRejectedValue(new Error('audit down'));
      const document = createDocument(DocumentoEstado.FINALIZADO);
      (service as any).models = {
        historiaClinica: {
          findById: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(document),
          }),
        },
      };

      await expect(
        service.removeDocument(
          'historiaClinica',
          DOC_ID,
          ACTOR_ID,
          'Error de captura',
        ),
      ).rejects.toThrow('audit down');

      expect(document.save).not.toHaveBeenCalled();
      expect(document.estado).toBe(DocumentoEstado.FINALIZADO);
    });

    it('no emite DOC_ANULATE en SIN_REGIMEN', async () => {
      (service as any).regulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
        {
          regime: 'SIN_REGIMEN',
          features: { auditTrailEnabled: true },
        },
      );
      const document = createDocument(DocumentoEstado.FINALIZADO);
      (service as any).models = {
        historiaClinica: {
          findById: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(document),
          }),
        },
      };

      const result = await service.removeDocument(
        'historiaClinica',
        DOC_ID,
        ACTOR_ID,
        'Error de captura',
      );

      expect(result).toEqual({ deleted: false, anulado: true });
      expect(auditService.record).not.toHaveBeenCalled();
      expect(document.save).toHaveBeenCalled();
      expect(document.estado).toBe(DocumentoEstado.ANULADO);
    });
  });

  describe('finalizarDeteccion', () => {
    it('emite DOC_FINALIZE Clase 1', async () => {
      const deteccion = {
        ...createDocument(DocumentoEstado.BORRADOR),
        populate: jest.fn().mockResolvedValue(undefined),
      };
      deteccion.save.mockResolvedValue(deteccion);
      (service as any).deteccionModel = {
        findById: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(deteccion),
        }),
      };

      await service.finalizarDeteccion(DOC_ID, ACTOR_ID);

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: AuditActionType.DOC_FINALIZE,
          eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
          proveedorSaludId: PROVEEDOR_ID,
          resourceType: 'deteccion',
          resourceId: DOC_ID,
        }),
      );
      expect(deteccion.save).toHaveBeenCalled();
      expect(deteccion.estado).toBe(DocumentoEstado.FINALIZADO);
    });

    it('si record rechaza, no llama save', async () => {
      auditService.record.mockRejectedValue(new Error('audit down'));
      const deteccion = createDocument(DocumentoEstado.BORRADOR);
      (service as any).deteccionModel = {
        findById: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(deteccion),
        }),
      };

      await expect(
        service.finalizarDeteccion(DOC_ID, ACTOR_ID),
      ).rejects.toThrow('audit down');

      expect(deteccion.save).not.toHaveBeenCalled();
      expect(deteccion.estado).toBe(DocumentoEstado.BORRADOR);
    });
  });
});
