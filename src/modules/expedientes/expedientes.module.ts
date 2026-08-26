import { forwardRef, Module } from '@nestjs/common';
import { ExpedientesService } from './expedientes.service';
import { ExpedientesController } from './expedientes.controller';
import { NotasMedicasBorradoresController } from './notas-medicas-borradores.controller';
import { NotasMedicasBorradoresService } from './notas-medicas-borradores.service';
import { SeguimientoProgramadoCardiometabolicoController } from './seguimiento-programado-cardiometabolico.controller';
import { SeguimientoProgramadoCardiometabolicoService } from './seguimiento-programado-cardiometabolico.service';
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
import { Deteccion, DeteccionSchema } from './schemas/deteccion.schema';
import {
  EntrevistaPsicologica,
  EntrevistaPsicologicaSchema,
} from './schemas/entrevista-psicologica.schema';
import {
  TrastornosEstadoAnimo,
  TrastornosEstadoAnimoSchema,
} from './schemas/trastornos-estado-animo.schema';
import {
  CuestionarioProdromalBreve,
  CuestionarioProdromalBreveSchema,
} from './schemas/cuestionario-prodromal-breve.schema';
import {
  TrastornoLimitePersonalidad,
  TrastornoLimitePersonalidadSchema,
} from './schemas/trastorno-limite-personalidad.schema';
import {
  EventoSeguimientoCardiometabolico,
  EventoSeguimientoCardiometabolicoSchema,
} from './schemas/evento-seguimiento-cardiometabolico.schema';
import {
  SeguimientoProgramadoCardiometabolico,
  SeguimientoProgramadoCardiometabolicoSchema,
} from './schemas/seguimiento-programado-cardiometabolico.schema';
import {
  InformeLongitudinalCardiometabolico,
  InformeLongitudinalCardiometabolicoSchema,
} from './schemas/informe-longitudinal-cardiometabolico.schema';
import {
  InformeLongitudinalAudiometrico,
  InformeLongitudinalAudiometricoSchema,
} from './schemas/informe-longitudinal-audiometrico.schema';
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
import { ConsentimientosModule } from '../consentimientos/consentimientos.module';
import {
  Consentimiento,
  ConsentimientoSchema,
} from '../consentimientos/schemas/consentimiento.schema';
import { TreatmentConsentGuard } from '../../utils/guards/treatment-consent.guard';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { TrabajadoresModule } from '../trabajadores/trabajadores.module';
import { FirmanteHelperModule } from './firmante-helper.module';
import { OrganizationalAccessModule } from '../../utils/organizational-access.module';
import {
  ResultadoClinico,
  ResultadoClinicoSchema,
} from '../resultados-clinicos/schemas/resultado-clinico.schema';
import { EmpresasModule } from '../empresas/empresas.module';
import { MedicosFirmantesModule } from '../medicos-firmantes/medicos-firmantes.module';
import { EnfermerasFirmantesModule } from '../enfermeras-firmantes/enfermeras-firmantes.module';
import { TecnicosFirmantesModule } from '../tecnicos-firmantes/tecnicos-firmantes.module';
import { FichaSnapshotService } from './services/ficha-snapshot.service';

@Module({
  controllers: [
    ExpedientesController,
    NotasMedicasBorradoresController,
    SeguimientoProgramadoCardiometabolicoController,
  ],
  providers: [
    ExpedientesService,
    NotasMedicasBorradoresService,
    PdfCleanerService,
    SeguimientoProgramadoCardiometabolicoService,
    Cie10CatalogLookupService,
    TreatmentConsentGuard,
    FichaSnapshotService,
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
      { name: Deteccion.name, schema: DeteccionSchema },
      { name: CentroTrabajo.name, schema: CentroTrabajoSchema },
      { name: Empresa.name, schema: EmpresaSchema },
      { name: Consentimiento.name, schema: ConsentimientoSchema },
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
        name: SeguimientoProgramadoCardiometabolico.name,
        schema: SeguimientoProgramadoCardiometabolicoSchema,
      },
      {
        name: InformeLongitudinalCardiometabolico.name,
        schema: InformeLongitudinalCardiometabolicoSchema,
      },
      {
        name: InformeLongitudinalAudiometrico.name,
        schema: InformeLongitudinalAudiometricoSchema,
      },
      { name: ResultadoClinico.name, schema: ResultadoClinicoSchema },
    ]),
    forwardRef(() => InformesModule),
    FilesModule,
    NOM024ComplianceModule,
    CatalogsModule,
    ProveedoresSaludModule,
    ConsentimientosModule,
    AuditModule,
    UsersModule,
    TrabajadoresModule,
    FirmanteHelperModule,
    OrganizationalAccessModule,
    EmpresasModule,
    MedicosFirmantesModule,
    EnfermerasFirmantesModule,
    TecnicosFirmantesModule,
  ],
  exports: [ExpedientesService],
})
export class ExpedientesModule {}
