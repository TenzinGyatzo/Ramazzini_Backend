import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProveedoresSaludService } from './proveedores-salud.service';
import { ProveedoresSaludController } from './proveedores-salud.controller';
import {
  ProveedorSalud,
  ProveedorSaludSchema,
} from './schemas/proveedor-salud.schema';
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';
import { UserSchema } from '../users/schemas/user.schema';
import { User } from '../users/entities/user.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    forwardRef(() => AuditModule),
    MongooseModule.forFeature([
      { name: ProveedorSalud.name, schema: ProveedorSaludSchema },
      { name: User.name, schema: UserSchema },
    ]),
    // Note: NOM024ComplianceModule and CatalogsModule are @Global() modules
    // They are available throughout the application without explicit import
  ],
  controllers: [ProveedoresSaludController],
  providers: [ProveedoresSaludService, RegulatoryPolicyService],
  exports: [ProveedoresSaludService, RegulatoryPolicyService],
})
export class ProveedoresSaludModule {}
