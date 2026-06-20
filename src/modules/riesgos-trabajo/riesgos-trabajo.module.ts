import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RiesgosTrabajoService } from './riesgos-trabajo.service';
import { RiesgosTrabajoController } from './riesgos-trabajo.controller';
import {
  RiesgoTrabajo,
  RiesgoTrabajoSchema,
} from './schemas/riesgo-trabajo.schema';
import { Trabajador, TrabajadorSchema } from '../trabajadores/schemas/trabajador.schema';
import { CentroTrabajo, CentroTrabajoSchema } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa, EmpresaSchema } from '../empresas/schemas/empresa.schema';
import { TrabajadoresModule } from '../trabajadores/trabajadores.module';
import { ProveedoresSaludModule } from '../proveedores-salud/proveedores-salud.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RiesgoTrabajo.name, schema: RiesgoTrabajoSchema },
      { name: Trabajador.name, schema: TrabajadorSchema },
      { name: CentroTrabajo.name, schema: CentroTrabajoSchema },
      { name: Empresa.name, schema: EmpresaSchema },
    ]),
    forwardRef(() => TrabajadoresModule),
    ProveedoresSaludModule,
  ],
  controllers: [RiesgosTrabajoController],
  providers: [RiesgosTrabajoService],
})
export class RiesgosTrabajoModule {}
