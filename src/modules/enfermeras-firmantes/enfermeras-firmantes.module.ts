import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EnfermeraFirmante,
  EnfermeraFirmanteSchema,
} from './schemas/enfermera-firmante.schema';
import { EnfermerasFirmantesController } from './enfermeras-firmantes.controller';
import { EnfermerasFirmantesService } from './enfermeras-firmantes.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  ProveedorSalud,
  ProveedorSaludSchema,
} from '../proveedores-salud/schemas/proveedor-salud.schema';
import { RegulatoryPolicyService } from 'src/utils/regulatory-policy.service';
import { ProveedoresSaludModule } from '../proveedores-salud/proveedores-salud.module';
import { ClinicalAttentionQueryModule } from '../expedientes/clinical-attention-query.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    AuditModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: EnfermeraFirmante.name, schema: EnfermeraFirmanteSchema },
      { name: User.name, schema: UserSchema },
      { name: ProveedorSalud.name, schema: ProveedorSaludSchema },
    ]),
    ProveedoresSaludModule,
    ClinicalAttentionQueryModule,
  ],
  controllers: [EnfermerasFirmantesController],
  providers: [EnfermerasFirmantesService, RegulatoryPolicyService],
  exports: [EnfermerasFirmantesService],
})
export class EnfermerasFirmantesModule {}
