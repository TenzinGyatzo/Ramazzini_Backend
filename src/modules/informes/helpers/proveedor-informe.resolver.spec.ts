import { ProveedorInformeResolver } from './proveedor-informe.resolver';
import { DocumentoEstado } from 'src/modules/expedientes/enums/documento-estado.enum';

describe('ProveedorInformeResolver', () => {
  let resolver: ProveedorInformeResolver;
  let usersService: { findById: jest.Mock };
  let proveedoresSaludService: { findOne: jest.Mock };
  let trabajadoresService: { findById: jest.Mock };
  let expedienteColaboracionService: {
    resolveProveedorBranding: jest.Mock;
    findActivaByTrabajadorDestino: jest.Mock;
  };

  const userId = '507f1f77bcf86cd799439015';
  const trabajadorId = '507f1f77bcf86cd799439018';
  const proveedorUsuarioId = '507f1f77bcf86cd799439011';
  const proveedorOrigenId = '507f1f77bcf86cd799439088';
  const colaboracionId = '507f1f77bcf86cd799439020';

  beforeEach(() => {
    usersService = { findById: jest.fn() };
    proveedoresSaludService = { findOne: jest.fn() };
    trabajadoresService = { findById: jest.fn() };
    expedienteColaboracionService = {
      resolveProveedorBranding: jest.fn(),
      findActivaByTrabajadorDestino: jest.fn(),
    };

    resolver = new ProveedorInformeResolver(
      usersService as never,
      proveedoresSaludService as never,
      trabajadoresService as never,
      expedienteColaboracionService as never,
    );
  });

  describe('resolveDatosProveedorSaludParaInforme', () => {
    it('usa branding del proveedor origen bajo colaboración', async () => {
      expedienteColaboracionService.resolveProveedorBranding.mockResolvedValue(
        proveedorOrigenId,
      );
      expedienteColaboracionService.findActivaByTrabajadorDestino.mockResolvedValue(
        { _id: colaboracionId },
      );
      proveedoresSaludService.findOne.mockResolvedValue({
        nombre: 'Proveedor B',
        colorInforme: '#112233',
      });

      const result = await resolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId,
      });

      expect(result.delegated).toBe(true);
      expect(result.proveedorBrandingId).toBe(proveedorOrigenId);
      expect(result.colaboracionId).toBe(colaboracionId);
      expect(result.datos.nombre).toBe('Proveedor B');
      expect(proveedoresSaludService.findOne).toHaveBeenCalledWith(
        proveedorOrigenId,
      );
      expect(usersService.findById).not.toHaveBeenCalled();
    });

    it('usa proveedor del usuario logueado sin colaboración', async () => {
      expedienteColaboracionService.resolveProveedorBranding.mockResolvedValue(null);
      usersService.findById.mockResolvedValue({
        idProveedorSalud: proveedorUsuarioId,
      });
      proveedoresSaludService.findOne.mockResolvedValue({
        nombre: 'Proveedor A',
        colorInforme: '#AABBCC',
      });

      const result = await resolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId,
      });

      expect(result.delegated).toBe(false);
      expect(result.proveedorBrandingId).toBe(proveedorUsuarioId);
      expect(result.datos.nombre).toBe('Proveedor A');
    });
  });

  describe('resolveFirmanteUserIdFromDocument', () => {
    it('prioriza finalizadoPor en documento finalizado', () => {
      const createdBy = '507f1f77bcf86cd799439001';
      const finalizadoPor = '507f1f77bcf86cd799439002';

      expect(
        resolver.resolveFirmanteUserIdFromDocument(
          {
            estado: DocumentoEstado.FINALIZADO,
            createdBy: { _id: createdBy },
            finalizadoPor: { _id: finalizadoPor },
          },
          userId,
        ),
      ).toBe(finalizadoPor);
    });

    it('usa createdBy en borrador', () => {
      const createdBy = '507f1f77bcf86cd799439001';

      expect(
        resolver.resolveFirmanteUserIdFromDocument(
          {
            estado: DocumentoEstado.BORRADOR,
            createdBy: { _id: createdBy },
          },
          userId,
        ),
      ).toBe(createdBy);
    });
  });
});
