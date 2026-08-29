import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InicioController } from './inicio.controller';
import { InicioResumenService } from './inicio-resumen.service';
import {
  Trabajador,
  TrabajadorSchema,
} from '../trabajadores/schemas/trabajador.schema';
import {
  CentroTrabajo,
  CentroTrabajoSchema,
} from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa, EmpresaSchema } from '../empresas/schemas/empresa.schema';
import { UsersModule } from '../users/users.module';
import { ProveedoresSaludModule } from '../proveedores-salud/proveedores-salud.module';
import { TrabajadoresModule } from '../trabajadores/trabajadores.module';
import { ExpedientesModule } from '../expedientes/expedientes.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Trabajador.name, schema: TrabajadorSchema },
      { name: CentroTrabajo.name, schema: CentroTrabajoSchema },
      { name: Empresa.name, schema: EmpresaSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => ProveedoresSaludModule),
    forwardRef(() => TrabajadoresModule),
    forwardRef(() => ExpedientesModule),
  ],
  controllers: [InicioController],
  providers: [InicioResumenService],
  exports: [InicioResumenService],
})
export class InicioModule {}
