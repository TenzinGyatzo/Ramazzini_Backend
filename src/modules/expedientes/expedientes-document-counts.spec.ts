import { BadRequestException } from '@nestjs/common';

import { getConnectionToken, getModelToken } from '@nestjs/mongoose';

import { Test, TestingModule } from '@nestjs/testing';

import { ExpedientesService } from './expedientes.service';

import { Antidoping } from './schemas/antidoping.schema';

import { AptitudPuesto } from './schemas/aptitud-puesto.schema';

import { Audiometria } from './schemas/audiometria.schema';

import { Certificado } from './schemas/certificado.schema';

import { CertificadoExpedito } from './schemas/certificado-expedito.schema';

import { DocumentoExterno } from './schemas/documento-externo.schema';

import { ExamenVista } from './schemas/examen-vista.schema';

import { ExploracionFisica } from './schemas/exploracion-fisica.schema';

import { HistoriaClinica } from './schemas/historia-clinica.schema';

import { NotaMedica } from './schemas/nota-medica.schema';

import { NotaAclaratoria } from './schemas/nota-aclaratoria.schema';

import { ControlPrenatal } from './schemas/control-prenatal.schema';

import { HistoriaOtologica } from './schemas/historia-otologica.schema';

import { PrevioEspirometria } from './schemas/previo-espirometria.schema';

import { Receta } from './schemas/receta.schema';

import { ConstanciaAptitud } from './schemas/constancia-aptitud.schema';

import { EntrevistaPsicologica } from './schemas/entrevista-psicologica.schema';

import { TrastornosEstadoAnimo } from './schemas/trastornos-estado-animo.schema';

import { CuestionarioProdromalBreve } from './schemas/cuestionario-prodromal-breve.schema';

import { TrastornoLimitePersonalidad } from './schemas/trastorno-limite-personalidad.schema';

import { EventoSeguimientoCardiometabolico } from './schemas/evento-seguimiento-cardiometabolico.schema';

import { InformeLongitudinalCardiometabolico } from './schemas/informe-longitudinal-cardiometabolico.schema';

import { Deteccion } from './schemas/deteccion.schema';

import { Trabajador } from '../trabajadores/schemas/trabajador.schema';

import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';

import { Empresa } from '../empresas/schemas/empresa.schema';

import { FilesService } from '../files/files.service';

import { NOM024ComplianceUtil } from '../../utils/nom024-compliance.util';

import { CatalogsService } from '../catalogs/catalogs.service';

import { Cie10CatalogLookupService } from './services/cie10-catalog-lookup.service';

import { InformesService } from '../informes/informes.service';

import { ProveedoresSaludService } from '../proveedores-salud/proveedores-salud.service';

import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';

import { ConsentimientosService } from '../consentimientos/consentimientos.service';

import { AuditService } from '../audit/audit.service';

import { UsersService } from '../users/users.service';

import { WorkerFusionService } from '../trabajadores/worker-fusion.service';

import { FirmanteHelper } from './helpers/firmante-helper';

import { CexCatalogResolver } from '../catalogs/cex-catalog.resolver';

import { Types } from 'mongoose';

import { ResultadoClinico } from '../resultados-clinicos/schemas/resultado-clinico.schema';



describe('ExpedientesService.countDocumentosByTrabajador', () => {

  let service: ExpedientesService;



  const createCountModel = (
    count: number,
    latestDoc: Record<string, Date> | null = null,
  ) => {
    const maxDate = latestDoc ? Object.values(latestDoc)[0] : null;

    return {
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(count),
      }),
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(latestDoc),
      }),
      aggregate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(
          count > 0 || maxDate ? [{ count, maxDate }] : [],
        ),
      }),
    };
  };



  const historiaClinicaModel = createCountModel(2, {

    fechaHistoriaClinica: new Date('2024-01-15T00:00:00.000Z'),

  });

  const aptitudModel = createCountModel(1, {

    fechaAptitudPuesto: new Date('2025-06-01T00:00:00.000Z'),

  });

  const zeroModel = createCountModel(0);

  const controlPrenatalModel = createCountModel(3);

  const consentimientoModel = createCountModel(1);

  const deteccionModel = createCountModel(2);



  const resultadoClinicoModel = {
    aggregate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          byTipo: [
            { _id: 'ESPIROMETRIA', count: 1 },
            { _id: 'EKG', count: 2 },
          ],
          latest: [{ maxDate: new Date('2025-07-01T12:00:00.000Z') }],
        },
      ]),
    }),
    findOne: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({
        fechaEstudio: new Date('2025-07-01T12:00:00.000Z'),
      }),
    }),
  };



  const connection = {

    model: jest.fn((modelName: string) => {

      if (modelName === 'Consentimiento') return consentimientoModel;

      if (modelName === 'Deteccion') return deteccionModel;

      if (

        modelName === 'RiesgoTrabajo' ||

        modelName === 'SeguimientoProgramadoCardiometabolico'

      ) {

        return zeroModel;

      }

      throw new Error(`Unexpected connection model: ${modelName}`);

    }),

  };



  const modelProviders = [

    Antidoping,

    AptitudPuesto,

    Audiometria,

    Certificado,

    CertificadoExpedito,

    DocumentoExterno,

    ExamenVista,

    ExploracionFisica,

    HistoriaClinica,

    NotaMedica,

    NotaAclaratoria,

    ControlPrenatal,

    HistoriaOtologica,

    PrevioEspirometria,

    Receta,

    ConstanciaAptitud,

    EntrevistaPsicologica,

    TrastornosEstadoAnimo,

    CuestionarioProdromalBreve,

    TrastornoLimitePersonalidad,

    EventoSeguimientoCardiometabolico,

    InformeLongitudinalCardiometabolico,

    Deteccion,

    Trabajador,

    CentroTrabajo,

    Empresa,

    ResultadoClinico,

  ].map((schema) => ({

    provide: getModelToken(schema.name),

    useValue:

      schema.name === HistoriaClinica.name

        ? historiaClinicaModel

        : schema.name === AptitudPuesto.name

          ? aptitudModel

          : schema.name === ControlPrenatal.name

            ? controlPrenatalModel

            : schema.name === ResultadoClinico.name

              ? resultadoClinicoModel

              : zeroModel,

  }));



  const regulatoryPolicyService = {

    getRegulatoryPolicy: jest.fn().mockResolvedValue({

      features: { controlPrenatalEnabled: false },

    }),

  };



  beforeEach(async () => {

    jest.clearAllMocks();



    const module: TestingModule = await Test.createTestingModule({

      providers: [

        ExpedientesService,

        ...modelProviders,

        { provide: getConnectionToken(), useValue: connection },

        { provide: FilesService, useValue: {} },

        { provide: NOM024ComplianceUtil, useValue: {} },

        { provide: CatalogsService, useValue: {} },

        { provide: Cie10CatalogLookupService, useValue: {} },

        { provide: InformesService, useValue: {} },

        { provide: ProveedoresSaludService, useValue: {} },

        { provide: RegulatoryPolicyService, useValue: regulatoryPolicyService },

        { provide: ConsentimientosService, useValue: {} },

        { provide: AuditService, useValue: {} },

        { provide: UsersService, useValue: {} },

        { provide: WorkerFusionService, useValue: {} },

        { provide: FirmanteHelper, useValue: {} },

        { provide: CexCatalogResolver, useValue: {} },

      ],

    }).compile();



    service = module.get(ExpedientesService);

    jest

      .spyOn(service as any, 'getProveedorSaludIdFromTrabajador')

      .mockResolvedValue('proveedor-1');

  });



  it('rechaza IDs inválidos', async () => {

    await expect(

      service.countDocumentosByTrabajador('id-invalido'),

    ).rejects.toBeInstanceOf(BadRequestException);

  });



  it('devuelve conteos por tipo y total sin incluir Control Prenatal deshabilitado', async () => {

    const trabajadorId = new Types.ObjectId().toString();



    const result = await service.countDocumentosByTrabajador(trabajadorId);



    expect(result.conteos.HistoriaClinica).toBe(2);

    expect(result.conteos.AptitudPuesto).toBe(1);

    expect(result.conteos.ControlPrenatal).toBeUndefined();

    expect(result.total).toBe(3);

    expect(result.resultadosClinicosConteos).toEqual({

      ESPIROMETRIA: 1,

      EKG: 2,

    });

    expect(result.totalResultadosClinicos).toBe(3);

    expect(result.fechaUltimaActividad).toBe(
      new Date('2025-07-01T12:00:00.000Z').toISOString(),
    );
    expect(result.conteos.ControlPrenatal).toBeUndefined();
  });



  it('incluye Control Prenatal cuando la política lo permite', async () => {

    regulatoryPolicyService.getRegulatoryPolicy.mockResolvedValueOnce({

      features: { controlPrenatalEnabled: true },

    });



    const trabajadorId = new Types.ObjectId().toString();

    const result = await service.countDocumentosByTrabajador(trabajadorId);



    expect(result.conteos.ControlPrenatal).toBe(3);

    expect(result.total).toBe(6);

    expect(result.totalResultadosClinicos).toBe(3);
    expect(controlPrenatalModel.aggregate).toHaveBeenCalled();
  });

});

