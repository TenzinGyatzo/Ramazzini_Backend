/**

 * NOM-024 Worker Identification Immutability Tests

 */



import { ForbiddenException } from '@nestjs/common';

import {

  getWorkerImmutableIdentificationFields,

  isMexicanEntidadNacimiento,

  isPaisNacimientoImmutable,

  validateWorkerIdentificationImmutable,

  WORKER_IMMUTABLE_IDENTIFICATION_FIELDS,

} from '../../src/utils/worker-identification-immutability.util';

import { RegulatoryPolicy } from '../../src/utils/regulatory-policy.service';

import { RegulatoryErrorCode } from '../../src/utils/regulatory-error-codes';

import { Trabajador } from '../../src/modules/trabajadores/schemas/trabajador.schema';



const GENERIC_CURP = 'XXXX999999XXXXXX99';

const REAL_CURP = 'ROAJ850102HDFLRN07';



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

    workerIdentificationImmutable: true,

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

    workerIdentificationImmutable: false,

  },

  validation: {

    curpFirmantes: 'optional',

    workerCurp: 'optional',

    cie10Principal: 'required',

    geoFields: 'optional',

  },

};



function makeWorker(overrides: Partial<Trabajador> = {}): Trabajador {

  return {

    curp: REAL_CURP,

    nombre: 'JUAN',

    primerApellido: 'PEREZ',

    segundoApellido: 'LOPEZ',

    fechaNacimiento: new Date('1985-01-02'),

    sexo: 'Masculino',

    entidadNacimiento: '09',

    paisNacimiento: 142,

    puesto: 'Operador',

    toObject() {

      return { ...this };

    },

    ...overrides,

  } as Trabajador;

}



describe('Worker Identification Immutability (SIRES_NOM024)', () => {

  describe('isMexicanEntidadNacimiento', () => {

    it('should accept INEGI state codes 01-32', () => {

      expect(isMexicanEntidadNacimiento('09')).toBe(true);

      expect(isMexicanEntidadNacimiento('32')).toBe(true);

    });



    it('should reject sentinel and non-state codes', () => {

      expect(isMexicanEntidadNacimiento('NE')).toBe(false);

      expect(isMexicanEntidadNacimiento('00')).toBe(false);

      expect(isMexicanEntidadNacimiento('')).toBe(false);

    });

  });



  describe('isPaisNacimientoImmutable', () => {

    it('should be immutable only for real CURP, pais 142 and entidad MX', () => {

      expect(

        isPaisNacimientoImmutable({

          curp: REAL_CURP,

          paisNacimiento: 142,

          entidadNacimiento: '09',

        }),

      ).toBe(true);

    });



    it('should be mutable when paisNacimiento is empty', () => {

      expect(

        isPaisNacimientoImmutable({

          curp: REAL_CURP,

          paisNacimiento: undefined,

          entidadNacimiento: '09',

        }),

      ).toBe(false);

    });



    it('should be mutable when CURP is generic', () => {

      expect(

        isPaisNacimientoImmutable({

          curp: GENERIC_CURP,

          paisNacimiento: 142,

          entidadNacimiento: '09',

        }),

      ).toBe(false);

    });



    it('should be mutable when pais is not Mexico', () => {

      expect(

        isPaisNacimientoImmutable({

          curp: REAL_CURP,

          paisNacimiento: 228,

          entidadNacimiento: '09',

        }),

      ).toBe(false);

    });



    it('should be mutable when entidad is not a Mexican state', () => {

      expect(

        isPaisNacimientoImmutable({

          curp: REAL_CURP,

          paisNacimiento: 142,

          entidadNacimiento: 'NE',

        }),

      ).toBe(false);

    });

  });



  describe('getWorkerImmutableIdentificationFields', () => {

    it('should return all identification fields when CURP is real and pais MX is locked', () => {

      const fields = getWorkerImmutableIdentificationFields({

        curp: REAL_CURP,

        paisNacimiento: 142,

        entidadNacimiento: '09',

      });

      expect(fields).toEqual([...WORKER_IMMUTABLE_IDENTIFICATION_FIELDS]);

    });



    it('should exclude paisNacimiento when stored pais is empty', () => {

      const fields = getWorkerImmutableIdentificationFields({

        curp: REAL_CURP,

        paisNacimiento: undefined,

        entidadNacimiento: '09',

      });

      expect(fields).not.toContain('paisNacimiento');

      expect(fields).toContain('curp');

    });



    it('should return no immutable fields when CURP is generic', () => {

      const fields = getWorkerImmutableIdentificationFields({

        curp: GENERIC_CURP,

        paisNacimiento: 142,

        entidadNacimiento: '09',

      });

      expect(fields).toEqual([]);

    });

  });



  describe('validateWorkerIdentificationImmutable', () => {

    it('should throw when changing nombre with real CURP under SIRES', () => {

      const current = makeWorker();

      expect(() =>

        validateWorkerIdentificationImmutable(

          { nombre: 'PEDRO' },

          current,

          siresPolicy,

        ),

      ).toThrow(ForbiddenException);



      try {

        validateWorkerIdentificationImmutable(

          { nombre: 'PEDRO' },

          current,

          siresPolicy,

        );

      } catch (error) {

        const response = (error as ForbiddenException).getResponse() as {

          errorCode: string;

          details?: { immutableFields?: string[] };

        };

        expect(response.errorCode).toBe(

          RegulatoryErrorCode.REGIMEN_WORKER_IDENTIFICATION_IMMUTABLE,

        );

        expect(response.details?.immutableFields).toContain('nombre');

      }

    });



    it('should allow changing curp when stored CURP is generic', () => {

      const current = makeWorker({ curp: GENERIC_CURP });

      expect(() =>

        validateWorkerIdentificationImmutable(

          { curp: REAL_CURP },

          current,

          siresPolicy,

        ),

      ).not.toThrow();

    });



    it('should allow changing nombre when stored CURP is generic', () => {

      const current = makeWorker({ curp: GENERIC_CURP });

      expect(() =>

        validateWorkerIdentificationImmutable(

          { nombre: 'PEDRO' },

          current,

          siresPolicy,

        ),

      ).not.toThrow();

    });



    it('should allow changing paisNacimiento with generic CURP', () => {

      const current = makeWorker({ curp: GENERIC_CURP, paisNacimiento: 142 });

      expect(() =>

        validateWorkerIdentificationImmutable(

          { paisNacimiento: 228 },

          current,

          siresPolicy,

        ),

      ).not.toThrow();

    });



    it('should throw when changing paisNacimiento with real CURP, pais 142 and entidad MX', () => {

      const current = makeWorker();

      expect(() =>

        validateWorkerIdentificationImmutable(

          { paisNacimiento: 228 },

          current,

          siresPolicy,

        ),

      ).toThrow(ForbiddenException);

    });



    it('should allow changing paisNacimiento when stored pais is empty', () => {

      const current = makeWorker({ paisNacimiento: undefined });

      expect(() =>

        validateWorkerIdentificationImmutable(

          { paisNacimiento: 228 },

          current,

          siresPolicy,

        ),

      ).not.toThrow();

    });



    it('should allow changing paisNacimiento when stored pais is not Mexico', () => {

      const current = makeWorker({ paisNacimiento: 228, entidadNacimiento: 'NE' });

      expect(() =>

        validateWorkerIdentificationImmutable(

          { paisNacimiento: 142 },

          current,

          siresPolicy,

        ),

      ).not.toThrow();

    });



    it('should allow changing paisNacimiento when entidad is not a Mexican state', () => {

      const current = makeWorker({ entidadNacimiento: 'NE' });

      expect(() =>

        validateWorkerIdentificationImmutable(

          { paisNacimiento: 228 },

          current,

          siresPolicy,

        ),

      ).not.toThrow();

    });



    it('should throw when changing curp with real CURP stored', () => {

      const current = makeWorker();

      expect(() =>

        validateWorkerIdentificationImmutable(

          { curp: 'GODM850101HDFRZN02' },

          current,

          siresPolicy,

        ),

      ).toThrow(ForbiddenException);

    });



    it('should allow same value re-sent for immutable field', () => {

      const current = makeWorker();

      expect(() =>

        validateWorkerIdentificationImmutable(

          { nombre: 'JUAN' },

          current,

          siresPolicy,

        ),

      ).not.toThrow();

    });



    it('should not block changes under SIN_REGIMEN', () => {

      const current = makeWorker();

      expect(() =>

        validateWorkerIdentificationImmutable(

          { curp: 'GODM850101HDFRZN02', nombre: 'OTRO' },

          current,

          sinRegimenPolicy,

        ),

      ).not.toThrow();

    });



    it('should not block changes to non-identification fields', () => {

      const current = makeWorker();

      expect(() =>

        validateWorkerIdentificationImmutable(

          { puesto: 'Supervisor' },

          current,

          siresPolicy,

        ),

      ).not.toThrow();

    });



    it('should not block entidadResidencia changes', () => {

      const current = makeWorker();

      expect(() =>

        validateWorkerIdentificationImmutable(

          { entidadResidencia: '15' },

          current,

          siresPolicy,

        ),

      ).not.toThrow();

    });

  });

});

