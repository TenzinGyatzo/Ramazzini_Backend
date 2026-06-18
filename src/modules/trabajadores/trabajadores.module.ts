import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrabajadoresService } from './trabajadores.service';
import { TrabajadoresController } from './trabajadores.controller';
import { WorkerFusionService } from './worker-fusion.service';
import { TransferenciasController } from './transferencias.controller';
import { Trabajador, TrabajadorSchema } from './schemas/trabajador.schema';
import { NOM024ComplianceModule } from '../nom024-compliance/nom024-compliance.module';
import { ProveedoresSaludModule } from '../proveedores-salud/proveedores-salud.module';
import {
  Antidoping,
  AntidopingSchema,
} from '../expedientes/schemas/antidoping.schema';
import {
  AptitudPuesto,
  AptitudPuestoSchema,
} from '../expedientes/schemas/aptitud-puesto.schema';
import {
  Certificado,
  CertificadoSchema,
} from '../expedientes/schemas/certificado.schema';
import {
  DocumentoExterno,
  DocumentoExternoSchema,
} from '../expedientes/schemas/documento-externo.schema';
import {
  ExamenVista,
  ExamenVistaSchema,
} from '../expedientes/schemas/examen-vista.schema';
import {
  ExploracionFisica,
  ExploracionFisicaSchema,
} from '../expedientes/schemas/exploracion-fisica.schema';
import {
  HistoriaClinica,
  HistoriaClinicaSchema,
} from '../expedientes/schemas/historia-clinica.schema';
import {
  Audiometria,
  AudiometriaSchema,
} from '../expedientes/schemas/audiometria.schema';
import {
  CertificadoExpedito,
  CertificadoExpeditoSchema,
} from '../expedientes/schemas/certificado-expedito.schema';
import {
  ControlPrenatal,
  ControlPrenatalSchema,
} from '../expedientes/schemas/control-prenatal.schema';
import {
  NotaMedica,
  NotaMedicaSchema,
} from '../expedientes/schemas/nota-medica.schema';
import {
  NotaAclaratoria,
  NotaAclaratoriaSchema,
} from '../expedientes/schemas/nota-aclaratoria.schema';
import { Receta, RecetaSchema } from '../expedientes/schemas/receta.schema';
import { ConstanciaAptitud, ConstanciaAptitudSchema } from '../expedientes/schemas/constancia-aptitud.schema';
import { EntrevistaPsicologica, EntrevistaPsicologicaSchema } from '../expedientes/schemas/entrevista-psicologica.schema';
import { TrastornosEstadoAnimo, TrastornosEstadoAnimoSchema } from '../expedientes/schemas/trastornos-estado-animo.schema';
import { CuestionarioProdromalBreve, CuestionarioProdromalBreveSchema } from '../expedientes/schemas/cuestionario-prodromal-breve.schema';
import { TrastornoLimitePersonalidad, TrastornoLimitePersonalidadSchema } from '../expedientes/schemas/trastorno-limite-personalidad.schema';
import {
  EventoSeguimientoCardiometabolico,
  EventoSeguimientoCardiometabolicoSchema,
} from '../expedientes/schemas/evento-seguimiento-cardiometabolico.schema';
import {
  InformeLongitudinalCardiometabolico,
  InformeLongitudinalCardiometabolicoSchema,
} from '../expedientes/schemas/informe-longitudinal-cardiometabolico.schema';
import { RiesgoTrabajo, RiesgoTrabajoSchema } from '../riesgos-trabajo/schemas/riesgo-trabajo.schema';
import { ResultadoClinico, ResultadoClinicoSchema } from '../resultados-clinicos/schemas/resultado-clinico.schema';
import { FilesModule } from '../files/files.module';
import {
  CentroTrabajo,
  CentroTrabajoSchema,
} from '../centros-trabajo/schemas/centro-trabajo.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Empresa, EmpresaSchema } from '../empresas/schemas/empresa.schema';
import { UsersModule } from '../users/users.module';
import { DeletionAuthModule } from 'src/utils/deletion-auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Trabajador.name, schema: TrabajadorSchema },
      { name: Antidoping.name, schema: AntidopingSchema },
      { name: AptitudPuesto.name, schema: AptitudPuestoSchema },
      { name: Certificado.name, schema: CertificadoSchema },
      { name: DocumentoExterno.name, schema: DocumentoExternoSchema },
      { name: ExamenVista.name, schema: ExamenVistaSchema },
      { name: ExploracionFisica.name, schema: ExploracionFisicaSchema },
      { name: HistoriaClinica.name, schema: HistoriaClinicaSchema },
      { name: NotaMedica.name, schema: NotaMedicaSchema },
      { name: NotaAclaratoria.name, schema: NotaAclaratoriaSchema },
      { name: Audiometria.name, schema: AudiometriaSchema },
      { name: CertificadoExpedito.name, schema: CertificadoExpeditoSchema },
      { name: ControlPrenatal.name, schema: ControlPrenatalSchema },
      { name: Receta.name, schema: RecetaSchema },
      { name: ConstanciaAptitud.name, schema: ConstanciaAptitudSchema },
      { name: EntrevistaPsicologica.name, schema: EntrevistaPsicologicaSchema },
      { name: TrastornosEstadoAnimo.name, schema: TrastornosEstadoAnimoSchema },
      {
        name: CuestionarioProdromalBreve.name,
        schema: CuestionarioProdromalBreveSchema,
      },
      {
        name: TrastornoLimitePersonalidad.name,
        schema: TrastornoLimitePersonalidadSchema,
      },
      {
        name: EventoSeguimientoCardiometabolico.name,
        schema: EventoSeguimientoCardiometabolicoSchema,
      },
      {
        name: InformeLongitudinalCardiometabolico.name,
        schema: InformeLongitudinalCardiometabolicoSchema,
      },
      { name: RiesgoTrabajo.name, schema: RiesgoTrabajoSchema },
      { name: ResultadoClinico.name, schema: ResultadoClinicoSchema },
      { name: CentroTrabajo.name, schema: CentroTrabajoSchema },
      { name: User.name, schema: UserSchema },
      { name: Empresa.name, schema: EmpresaSchema },
    ]),
    FilesModule,
    NOM024ComplianceModule,
    forwardRef(() => ProveedoresSaludModule),
    UsersModule,
    DeletionAuthModule,
  ],
  controllers: [TrabajadoresController, TransferenciasController],
  providers: [TrabajadoresService, WorkerFusionService],
  exports: [TrabajadoresService, WorkerFusionService],
})
export class TrabajadoresModule {}
