import { forwardRef, Module } from '@nestjs/common';
import { ExpedientesService } from './expedientes.service';
import { ExpedientesController } from './expedientes.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Antidoping, AntidopingSchema } from './schemas/antidoping.schema';
import { AptitudPuesto, AptitudPuestoSchema } from './schemas/aptitud-puesto.schema';
import { Audiometria, AudiometriaSchema } from './schemas/audiometria.schema';
import { Certificado, CertificadoSchema } from './schemas/certificado.schema';
import { CertificadoExpedito, CertificadoExpeditoSchema } from './schemas/certificado-expedito.schema';
import { DocumentoExterno, DocumentoExternoSchema } from './schemas/documento-externo.schema';
import { ExamenVista, ExamenVistaSchema } from './schemas/examen-vista.schema';
import { ExploracionFisica, ExploracionFisicaSchema } from './schemas/exploracion-fisica.schema';
import { HistoriaClinica, HistoriaClinicaSchema } from './schemas/historia-clinica.schema';
import { NotaMedica, NotaMedicaSchema } from './schemas/nota-medica.schema';
import { ControlPrenatal, ControlPrenatalSchema } from './schemas/control-prenatal.schema';
import { HistoriaOtologica, HistoriaOtologicaSchema } from './schemas/historia-otologica.schema';
import { PrevioEspirometria, PrevioEspirometriaSchema } from './schemas/previo-espirometria.schema';
import { ConstanciaAptitud, ConstanciaAptitudSchema } from './schemas/constancia-aptitud.schema';
import { Receta, RecetaSchema } from './schemas/receta.schema';
import { EntrevistaPsicologica, EntrevistaPsicologicaSchema } from './schemas/entrevista-psicologica.schema';
import { Trabajador, TrabajadorSchema } from '../trabajadores/schemas/trabajador.schema';
import { InformesModule } from '../informes/informes.module';
import { FilesModule } from '../files/files.module';
import { PdfCleanerService } from './pdf-cleaner.service';

@Module({
  controllers: [ExpedientesController],
  providers: [ExpedientesService, PdfCleanerService],
  imports: [
    MongooseModule.forFeature([
      { name: Antidoping.name, schema: AntidopingSchema },
      { name: AptitudPuesto.name, schema: AptitudPuestoSchema },
      { name: Audiometria.name, schema: AudiometriaSchema },
      { name: Certificado.name, schema: CertificadoSchema },
      { name: CertificadoExpedito.name, schema: CertificadoExpeditoSchema },
      { name: DocumentoExterno.name, schema: DocumentoExternoSchema },
      { name: ExamenVista.name, schema: ExamenVistaSchema },
      { name: ExploracionFisica.name, schema: ExploracionFisicaSchema },
      { name: HistoriaClinica.name, schema: HistoriaClinicaSchema },
      { name: NotaMedica.name, schema: NotaMedicaSchema },
      { name: ControlPrenatal.name, schema: ControlPrenatalSchema },
      { name: HistoriaOtologica.name, schema: HistoriaOtologicaSchema },
      { name: PrevioEspirometria.name, schema: PrevioEspirometriaSchema },
      { name: ConstanciaAptitud.name, schema: ConstanciaAptitudSchema },
      { name: Trabajador.name, schema: TrabajadorSchema },
      { name: Receta.name, schema: RecetaSchema },
      { name: EntrevistaPsicologica.name, schema: EntrevistaPsicologicaSchema },
    ]),
    forwardRef(() => InformesModule),
    FilesModule, // Nuevo módulo
  ],
  exports: [ExpedientesService]
})
export class ExpedientesModule {}
