import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AcuerdoConfidencialidadController } from './acuerdo-confidencialidad.controller';
import { AcuerdoConfidencialidadService } from './acuerdo-confidencialidad.service';
import {
  AcuerdoConfidencialidadAceptacion,
  AcuerdoConfidencialidadAceptacionSchema,
} from './schemas/acuerdo-confidencialidad-aceptacion.schema';
import { ProveedoresSaludModule } from '../proveedores-salud/proveedores-salud.module';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AcuerdoConfidencialidadAceptacion.name,
        schema: AcuerdoConfidencialidadAceptacionSchema,
      },
    ]),
    forwardRef(() => ProveedoresSaludModule),
    forwardRef(() => UsersModule),
    forwardRef(() => AuditModule),
  ],
  controllers: [AcuerdoConfidencialidadController],
  providers: [AcuerdoConfidencialidadService],
  exports: [AcuerdoConfidencialidadService],
})
export class AcuerdoConfidencialidadModule {}
