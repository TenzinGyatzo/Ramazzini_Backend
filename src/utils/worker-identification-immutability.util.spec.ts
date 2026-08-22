import { ForbiddenException } from '@nestjs/common';
import { RegulatoryPolicy } from './regulatory-policy.service';
import { RegulatoryErrorCode } from './regulatory-error-codes';
import {
  getWorkerImmutableIdentificationFields,
  validateWorkerIdentificationImmutable,
  WORKER_IMMUTABLE_IDENTIFICATION_FIELDS,
} from './worker-identification-immutability.util';

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

function makeWorker(overrides: Record<string, unknown> = {}) {
  return {
    curp: REAL_CURP,
    nombre: 'JUAN',
    primerApellido: 'RODRIGUEZ',
    segundoApellido: 'LOPEZ',
    fechaNacimiento: new Date('1985-01-02'),
    sexo: 'Masculino',
    sexoCURP: 1,
    entidadNacimiento: '09',
    paisNacimiento: 142,
    toObject() {
      return { ...this };
    },
    ...overrides,
  };
}

describe('Worker Identification Immutability (SIRES_NOM024)', () => {
  describe('getWorkerImmutableIdentificationFields', () => {
    it('locks common fields without sexo when CURP is real and there is no attention', () => {
      const fields = getWorkerImmutableIdentificationFields({ curp: REAL_CURP });
      expect(fields).toEqual([...WORKER_IMMUTABLE_IDENTIFICATION_FIELDS]);
      expect(fields).toContain('sexoCURP');
      expect(fields).not.toContain('sexo');
    });

    it('locks nothing when CURP is generic and there is no attention', () => {
      const fields = getWorkerImmutableIdentificationFields({
        curp: GENERIC_CURP,
      });
      expect(fields).toEqual([]);
    });

    it('locks common fields plus sexo when there is finalized clinical attention', () => {
      const fields = getWorkerImmutableIdentificationFields(
        { curp: GENERIC_CURP },
        { hasFinalizedClinicalDocument: true },
      );
      expect(fields).toContain('curp');
      expect(fields).toContain('sexoCURP');
      expect(fields).toContain('sexo');
      expect(fields).toContain('paisNacimiento');
    });
  });

  describe('validateWorkerIdentificationImmutable', () => {
    it('allows updates when policy has immutability disabled', () => {
      expect(() =>
        validateWorkerIdentificationImmutable(
          { primerApellido: 'GARCIA' },
          makeWorker(),
          sinRegimenPolicy,
        ),
      ).not.toThrow();
    });

    it('rejects changes to sexoCURP with real CURP', () => {
      expect(() =>
        validateWorkerIdentificationImmutable(
          { sexoCURP: 3 },
          makeWorker({ sexoCURP: 1 }),
          siresPolicy,
        ),
      ).toThrow(ForbiddenException);
    });

    it('allows changes to biological sexo with real CURP and no attention', () => {
      expect(() =>
        validateWorkerIdentificationImmutable(
          { sexo: 'Femenino' },
          makeWorker(),
          siresPolicy,
        ),
      ).not.toThrow();
    });

    it('allows CURP conformation updates when stored CURP is generic and there is no attention', () => {
      expect(() =>
        validateWorkerIdentificationImmutable(
          {
            curp: REAL_CURP,
            nombre: 'JUAN',
            primerApellido: 'RODRIGUEZ',
          },
          makeWorker({ curp: GENERIC_CURP }),
          siresPolicy,
        ),
      ).not.toThrow();
    });

    it('rejects identification changes after attention even with generic CURP', () => {
      expect(() =>
        validateWorkerIdentificationImmutable(
          { curp: REAL_CURP },
          makeWorker({ curp: GENERIC_CURP }),
          siresPolicy,
          { hasFinalizedClinicalDocument: true },
        ),
      ).toThrow(ForbiddenException);
    });

    it('rejects biological sexo changes after attention', () => {
      expect(() =>
        validateWorkerIdentificationImmutable(
          { sexo: 'Femenino' },
          makeWorker(),
          siresPolicy,
          { hasFinalizedClinicalDocument: true },
        ),
      ).toThrow(ForbiddenException);

      try {
        validateWorkerIdentificationImmutable(
          { sexo: 'Femenino' },
          makeWorker(),
          siresPolicy,
          { hasFinalizedClinicalDocument: true },
        );
      } catch (error) {
        const response = (error as ForbiddenException).getResponse() as {
          errorCode: string;
          details?: { immutableFields?: string[] };
        };
        expect(response.errorCode).toBe(
          RegulatoryErrorCode.REGIMEN_WORKER_IDENTIFICATION_IMMUTABLE,
        );
        expect(response.details?.immutableFields).toContain('sexo');
      }
    });
  });
});
