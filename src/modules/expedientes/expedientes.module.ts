import { forwardRef, Module } from '@nestjs/common';
import { ExpedientesService } from './expedientes.service';
import { ExpedientesController } from './expedientes.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Antidoping, AntidopingSchema } from './schemas/antidoping.schema';
import {
  AptitudPuesto,
  AptitudPuestoSchema,
} from './schemas/aptitud-puesto.schema';
import { Audiometria, AudiometriaSchema } from './schemas/audiometria.schema';
import { Certificado, CertificadoSchema } from './schemas/certificado.schema';
import {
  CertificadoExpedito,
  CertificadoExpeditoSchema,
} from './schemas/certificado-expedito.schema';
import {
  DocumentoExterno,
  DocumentoExternoSchema,
} from './schemas/documento-externo.schema';
import { ExamenVista, ExamenVistaSchema } from './schemas/examen-vista.schema';
import {
  ExploracionFisica,
  ExploracionFisicaSchema,
} from './schemas/exploracion-fisica.schema';
import {
  HistoriaClinica,
  HistoriaClinicaSchema,
} from './schemas/historia-clinica.schema';
import { NotaMedica, NotaMedicaSchema } from './schemas/nota-medica.schema';
import {
  NotaAclaratoria,
  NotaAclaratoriaSchema,
} from './schemas/nota-aclaratoria.schema';
import {
  ControlPrenatal,
  ControlPrenatalSchema,
} from './schemas/control-prenatal.schema';
import {
  HistoriaOtologica,
  HistoriaOtologicaSchema,
} from './schemas/historia-otologica.schema';
import {
  PrevioEspirometria,
  PrevioEspirometriaSchema,
} from './schemas/previo-espirometria.schema';
import {
  ConstanciaAptitud,
  ConstanciaAptitudSchema,
} from './schemas/constancia-aptitud.schema';
import { Receta, RecetaSchema } from './schemas/receta.schema';
import { Lesion, LesionSchema } from './schemas/lesion.schema';
import { Deteccion, DeteccionSchema } from './schemas/deteccion.schema';
import {
  Trabajador,
  TrabajadorSchema,
} from '../trabajadores/schemas/trabajador.schema';
import { InformesModule } from '../informes/informes.module';
import { FilesModule } from '../files/files.module';
import { PdfCleanerService } from './pdf-cleaner.service';
import {
  CentroTrabajo,
  CentroTrabajoSchema,
} from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa, EmpresaSchema } from '../empresas/schemas/empresa.schema';
import { NOM024ComplianceModule } from '../nom024-compliance/nom024-compliance.module';
import { CatalogsModule } from '../catalogs/catalogs.module';
import { Cie10CatalogLookupService } from './services/cie10-catalog-lookup.service';
import { ProveedoresSaludModule } from '../proveedores-salud/proveedores-salud.module';
import { ConsentimientoDiarioModule } from '../consentimiento-diario/consentimiento-diario.module';
import {
  ConsentimientoDiario,
  ConsentimientoDiarioSchema,
} from '../consentimiento-diario/schemas/consentimiento-diario.schema';
import { DailyConsentGuard } from '../../utils/guards/daily-consent.guard';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { TrabajadoresModule } from '../trabajadores/trabajadores.module';

@Module({
  controllers: [ExpedientesController],
  providers: [
    ExpedientesService,
    PdfCleanerService,
    Cie10CatalogLookupService,
    DailyConsentGuard,
  ],
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
      { name: NotaAclaratoria.name, schema: NotaAclaratoriaSchema },
      { name: ControlPrenatal.name, schema: ControlPrenatalSchema },
      { name: HistoriaOtologica.name, schema: HistoriaOtologicaSchema },
      { name: PrevioEspirometria.name, schema: PrevioEspirometriaSchema },
      { name: ConstanciaAptitud.name, schema: ConstanciaAptitudSchema },
      { name: Trabajador.name, schema: TrabajadorSchema },
      { name: Receta.name, schema: RecetaSchema },
      { name: Lesion.name, schema: LesionSchema },
      { name: Deteccion.name, schema: DeteccionSchema },
      { name: CentroTrabajo.name, schema: CentroTrabajoSchema },
      { name: Empresa.name, schema: EmpresaSchema },
      { name: ConsentimientoDiario.name, schema: ConsentimientoDiarioSchema },
    ]),
    forwardRef(() => InformesModule),
    FilesModule,
    NOM024ComplianceModule,
    CatalogsModule,
    ProveedoresSaludModule,
    ConsentimientoDiarioModule,
    AuditModule,
    UsersModule,
    TrabajadoresModule,
  ],
  exports: [ExpedientesService],
})
export class ExpedientesModule {}
