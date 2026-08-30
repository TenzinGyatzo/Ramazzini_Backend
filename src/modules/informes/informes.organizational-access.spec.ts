import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getUserIdFromRequest } from '../../utils/auth-helpers';
import { PdfStatus } from '../expedientes/enums/pdf-status.enum';
import { InformesController } from './informes.controller';
import { InformesService } from './informes.service';

jest.mock('../../utils/auth-helpers', () => ({
  getUserIdFromRequest: jest.fn(),
}));

const USER_A = '507f1f77bcf86cd7994390aa';
const USER_B = '507f1f77bcf86cd7994390bb';
const USER_PRINCIPAL_A = '507f1f77bcf86cd7994390dd';
const EMPRESA_A = '507f1f77bcf86cd799439031';
const TRABAJADOR_A = '507f1f77bcf86cd799439011';
const DOC_A = '507f1f77bcf86cd799439021';
const DOC_B = '507f1f77bcf86cd799439022';

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('IMP-008 — informes: actor JWT, no userId de URL', () => {
  const getUserId = getUserIdFromRequest as jest.MockedFunction<
    typeof getUserIdFromRequest
  >;

  describe('controller: procedencia del actor', () => {
    let controller: InformesController;
    let getInformeAntidoping: jest.Mock;

    beforeEach(() => {
      getUserId.mockReset();
      getUserId.mockReturnValue(USER_A);
      getInformeAntidoping = jest.fn().mockResolvedValue('/ok.pdf');
      controller = new InformesController(
        { getInformeAntidoping } as any,
        {} as any,
        {} as any,
        {} as any,
      );
    });

    it('caso 1 — bypass descubierto: JWT A + URL A + doc B + userId B → DENY y actor = JWT A', async () => {
      getInformeAntidoping.mockRejectedValue(
        new ForbiddenException('No tiene permiso para acceder a este recurso'),
      );
      const res = mockRes();

      await expect(
        controller.getInformeAntidoping(
          EMPRESA_A,
          TRABAJADOR_A,
          DOC_B,
          USER_B,
          {} as any,
          res as any,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(getInformeAntidoping).toHaveBeenCalledWith(
        EMPRESA_A,
        TRABAJADOR_A,
        DOC_B,
        USER_B,
        USER_A,
      );
      expect(getInformeAntidoping.mock.calls[0][4]).toBe(USER_A);
      expect(getInformeAntidoping.mock.calls[0][4]).not.toBe(USER_B);
      expect(res.status).not.toHaveBeenCalledWith(500);
    });

    it('caso 2 — JWT A + URL A + doc B + userId A → DENY; actor = JWT A', async () => {
      getInformeAntidoping.mockRejectedValue(new ForbiddenException());
      const res = mockRes();

      await expect(
        controller.getInformeAntidoping(
          EMPRESA_A,
          TRABAJADOR_A,
          DOC_B,
          USER_A,
          {} as any,
          res as any,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(getInformeAntidoping).toHaveBeenCalledWith(
        EMPRESA_A,
        TRABAJADOR_A,
        DOC_B,
        USER_A,
        USER_A,
      );
    });

    it('caso 3 — JWT A + doc A + userId URL B: userId B no altera el actor', async () => {
      const res = mockRes();
      await controller.getInformeAntidoping(
        EMPRESA_A,
        TRABAJADOR_A,
        DOC_A,
        USER_B,
        {} as any,
        res as any,
      );

      expect(getInformeAntidoping).toHaveBeenCalledWith(
        EMPRESA_A,
        TRABAJADOR_A,
        DOC_A,
        USER_B,
        USER_A,
      );
      expect(getInformeAntidoping.mock.calls[0][4]).toBe(USER_A);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('caso 4 — flujo normal JWT A + doc A + userId A', async () => {
      const res = mockRes();
      await controller.getInformeAntidoping(
        EMPRESA_A,
        TRABAJADOR_A,
        DOC_A,
        USER_A,
        {} as any,
        res as any,
      );

      expect(getInformeAntidoping).toHaveBeenCalledWith(
        EMPRESA_A,
        TRABAJADOR_A,
        DOC_A,
        USER_A,
        USER_A,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('caso 5 — Principal JWT A: actor es el JWT, no el userId de URL', async () => {
      getUserId.mockReturnValue(USER_PRINCIPAL_A);
      const res = mockRes();
      await controller.getInformeAntidoping(
        EMPRESA_A,
        TRABAJADOR_A,
        DOC_A,
        USER_B,
        {} as any,
        res as any,
      );

      expect(getInformeAntidoping.mock.calls[0][4]).toBe(USER_PRINCIPAL_A);
      expect(getInformeAntidoping.mock.calls[0][4]).not.toBe(USER_B);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('ForbiddenException de OAS no se convierte en 500', async () => {
      getInformeAntidoping.mockRejectedValue(new ForbiddenException('deny'));
      const res = mockRes();
      await expect(
        controller.getInformeAntidoping(
          EMPRESA_A,
          TRABAJADOR_A,
          DOC_B,
          USER_B,
          {} as any,
          res as any,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(res.status).not.toHaveBeenCalledWith(500);
    });

    it('NotFoundException de OAS no se convierte en 500', async () => {
      getInformeAntidoping.mockRejectedValue(
        new NotFoundException('Trabajador no encontrado'),
      );
      const res = mockRes();
      await expect(
        controller.getInformeAntidoping(
          EMPRESA_A,
          TRABAJADOR_A,
          DOC_B,
          USER_B,
          {} as any,
          res as any,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(res.status).not.toHaveBeenCalledWith(500);
    });
  });

  describe('service: ExpedientesService recibe actorUserId JWT', () => {
    it('findDocumentLean y setPdfStatus usan actor JWT, nunca userId de URL', async () => {
      const findDocumentLean = jest
        .fn()
        .mockRejectedValue(new ForbiddenException());
      const setPdfStatus = jest.fn().mockRejectedValue(new ForbiddenException());
      const service = Object.create(
        InformesService.prototype,
      ) as InformesService;
      (service as any).expedientesService = {
        findDocumentLean,
        setPdfStatus,
      };
      (service as any).empresasService = {
        findOne: jest.fn().mockResolvedValue({ nombreComercial: 'A' }),
      };
      (service as any).trabajadoresService = {
        findOne: jest.fn().mockResolvedValue({ nombre: 'A' }),
      };

      await expect(
        service.getInformeAntidoping(
          EMPRESA_A,
          TRABAJADOR_A,
          DOC_B,
          USER_B,
          USER_A,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(setPdfStatus).toHaveBeenCalledWith(
        'antidoping',
        DOC_B,
        PdfStatus.GENERATING,
        USER_A,
      );
      expect(findDocumentLean).toHaveBeenCalledWith(
        'antidoping',
        DOC_B,
        USER_A,
      );
      for (const call of findDocumentLean.mock.calls) {
        expect(call[2]).toBe(USER_A);
        expect(call[2]).not.toBe(USER_B);
      }
      for (const call of setPdfStatus.mock.calls) {
        expect(call[3]).toBe(USER_A);
        expect(call[3]).not.toBe(USER_B);
      }
    });

    it('caso 3 service: userId URL B no se pasa como actor sobre doc A', async () => {
      const findDocumentLean = jest
        .fn()
        .mockRejectedValue(new ForbiddenException('gate'));
      const setPdfStatus = jest.fn().mockResolvedValue(undefined);
      const service = Object.create(
        InformesService.prototype,
      ) as InformesService;
      (service as any).expedientesService = {
        findDocumentLean,
        setPdfStatus,
      };
      (service as any).empresasService = {
        findOne: jest.fn().mockResolvedValue({}),
      };
      (service as any).trabajadoresService = {
        findOne: jest.fn().mockResolvedValue({}),
      };

      await expect(
        service.getInformeAntidoping(
          EMPRESA_A,
          TRABAJADOR_A,
          DOC_A,
          USER_B,
          USER_A,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(findDocumentLean).toHaveBeenCalledWith(
        'antidoping',
        DOC_A,
        USER_A,
      );
      expect(findDocumentLean).not.toHaveBeenCalledWith(
        'antidoping',
        DOC_A,
        USER_B,
      );
    });
  });
});
