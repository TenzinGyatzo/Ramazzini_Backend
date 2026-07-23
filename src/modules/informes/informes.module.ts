import { forwardRef, Module } from '@nestjs/common';
import { InformesService } from './informes.service';
import { InformesController } from './informes.controller';
import { InformeAccessInterceptor } from './informe-access.interceptor';
import { PrinterModule } from '../printer/printer.module';
import { EmpresasModule } from '../empresas/empresas.module';
import { TrabajadoresModule } from '../trabajadores/trabajadores.module';
import { ExpedientesModule } from '../expedientes/expedientes.module';
import { FilesModule } from '../files/files.module';
import { MedicosFirmantesModule } from '../medicos-firmantes/medicos-firmantes.module';
import { EnfermerasFirmantesModule } from '../enfermeras-firmantes/enfermeras-firmantes.module';
import { TecnicosFirmantesModule } from '../tecnicos-firmantes/tecnicos-firmantes.module';
import { ProveedoresSaludModule } from '../proveedores-salud/proveedores-salud.module';
import { UsersModule } from '../users/users.module';
import { ResultadosClinicosModule } from '../resultados-clinicos/resultados-clinicos.module';
import { FirmanteHelperModule } from '../expedientes/firmante-helper.module';
import { AuditModule } from '../audit/audit.module';
import { OrganizationalAccessModule } from 'src/utils/organizational-access.module';
import { ExpedienteColaboracionModule } from '../expediente-colaboracion/expediente-colaboracion.module';
import { ProveedorInformeResolver } from './helpers/proveedor-informe.resolver';
import { CatalogsModule } from '../catalogs/catalogs.module';

@Module({
  controllers: [InformesController],
  providers: [InformesService, InformeAccessInterceptor, ProveedorInformeResolver],
  imports: [
    PrinterModule,
    EmpresasModule,
    TrabajadoresModule,
    forwardRef(() => ExpedientesModule),
    FilesModule,
    MedicosFirmantesModule,
    EnfermerasFirmantesModule,
    TecnicosFirmantesModule,
    ProveedoresSaludModule,
    UsersModule,
    ResultadosClinicosModule,
    FirmanteHelperModule,
    forwardRef(() => AuditModule),
    OrganizationalAccessModule,
    ExpedienteColaboracionModule,
    CatalogsModule,
  ],
  exports: [InformesService],
})
export class InformesModule {}
