import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicosFirmantesService } from './medicos-firmantes.service';
import { MedicosFirmantesController } from './medicos-firmantes.controller';
import {
  MedicoFirmante,
  MedicoFirmanteSchema,
} from './schemas/medico-firmante.schema';
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
      { name: MedicoFirmante.name, schema: MedicoFirmanteSchema },
      { name: User.name, schema: UserSchema },
      { name: ProveedorSalud.name, schema: ProveedorSaludSchema },
    ]),
    ProveedoresSaludModule,
    ClinicalAttentionQueryModule,
  ],
  controllers: [MedicosFirmantesController],
  providers: [MedicosFirmantesService, RegulatoryPolicyService],
  exports: [MedicosFirmantesService],
})
export class MedicosFirmantesModule {}
