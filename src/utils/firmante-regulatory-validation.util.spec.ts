import { BadRequestException } from '@nestjs/common';
import { buildFirmanteRegulatoryPayload, validateFirmanteRegulatoryFields } from './firmante-regulatory-validation.util';
import { CatalogsService } from '../modules/catalogs/catalogs.service';
import { GeographyValidator } from '../modules/catalogs/validators/geography.validator';
import { RegulatoryPolicy } from './regulatory-policy.service';
import { RegulatoryErrorCode } from './regulatory-error-codes';

describe('buildFirmanteRegulatoryPayload', () => {
  it('debe incluir apellidos para cruce CURP A1', () => {
    const payload = buildFirmanteRegulatoryPayload({
      nombre: 'JUAN',
      primerApellido: 'GARCIA',
      segundoApellido: 'LOPEZ',
      curp: 'GALJ900515HDFRPN08',
      sexo: 'Masculino',
      fechaNacimiento: new Date('1990-05-15'),
      entidadNacimiento: '09',
      paisNacimiento: 142,
    });

    expect(payload.primerApellido).toBe('GARCIA');
    expect(payload.segundoApellido).toBe('LOPEZ');
    expect(payload.nombre).toBe('JUAN');
  });

  it('debe normalizar sexoCURP en el payload', () => {
    const payload = buildFirmanteRegulatoryPayload({
      sexoCURP: '3',
    });

    expect(payload.sexoCURP).toBe(3);
  });
});

const siresCurpPolicy: RegulatoryPolicy = {
  regime: 'SIRES_NOM024',
  features: {
    sessionTimeoutEnabled: true,
    enforceDocumentImmutabilityUI: true,
    documentImmutabilityEnabled: true,
    showSiresUI: true,
    giisExportEnabled: true,
    notaAclaratoriaEnabled: true,
    cluesFieldVisible: true,
    dailyConsentEnabled: true,
    confidentialityAgreementEnabled: true,
    workerIdentificationImmutable: true,
    auditTrailEnabled: true,
    controlPrenatalEnabled: false,
  },
  validation: {
    curpFirmantes: 'required',
    workerCurp: 'optional',
    cie10Principal: 'required',
    geoFields: 'optional',
  },
};

const mockCatalogsService = {
  validateINEGI: jest.fn().mockResolvedValue(true),
  validateGIISPais: jest.fn().mockReturnValue({ catalogLoaded: false, valid: true }),
} as unknown as CatalogsService;

const mockGeographyValidator = {
  validateGeography: jest.fn().mockResolvedValue({ valid: true, errors: [] }),
} as unknown as GeographyValidator;

describe('validateFirmanteRegulatoryFields sexoCURP', () => {
  it('SIRES exige sexoCURP cuando CURP de firmante es obligatorio', async () => {
    await expect(
      validateFirmanteRegulatoryFields(
        siresCurpPolicy,
        {
          nombre: 'JUAN',
          primerApellido: 'GARCIA',
          segundoApellido: 'LOPEZ',
          curp: 'GALJ900515HDFRPN08',
          fechaNacimiento: new Date('1990-05-15'),
          entidadNacimiento: '09',
        },
        mockCatalogsService,
        mockGeographyValidator,
      ),
    ).rejects.toThrow(BadRequestException);

    try {
      await validateFirmanteRegulatoryFields(
        siresCurpPolicy,
        {
          nombre: 'JUAN',
          primerApellido: 'GARCIA',
          segundoApellido: 'LOPEZ',
          curp: 'GALJ900515HDFRPN08',
          fechaNacimiento: new Date('1990-05-15'),
          entidadNacimiento: '09',
        },
        mockCatalogsService,
        mockGeographyValidator,
      );
    } catch (error) {
      const response = (error as BadRequestException).getResponse() as {
        errorCode: string;
        details?: { fieldName?: string };
      };
      expect(response.errorCode).toBe(
        RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED,
      );
      expect(response.details?.fieldName).toBe('sexoCURP');
    }
  });
});

const siresGeoPolicy: RegulatoryPolicy = {
  ...siresCurpPolicy,
  validation: {
    ...siresCurpPolicy.validation,
    geoFields: 'required',
  },
};

describe('validateFirmanteRegulatoryFields firmante extranjero', () => {
  it('acepta entidad 88 y CURP genérica sin consultar INEGI', async () => {
    const validateINEGI = jest.fn().mockImplementation(async (type, code) => {
      if (type === 'estado' && code === '88') return false;
      return true;
    });
    const mockCatalogs = {
      validateINEGI,
      validateGIISPais: jest.fn().mockReturnValue({ catalogLoaded: false, valid: true }),
    } as unknown as CatalogsService;

    await expect(
      validateFirmanteRegulatoryFields(
        siresGeoPolicy,
        {
          nombre: 'JUAN',
          primerApellido: 'GARCIA',
          segundoApellido: 'LOPEZ',
          curp: 'XXXX999999XXXXXX99',
          sexoCURP: 1,
          fechaNacimiento: new Date('1990-05-15'),
          paisNacimiento: 246,
          entidadNacimiento: '88',
          paisResidencia: 142,
          entidadResidencia: '09',
          municipioResidencia: '001',
          localidadResidencia: '0001',
        },
        mockCatalogs,
        mockGeographyValidator,
      ),
    ).resolves.toBeUndefined();

    expect(validateINEGI).not.toHaveBeenCalledWith('estado', '88');
  });
});
