import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TecnicoFirmante,
  TecnicoFirmanteSchema,
} from './schemas/tecnico-firmante.schema';
import { TecnicosFirmantesController } from './tecnicos-firmantes.controller';
import { TecnicosFirmantesService } from './tecnicos-firmantes.service';
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
      { name: TecnicoFirmante.name, schema: TecnicoFirmanteSchema },
      { name: User.name, schema: UserSchema },
      { name: ProveedorSalud.name, schema: ProveedorSaludSchema },
    ]),
    ProveedoresSaludModule,
    ClinicalAttentionQueryModule,
  ],
  controllers: [TecnicosFirmantesController],
  providers: [TecnicosFirmantesService, RegulatoryPolicyService],
  exports: [TecnicosFirmantesService],
})
export class TecnicosFirmantesModule {}
