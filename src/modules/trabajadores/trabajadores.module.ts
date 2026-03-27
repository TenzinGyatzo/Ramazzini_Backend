import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'
import { TrabajadoresService } from './trabajadores.service';
import { TrabajadoresController } from './trabajadores.controller';
import { TransferenciasController } from './transferencias.controller';
import { Trabajador, TrabajadorSchema } from './schemas/trabajador.schema'
import { Antidoping, AntidopingSchema } from '../expedientes/schemas/antidoping.schema';
import { AptitudPuesto, AptitudPuestoSchema } from '../expedientes/schemas/aptitud-puesto.schema';
import { Certificado, CertificadoSchema } from '../expedientes/schemas/certificado.schema';
import { DocumentoExterno, DocumentoExternoSchema } from '../expedientes/schemas/documento-externo.schema';
import { ExamenVista, ExamenVistaSchema } from '../expedientes/schemas/examen-vista.schema';
import { ExploracionFisica, ExploracionFisicaSchema } from '../expedientes/schemas/exploracion-fisica.schema';
import { HistoriaClinica, HistoriaClinicaSchema } from '../expedientes/schemas/historia-clinica.schema';
import { Audiometria, AudiometriaSchema } from '../expedientes/schemas/audiometria.schema';
import { CertificadoExpedito, CertificadoExpeditoSchema } from '../expedientes/schemas/certificado-expedito.schema';
import { ControlPrenatal, ControlPrenatalSchema } from '../expedientes/schemas/control-prenatal.schema';
import { NotaMedica, NotaMedicaSchema } from '../expedientes/schemas/nota-medica.schema';
import { Receta, RecetaSchema } from '../expedientes/schemas/receta.schema';
import { ConstanciaAptitud, ConstanciaAptitudSchema } from '../expedientes/schemas/constancia-aptitud.schema';
import { EntrevistaPsicologica, EntrevistaPsicologicaSchema } from '../expedientes/schemas/entrevista-psicologica.schema';
import { RiesgoTrabajo, RiesgoTrabajoSchema } from '../riesgos-trabajo/schemas/riesgo-trabajo.schema';
import { ResultadoClinico, ResultadoClinicoSchema } from '../resultados-clinicos/schemas/resultado-clinico.schema';
import { FilesModule } from '../files/files.module';
import { CentroTrabajo, CentroTrabajoSchema } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Empresa, EmpresaSchema } from '../empresas/schemas/empresa.schema';

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
      { name: Audiometria.name, schema: AudiometriaSchema },
      { name: CertificadoExpedito.name, schema: CertificadoExpeditoSchema },
      { name: ControlPrenatal.name, schema: ControlPrenatalSchema },
      { name: Receta.name, schema: RecetaSchema },
      { name: ConstanciaAptitud.name, schema: ConstanciaAptitudSchema },
      { name: EntrevistaPsicologica.name, schema: EntrevistaPsicologicaSchema },
      { name: RiesgoTrabajo.name, schema: RiesgoTrabajoSchema },
      { name: ResultadoClinico.name, schema: ResultadoClinicoSchema },
      { name: CentroTrabajo.name, schema: CentroTrabajoSchema },
      { name: User.name, schema: UserSchema },
      { name: Empresa.name, schema: EmpresaSchema },
    ]),
    FilesModule,
  ],
  controllers: [TrabajadoresController, TransferenciasController],
  providers: [TrabajadoresService],
  exports: [TrabajadoresService]
})
export class TrabajadoresModule {}
