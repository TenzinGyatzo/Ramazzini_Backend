import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ServeStaticModule } from '@nestjs/serve-static'; // Importar ServeStaticModule
import { join } from 'path'; // Importar join para rutas
import { EmpresasModule } from './modules/empresas/empresas.module';
import { CentrosTrabajoModule } from './modules/centros-trabajo/centros-trabajo.module';
import { TrabajadoresModule } from './modules/trabajadores/trabajadores.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ExpedientesModule } from './modules/expedientes/expedientes.module';
import { InformesModule } from './modules/informes/informes.module';
import { PrinterModule } from './modules/printer/printer.module';
import { DocumentMergerModule } from './modules/document-merger/document-merger.module';
import { ProveedoresSaludModule } from './modules/proveedores-salud/proveedores-salud.module';
import { MedicosFirmantesModule } from './modules/medicos-firmantes/medicos-firmantes.module';
import { EnfermerasFirmantesModule } from './modules/enfermeras-firmantes/enfermeras-firmantes.module';
import { TecnicosFirmantesModule } from './modules/tecnicos-firmantes/tecnicos-firmantes.module';
import { EmailsModule } from './modules/emails/emails.module';
import { PagosModule } from './modules/pagos/pagos.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RiesgosTrabajoModule } from './modules/riesgos-trabajo/riesgos-trabajo.module';
import { InformePersonalizacionModule } from './modules/informe-personalizacion/informe-personalizacion.module';
import { CatalogsModule } from './modules/catalogs/catalogs.module';
import { NOM024ComplianceModule } from './modules/nom024-compliance/nom024-compliance.module';
import { GIISExportModule } from './modules/giis-export/giis-export.module';
import { ConsentimientoDiarioModule } from './modules/consentimiento-diario/consentimiento-diario.module';
import { AuditModule } from './modules/audit/audit.module';
import { ResultadosClinicosModule } from './modules/resultados-clinicos/resultados-clinicos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),
    MulterModule.register({
      dest: './uploads',
    }),

    // Nuevo: Configuración para servir archivos estáticos
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'expedientes-medicos'), // Ruta a la carpeta de PDFs
      serveRoot: '/expedientes-medicos', // Prefijo en la URL
    }),

    CatalogsModule,
    NOM024ComplianceModule,
    GIISExportModule,
    ConsentimientoDiarioModule,
    AuditModule,
    EmpresasModule,
    CentrosTrabajoModule,
    TrabajadoresModule,
    AuthModule,
    UsersModule,
    ExpedientesModule,
    InformesModule,
    PrinterModule,
    DocumentMergerModule,
    ProveedoresSaludModule,
    MedicosFirmantesModule,
    EnfermerasFirmantesModule,
    TecnicosFirmantesModule,
    EmailsModule,
    PagosModule,
    ScheduleModule.forRoot(),
    RiesgosTrabajoModule,
    InformePersonalizacionModule,
    ResultadosClinicosModule,
  ],
})
export class AppModule {}
