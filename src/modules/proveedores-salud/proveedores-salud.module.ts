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
import { Empresa, EmpresaSchema } from '../empresas/schemas/empresa.schema';
import {
  Suscripcion,
  SuscripcionSchema,
} from '../pagos/schemas/suscripcion.schema';

@Module({
  imports: [
    forwardRef(() => AuditModule),
    MongooseModule.forFeature([
      { name: ProveedorSalud.name, schema: ProveedorSaludSchema },
      { name: User.name, schema: UserSchema },
      { name: Empresa.name, schema: EmpresaSchema },
      { name: Suscripcion.name, schema: SuscripcionSchema },
    ]),
    // Note: NOM024ComplianceModule and CatalogsModule are @Global() modules
    // They are available throughout the application without explicit import
  ],
  controllers: [ProveedoresSaludController],
  providers: [ProveedoresSaludService, RegulatoryPolicyService],
  exports: [ProveedoresSaludService, RegulatoryPolicyService],
})
export class ProveedoresSaludModule {}
