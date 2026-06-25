import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsentimientosController } from './consentimientos.controller';
import { ConsentimientosService } from './consentimientos.service';
import {
  Consentimiento,
  ConsentimientoSchema,
} from './schemas/consentimiento.schema';
import { TrabajadoresModule } from '../trabajadores/trabajadores.module';
import { ProveedoresSaludModule } from '../proveedores-salud/proveedores-salud.module';
import {
  Trabajador,
  TrabajadorSchema,
} from '../trabajadores/schemas/trabajador.schema';
import {
  CentroTrabajo,
  CentroTrabajoSchema,
} from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa, EmpresaSchema } from '../empresas/schemas/empresa.schema';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Consentimiento.name, schema: ConsentimientoSchema },
      { name: Trabajador.name, schema: TrabajadorSchema },
      { name: CentroTrabajo.name, schema: CentroTrabajoSchema },
      { name: Empresa.name, schema: EmpresaSchema },
    ]),
    forwardRef(() => TrabajadoresModule),
    forwardRef(() => ProveedoresSaludModule),
    AuditModule,
  ],
  controllers: [ConsentimientosController],
  providers: [ConsentimientosService],
  exports: [ConsentimientosService],
})
export class ConsentimientosModule {}
