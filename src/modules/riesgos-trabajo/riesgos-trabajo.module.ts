import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RiesgosTrabajoService } from './riesgos-trabajo.service';
import { RiesgosTrabajoController } from './riesgos-trabajo.controller';
import {
  RiesgoTrabajo,
  RiesgoTrabajoSchema,
} from './schemas/riesgo-trabajo.schema';
import { TrabajadoresModule } from '../trabajadores/trabajadores.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RiesgoTrabajo.name, schema: RiesgoTrabajoSchema },
    ]),
    forwardRef(() => TrabajadoresModule),
  ],
  controllers: [RiesgosTrabajoController],
  providers: [RiesgosTrabajoService],
})
export class RiesgosTrabajoModule {}
