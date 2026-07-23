import { DeletionCascadeService } from './deletion-cascade.service';
import { DocumentoEstado } from 'src/modules/expedientes/enums/documento-estado.enum';

describe('DeletionCascadeService — countResguardedDocs', () => {
  let service: DeletionCascadeService;
  let centroModel: any;
  let trabajadorModel: any;
  let collectionCount: jest.Mock;

  beforeEach(() => {
    collectionCount = jest.fn().mockResolvedValue(0);
    centroModel = {
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      }),
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: 'c1' }]),
          }),
        }),
      }),
    };
    trabajadorModel = {
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      }),
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              { _id: '507f1f77bcf86cd799439001' },
              { _id: '507f1f77bcf86cd799439002' },
            ]),
          }),
        }),
      }),
    };
    const connection = {
      models: {},
      collection: jest.fn().mockReturnValue({
        countDocuments: collectionCount,
      }),
    };
    service = new DeletionCascadeService(
      centroModel,
      trabajadorModel,
      connection as any,
    );
  });

  it('suma conteos de docs FINALIZADO/ANULADO por centro', async () => {
    collectionCount.mockResolvedValue(1);
    const total = await service.countResguardedDocsByCentro(
      '507f1f77bcf86cd7994390aa',
    );
    expect(total).toBeGreaterThan(0);
    expect(collectionCount).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: {
          $in: [DocumentoEstado.FINALIZADO, DocumentoEstado.ANULADO],
        },
      }),
    );
  });

  it('retorna 0 si no hay trabajadores', async () => {
    trabajadorModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    });
    await expect(service.countResguardedDocsByCentro('c')).resolves.toBe(0);
    expect(collectionCount).not.toHaveBeenCalled();
  });
});
