import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './utils/guards/app-throttler.guard';
import { JwtAuthGuard } from './utils/guards/jwt-auth.guard';
import { SessionInactivityGuard } from './utils/guards/session-inactivity.guard';
import { ConfidentialityAgreementGuard } from './utils/guards/confidentiality-agreement.guard';
import { SessionActivityModule } from './modules/users/session-activity.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { EmpresasModule } from './modules/empresas/empresas.module';
import { FilesModule } from './modules/files/files.module';
import { CentrosTrabajoModule } from './modules/centros-trabajo/centros-trabajo.module';
import { TrabajadoresModule } from './modules/trabajadores/trabajadores.module';
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
import { ConsentimientosModule } from './modules/consentimientos/consentimientos.module';
import { AcuerdoConfidencialidadModule } from './modules/acuerdo-confidencialidad/acuerdo-confidencialidad.module';
import { AuditModule } from './modules/audit/audit.module';
import { ResultadosClinicosModule } from './modules/resultados-clinicos/resultados-clinicos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL_MS', 60_000),
          limit: configService.get<number>('THROTTLE_LIMIT', 150),
        },
      ],
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

    FilesModule,
    CatalogsModule,
    NOM024ComplianceModule,
    GIISExportModule,
    ConsentimientosModule,
    AcuerdoConfidencialidadModule,
    AuditModule,
    EmpresasModule,
    CentrosTrabajoModule,
    TrabajadoresModule,
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
    SessionActivityModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SessionInactivityGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ConfidentialityAgreementGuard,
    },
  ],
})
export class AppModule {}
