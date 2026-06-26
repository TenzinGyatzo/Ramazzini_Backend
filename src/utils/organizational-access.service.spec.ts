import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationalAccessService } from './organizational-access.service';

describe('OrganizationalAccessService', () => {
  let service: OrganizationalAccessService;
  let userModel: { findById: jest.Mock };
  let centroTrabajoModel: { findById: jest.Mock };
  let empresaModel: { findById: jest.Mock };
  let trabajadorModel: { findById: jest.Mock };

  const proveedorId = '507f1f77bcf86cd799439011';
  const empresaId = '507f1f77bcf86cd799439012';
  const centroId = '507f1f77bcf86cd799439013';
  const trabajadorId = '507f1f77bcf86cd799439014';
  const userId = '507f1f77bcf86cd799439015';

  const principalUser = {
    _id: userId,
    role: 'Principal',
    idProveedorSalud: proveedorId,
    centrosTrabajoAsignados: [],
    permisos: {},
  };

  const limitedUser = {
    _id: userId,
    role: 'Médico',
    idProveedorSalud: proveedorId,
    centrosTrabajoAsignados: [centroId],
    permisos: {},
  };

  const otherTenantUser = {
    _id: userId,
    role: 'Principal',
    idProveedorSalud: '507f1f77bcf86cd799439099',
    centrosTrabajoAsignados: [],
    permisos: {},
  };

  beforeEach(() => {
    userModel = { findById: jest.fn() };
    centroTrabajoModel = { findById: jest.fn() };
    empresaModel = { findById: jest.fn() };
    trabajadorModel = { findById: jest.fn() };

    service = new OrganizationalAccessService(
      userModel as any,
      centroTrabajoModel as any,
      empresaModel as any,
      trabajadorModel as any,
    );
  });

  function mockExec<T>(value: T) {
    return { exec: jest.fn().mockResolvedValue(value) };
  }

  describe('assertUserCanAccessCentro', () => {
    it('permite Principal del mismo proveedor', async () => {
      userModel.findById.mockReturnValue(mockExec(principalUser));
      centroTrabajoModel.findById.mockReturnValue(
        mockExec({ _id: centroId, idEmpresa: empresaId }),
      );
      empresaModel.findById.mockReturnValue(
        mockExec({ _id: empresaId, idProveedorSalud: proveedorId }),
      );

      await expect(
        service.assertUserCanAccessCentro(userId, empresaId, centroId),
      ).resolves.toBeUndefined();
    });

    it('rechaza usuario de otro proveedor', async () => {
      userModel.findById.mockReturnValue(mockExec(otherTenantUser));
      centroTrabajoModel.findById.mockReturnValue(
        mockExec({ _id: centroId, idEmpresa: empresaId }),
      );
      empresaModel.findById.mockReturnValue(
        mockExec({ _id: empresaId, idProveedorSalud: proveedorId }),
      );

      await expect(
        service.assertUserCanAccessCentro(userId, empresaId, centroId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza usuario limitado sin centro asignado', async () => {
      userModel.findById.mockReturnValue(
        mockExec({
          ...limitedUser,
          centrosTrabajoAsignados: ['507f1f77bcf86cd799439088'],
        }),
      );
      centroTrabajoModel.findById.mockReturnValue(
        mockExec({ _id: centroId, idEmpresa: empresaId }),
      );
      empresaModel.findById.mockReturnValue(
        mockExec({ _id: empresaId, idProveedorSalud: proveedorId }),
      );

      await expect(
        service.assertUserCanAccessCentro(userId, empresaId, centroId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza cuando empresa no coincide con centro', async () => {
      userModel.findById.mockReturnValue(mockExec(principalUser));
      centroTrabajoModel.findById.mockReturnValue(
        mockExec({ _id: centroId, idEmpresa: '507f1f77bcf86cd799439077' }),
      );

      await expect(
        service.assertUserCanAccessCentro(userId, empresaId, centroId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFound cuando el centro no existe', async () => {
      userModel.findById.mockReturnValue(mockExec(principalUser));
      centroTrabajoModel.findById.mockReturnValue(mockExec(null));

      await expect(
        service.assertUserCanAccessCentro(userId, empresaId, centroId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertUserCanAccessTrabajador', () => {
    it('permite acceso cuando trabajador pertenece a empresa y tenant coincide', async () => {
      trabajadorModel.findById.mockReturnValue(
        mockExec({ _id: trabajadorId, idCentroTrabajo: centroId }),
      );
      centroTrabajoModel.findById.mockReturnValue(
        mockExec({ _id: centroId, idEmpresa: empresaId }),
      );
      empresaModel.findById.mockReturnValue(
        mockExec({ _id: empresaId, idProveedorSalud: proveedorId }),
      );
      userModel.findById.mockReturnValue(mockExec(limitedUser));

      await expect(
        service.assertUserCanAccessTrabajador(userId, empresaId, trabajadorId),
      ).resolves.toBeUndefined();
    });

    it('rechaza cuando empresaId no coincide con el centro del trabajador', async () => {
      trabajadorModel.findById.mockReturnValue(
        mockExec({ _id: trabajadorId, idCentroTrabajo: centroId }),
      );
      centroTrabajoModel.findById.mockReturnValue(
        mockExec({ _id: centroId, idEmpresa: '507f1f77bcf86cd799439077' }),
      );

      await expect(
        service.assertUserCanAccessTrabajador(userId, empresaId, trabajadorId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza usuario de otro proveedor', async () => {
      trabajadorModel.findById.mockReturnValue(
        mockExec({ _id: trabajadorId, idCentroTrabajo: centroId }),
      );
      centroTrabajoModel.findById.mockReturnValue(
        mockExec({ _id: centroId, idEmpresa: empresaId }),
      );
      empresaModel.findById.mockReturnValue(
        mockExec({ _id: empresaId, idProveedorSalud: proveedorId }),
      );
      userModel.findById.mockReturnValue(mockExec(otherTenantUser));

      await expect(
        service.assertUserCanAccessTrabajador(userId, empresaId, trabajadorId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFound cuando el trabajador no existe', async () => {
      trabajadorModel.findById.mockReturnValue(mockExec(null));

      await expect(
        service.assertUserCanAccessTrabajador(userId, empresaId, trabajadorId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertUserCanAccessClinicalPath', () => {
    const clinicalPath = `expedientes-medicos/Empresa/Centro/Juan_${trabajadorId}/Historia Clinica.pdf`;

    it('permite acceso con ruta válida del mismo tenant', async () => {
      trabajadorModel.findById.mockReturnValue(
        mockExec({ _id: trabajadorId, idCentroTrabajo: centroId }),
      );
      centroTrabajoModel.findById.mockReturnValue(
        mockExec({ _id: centroId, idEmpresa: empresaId }),
      );
      empresaModel.findById.mockReturnValue(
        mockExec({ _id: empresaId, idProveedorSalud: proveedorId }),
      );
      userModel.findById.mockReturnValue(mockExec(limitedUser));

      await expect(
        service.assertUserCanAccessClinicalPath(userId, clinicalPath),
      ).resolves.toBeUndefined();
    });

    it('rechaza ruta sin trabajadorId reconocible', async () => {
      await expect(
        service.assertUserCanAccessClinicalPath(
          userId,
          'expedientes-medicos/Empresa/Centro/sin-id/archivo.pdf',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza trabajador de otro tenant', async () => {
      trabajadorModel.findById.mockReturnValue(
        mockExec({ _id: trabajadorId, idCentroTrabajo: centroId }),
      );
      centroTrabajoModel.findById.mockReturnValue(
        mockExec({ _id: centroId, idEmpresa: empresaId }),
      );
      empresaModel.findById.mockReturnValue(
        mockExec({ _id: empresaId, idProveedorSalud: proveedorId }),
      );
      userModel.findById.mockReturnValue(mockExec(otherTenantUser));

      await expect(
        service.assertUserCanAccessClinicalPath(userId, clinicalPath),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('extractTrabajadorIdFromClinicalPath', () => {
    it('extrae ObjectId del segmento de carpeta del trabajador', () => {
      expect(
        service.extractTrabajadorIdFromClinicalPath(
          `expedientes-medicos/Empresa/Centro/Maria_Lopez_${trabajadorId}/doc.pdf`,
        ),
      ).toBe(trabajadorId);
    });

    it('extrae ObjectId cuando el nombre del centro contiene barra', () => {
      const acerosTrabajadorId = '6a3d25e4cd1e8332593053fc';
      expect(
        service.extractTrabajadorIdFromClinicalPath(
          `expedientes-medicos/ACEROS DE GUATEMALA/MEGA PRODUCTO / NUEVOS INGRESOS/JAIME EMANUEL_${acerosTrabajadorId}/Examen Vista 25-06-2026.pdf`,
        ),
      ).toBe(acerosTrabajadorId);
    });
  });
});
