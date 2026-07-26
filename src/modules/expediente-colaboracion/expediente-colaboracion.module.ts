import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ExpedienteColaboracion,
  ExpedienteColaboracionSchema,
} from './schemas/expediente-colaboracion.schema';
import { ExpedienteColaboracionService } from './expediente-colaboracion.service';
import { CentroTrabajo, CentroTrabajoSchema } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Trabajador, TrabajadorSchema } from '../trabajadores/schemas/trabajador.schema';
import { Empresa, EmpresaSchema } from '../empresas/schemas/empresa.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExpedienteColaboracion.name, schema: ExpedienteColaboracionSchema },
      { name: CentroTrabajo.name, schema: CentroTrabajoSchema },
      { name: Trabajador.name, schema: TrabajadorSchema },
      { name: Empresa.name, schema: EmpresaSchema },
    ]),
  ],
  providers: [ExpedienteColaboracionService],
  exports: [ExpedienteColaboracionService],
})
export class ExpedienteColaboracionModule {}
