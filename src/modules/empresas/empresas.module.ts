import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmpresasService } from './empresas.service';
import { EmpresasController } from './empresas.controller';
import { Empresa, EmpresaSchema } from './schemas/empresa.schema';
import {
  CentroTrabajo,
  CentroTrabajoSchema,
} from '../centros-trabajo/schemas/centro-trabajo.schema';
import {
  Trabajador,
  TrabajadorSchema,
} from '../trabajadores/schemas/trabajador.schema';
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
  NotaMedica,
  NotaMedicaSchema,
} from '../expedientes/schemas/nota-medica.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { FilesModule } from '../files/files.module';
import { CentrosTrabajoModule } from '../centros-trabajo/centros-trabajo.module';
import { TrabajadoresModule } from '../trabajadores/trabajadores.module';
import { UsersModule } from '../users/users.module';
import { DeletionAuthModule } from 'src/utils/deletion-auth.module';
import { AuditModule } from '../audit/audit.module';
import { ProveedoresSaludModule } from '../proveedores-salud/proveedores-salud.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Empresa.name, schema: EmpresaSchema },
      { name: CentroTrabajo.name, schema: CentroTrabajoSchema },
      { name: Trabajador.name, schema: TrabajadorSchema },
      { name: Antidoping.name, schema: AntidopingSchema },
      { name: AptitudPuesto.name, schema: AptitudPuestoSchema },
      { name: Certificado.name, schema: CertificadoSchema },
      { name: DocumentoExterno.name, schema: DocumentoExternoSchema },
      { name: ExamenVista.name, schema: ExamenVistaSchema },
      { name: ExploracionFisica.name, schema: ExploracionFisicaSchema },
      { name: HistoriaClinica.name, schema: HistoriaClinicaSchema },
      { name: NotaMedica.name, schema: NotaMedicaSchema },
      { name: User.name, schema: UserSchema },
    ]),
    FilesModule,
    forwardRef(() => CentrosTrabajoModule),
    forwardRef(() => TrabajadoresModule),
    UsersModule,
    DeletionAuthModule,
    forwardRef(() => AuditModule),
    forwardRef(() => ProveedoresSaludModule),
  ],
  controllers: [EmpresasController],
  providers: [EmpresasService],
  exports: [EmpresasService],
})
export class EmpresasModule {}
