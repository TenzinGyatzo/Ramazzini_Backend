import { BadRequestException } from '@nestjs/common';
import { validateDocumentDateE1ForRegime } from './document-date-e1.helper';

describe('validateDocumentDateE1ForRegime', () => {
  const proveedorId = '507f1f77bcf86cd799439011';
  const trabajadorId = 'trabajador123';
  const fechaNac = new Date('1990-01-01');

  const createDeps = (regime: 'SIRES_NOM024' | 'SIN_REGIMEN') => {
    const trabajadorModel = {
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          idCentroTrabajo: 'centro123',
          fechaNacimiento: fechaNac,
        }),
      }),
    };
    const centroTrabajoModel = {
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ idEmpresa: 'empresa123' }),
      }),
    };
    const empresaModel = {
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ idProveedorSalud: proveedorId }),
      }),
    };
    const regulatoryPolicyService = {
      getRegulatoryPolicy: jest.fn().mockResolvedValue({ regime }),
    };

    return {
      trabajadorModel: trabajadorModel as any,
      centroTrabajoModel: centroTrabajoModel as any,
      empresaModel: empresaModel as any,
      regulatoryPolicyService: regulatoryPolicyService as any,
    };
  };

  it('debe rechazar fecha futura en SIRES_NOM024', async () => {
    const deps = createDeps('SIRES_NOM024');
    const fechaFutura = new Date();
    fechaFutura.setDate(fechaFutura.getDate() + 1);

    await expect(
      validateDocumentDateE1ForRegime(deps, {
        trabajadorId,
        fechaDocumento: fechaFutura,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe permitir fecha futura en SIN_REGIMEN para notaMedica', async () => {
    const deps = createDeps('SIN_REGIMEN');
    const fechaFutura = new Date();
    fechaFutura.setDate(fechaFutura.getDate() + 1);

    await expect(
      validateDocumentDateE1ForRegime(deps, {
        trabajadorId,
        fechaDocumento: fechaFutura,
        documentType: 'notaMedica',
      }),
    ).resolves.toBeUndefined();
  });

  it('debe permitir fecha futura en SIN_REGIMEN para otros documentos', async () => {
    const deps = createDeps('SIN_REGIMEN');
    const fechaFutura = new Date();
    fechaFutura.setDate(fechaFutura.getDate() + 1);

    await expect(
      validateDocumentDateE1ForRegime(deps, {
        trabajadorId,
        fechaDocumento: fechaFutura,
        documentType: 'antidoping',
      }),
    ).resolves.toBeUndefined();
  });

  it('debe rechazar fecha anterior a nacimiento en SIN_REGIMEN notaMedica', async () => {
    const deps = createDeps('SIN_REGIMEN');

    await expect(
      validateDocumentDateE1ForRegime(deps, {
        trabajadorId,
        fechaDocumento: new Date('1989-12-31'),
        documentType: 'notaMedica',
      }),
    ).rejects.toThrow(
      'La fecha del documento no puede ser anterior a la fecha de nacimiento del trabajador',
    );
  });
});
