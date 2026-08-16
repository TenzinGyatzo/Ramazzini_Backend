import { ForbiddenException } from '@nestjs/common';
import { RegulatoryPolicy } from './regulatory-policy.service';
import { RegulatoryErrorCode } from './regulatory-error-codes';
import {
  getFirmanteImmutableIdentificationFields,
  validateFirmanteIdentificationImmutable,
  FIRMANTE_IMMUTABLE_IDENTIFICATION_FIELDS,
} from './firmante-identification-immutability.util';

const GENERIC_CURP = 'XXXX999999XXXXXX99';
const REAL_CURP = 'ROAJ850102HDFLRN06';

const siresPolicy: RegulatoryPolicy = {
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
    workerCurp: 'required_strict',
    cie10Principal: 'required',
    geoFields: 'required',
  },
};

const sinRegimenPolicy: RegulatoryPolicy = {
  regime: 'SIN_REGIMEN',
  features: {
    sessionTimeoutEnabled: false,
    enforceDocumentImmutabilityUI: false,
    documentImmutabilityEnabled: false,
    showSiresUI: false,
    giisExportEnabled: false,
    notaAclaratoriaEnabled: false,
    cluesFieldVisible: false,
    dailyConsentEnabled: false,
    confidentialityAgreementEnabled: false,
    workerIdentificationImmutable: false,
    auditTrailEnabled: false,
    controlPrenatalEnabled: true,
  },
  validation: {
    curpFirmantes: 'optional',
    workerCurp: 'optional',
    cie10Principal: 'required',
    geoFields: 'optional',
  },
};

function makeFirmante(overrides: Record<string, unknown> = {}) {
  return {
    curp: REAL_CURP,
    nombre: 'JUAN',
    primerApellido: 'RODRIGUEZ',
    segundoApellido: 'LOPEZ',
    fechaNacimiento: new Date('1985-01-02'),
    sexo: 'Masculino',
    entidadNacimiento: '09',
    paisNacimiento: 142,
    toObject() {
      return { ...this };
    },
    ...overrides,
  };
}

describe('Firmante Identification Immutability (SIRES_NOM024)', () => {
  describe('getFirmanteImmutableIdentificationFields', () => {
    it('should return all identification fields when CURP is real', () => {
      const fields = getFirmanteImmutableIdentificationFields({ curp: REAL_CURP });
      expect(fields).toEqual(FIRMANTE_IMMUTABLE_IDENTIFICATION_FIELDS);
    });

    it('should exempt CURP conformation fields when CURP is generic', () => {
      const fields = getFirmanteImmutableIdentificationFields({
        curp: GENERIC_CURP,
      });
      expect(fields).not.toContain('curp');
      expect(fields).not.toContain('nombre');
      expect(fields).not.toContain('primerApellido');
    });
  });

  describe('validateFirmanteIdentificationImmutable', () => {
    it('should allow updates when policy has immutability disabled', () => {
      expect(() =>
        validateFirmanteIdentificationImmutable(
          { primerApellido: 'GARCIA' },
          makeFirmante(),
          sinRegimenPolicy,
        ),
      ).not.toThrow();
    });

    it('should reject changes to immutable fields with real CURP', () => {
      expect(() =>
        validateFirmanteIdentificationImmutable(
          { primerApellido: 'GARCIA' },
          makeFirmante(),
          siresPolicy,
        ),
      ).toThrow(ForbiddenException);

      try {
        validateFirmanteIdentificationImmutable(
          { primerApellido: 'GARCIA' },
          makeFirmante(),
          siresPolicy,
        );
      } catch (error) {
        const response = (error as ForbiddenException).getResponse() as {
          errorCode: string;
          details?: { immutableFields?: string[]; subject?: string };
        };
        expect(response.errorCode).toBe(
          RegulatoryErrorCode.REGIMEN_WORKER_IDENTIFICATION_IMMUTABLE,
        );
        expect(response.details?.subject).toBe('firmante');
        expect(response.details?.immutableFields).toContain('primerApellido');
      }
    });

    it('should reject changes to sexoCURP in SIRES', () => {
      expect(() =>
        validateFirmanteIdentificationImmutable(
          { sexoCURP: 3 },
          makeFirmante({ sexoCURP: 1 }),
          siresPolicy,
        ),
      ).toThrow(ForbiddenException);
    });

    it('should allow CURP conformation updates when stored CURP is generic', () => {
      expect(() =>
        validateFirmanteIdentificationImmutable(
          {
            curp: REAL_CURP,
            nombre: 'JUAN',
            primerApellido: 'RODRIGUEZ',
          },
          makeFirmante({ curp: GENERIC_CURP }),
          siresPolicy,
        ),
      ).not.toThrow();
    });

    it('should ignore undefined fields in update DTO', () => {
      expect(() =>
        validateFirmanteIdentificationImmutable(
          { tituloProfesional: 'Dr.' },
          makeFirmante(),
          siresPolicy,
        ),
      ).not.toThrow();
    });
  });
});
