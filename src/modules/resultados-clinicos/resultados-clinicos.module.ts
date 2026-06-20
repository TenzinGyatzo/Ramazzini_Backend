import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResultadosClinicosService } from './resultados-clinicos.service';
import { ResultadosClinicosController } from './resultados-clinicos.controller';
import {
  ResultadoClinico,
  ResultadoClinicoSchema,
} from './schemas/resultado-clinico.schema';
import {
  DocumentoExterno,
  DocumentoExternoSchema,
} from '../expedientes/schemas/documento-externo.schema';
import { Trabajador, TrabajadorSchema } from '../trabajadores/schemas/trabajador.schema';
import { CentroTrabajo, CentroTrabajoSchema } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa, EmpresaSchema } from '../empresas/schemas/empresa.schema';
import { TrabajadoresModule } from '../trabajadores/trabajadores.module';
import { ProveedoresSaludModule } from '../proveedores-salud/proveedores-salud.module';

@Module({
  controllers: [ResultadosClinicosController],
  providers: [ResultadosClinicosService],
  imports: [
    MongooseModule.forFeature([
      { name: ResultadoClinico.name, schema: ResultadoClinicoSchema },
      { name: DocumentoExterno.name, schema: DocumentoExternoSchema },
      { name: Trabajador.name, schema: TrabajadorSchema },
      { name: CentroTrabajo.name, schema: CentroTrabajoSchema },
      { name: Empresa.name, schema: EmpresaSchema },
    ]),
    forwardRef(() => TrabajadoresModule),
    ProveedoresSaludModule,
  ],
  exports: [ResultadosClinicosService],
})
export class ResultadosClinicosModule {}
