import { Types } from 'mongoose';
import { ExpedienteColaboracionService } from './expediente-colaboracion.service';
import { ExpedienteColaboracionEstado } from './enums/expediente-colaboracion-estado.enum';

const mockQuery = <T>(value: T) => {
  const chain = {
    select: jest.fn(),
    lean: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };
  chain.select.mockReturnValue(chain);
  chain.lean.mockReturnValue({ exec: chain.exec });
  return chain;
};

describe('ExpedienteColaboracionService', () => {
  let service: ExpedienteColaboracionService;
  let colaboracionModel: {
    findOne: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
  };
  let centroTrabajoModel: { updateOne: jest.Mock };
  let trabajadorModel: { findById: jest.Mock; findOne: jest.Mock; updateOne: jest.Mock };
  let empresaModel: { findById: jest.Mock };
  let connection: { collection: jest.Mock };

  const proveedorOrigenId = '507f1f77bcf86cd799439011';
  const proveedorDestinoId = '507f1f77bcf86cd799439088';
  const centroDestinoId = '507f1f77bcf86cd799439017';
  const trabajadorOrigenId = '507f1f77bcf86cd799439014';
  const trabajadorDestinoId = '507f1f77bcf86cd799439018';
  const colaboracionId = '507f1f77bcf86cd799439020';

  beforeEach(() => {
    colaboracionModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    centroTrabajoModel = { updateOne: jest.fn().mockResolvedValue({}) };
    trabajadorModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    empresaModel = { findById: jest.fn() };
    connection = { collection: jest.fn() };

    service = new ExpedienteColaboracionService(
      colaboracionModel as never,
      centroTrabajoModel as never,
      trabajadorModel as never,
      empresaModel as never,
      connection as never,
      undefined,
    );
  });

  describe('resolveTrabajadorDestinoPorOrigen', () => {
    it('resuelve trabajador destino con colaboración activa', async () => {
      const colaboracion = {
        _id: colaboracionId,
        proveedorDestinoId,
        estado: ExpedienteColaboracionEstado.ACTIVA,
        trabajadorMap: [
          {
            origenId: new Types.ObjectId(trabajadorOrigenId),
            destinoId: new Types.ObjectId(trabajadorDestinoId),
          },
        ],
      };

      trabajadorModel.findOne.mockReturnValue(
        mockQuery({
          _id: trabajadorDestinoId,
          idCentroTrabajo: centroDestinoId,
        }),
      );
      trabajadorModel.findById.mockReturnValue(
        mockQuery({ idCentroTrabajo: centroDestinoId }),
      );
      colaboracionModel.findOne.mockReturnValue(mockQuery(colaboracion));

      await expect(
        service.resolveTrabajadorDestinoPorOrigen(
          trabajadorOrigenId,
          proveedorDestinoId,
        ),
      ).resolves.toEqual({
        trabajadorDestinoId,
        colaboracionId,
      });
    });

    it('retorna null si el proveedor destino no coincide', async () => {
      trabajadorModel.findOne.mockReturnValue(
        mockQuery({
          _id: trabajadorDestinoId,
          idCentroTrabajo: centroDestinoId,
        }),
      );
      trabajadorModel.findById.mockReturnValue(
        mockQuery({ idCentroTrabajo: centroDestinoId }),
      );
      colaboracionModel.findOne.mockReturnValue(
        mockQuery({
          _id: colaboracionId,
          proveedorDestinoId: '507f1f77bcf86cd799439099',
          trabajadorMap: [
            {
              origenId: new Types.ObjectId(trabajadorOrigenId),
              destinoId: new Types.ObjectId(trabajadorDestinoId),
            },
          ],
        }),
      );

      await expect(
        service.resolveTrabajadorDestinoPorOrigen(
          trabajadorOrigenId,
          proveedorDestinoId,
        ),
      ).resolves.toBeNull();
    });
  });

  describe('resolveProveedorBranding', () => {
    it('devuelve proveedor origen cuando hay colaboración activa', async () => {
      trabajadorModel.findById.mockReturnValue(
        mockQuery({
          idProveedorSaludOrigen: proveedorOrigenId,
          idCentroTrabajo: centroDestinoId,
        }),
      );
      colaboracionModel.findOne.mockReturnValue(
        mockQuery({ _id: colaboracionId, estado: ExpedienteColaboracionEstado.ACTIVA }),
      );

      await expect(
        service.resolveProveedorBranding(trabajadorDestinoId),
      ).resolves.toBe(proveedorOrigenId);
    });

    it('retorna null sin idProveedorSaludOrigen', async () => {
      trabajadorModel.findById.mockReturnValue(
        mockQuery({ idCentroTrabajo: centroDestinoId }),
      );

      await expect(
        service.resolveProveedorBranding(trabajadorDestinoId),
      ).resolves.toBeNull();
    });
  });
});
