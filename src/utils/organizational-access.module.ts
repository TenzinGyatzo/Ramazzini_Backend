import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationalAccessService } from './organizational-access.service';
import { User } from 'src/modules/users/entities/user.entity';
import { UserSchema } from 'src/modules/users/schemas/user.schema';
import { CentroTrabajo } from 'src/modules/centros-trabajo/schemas/centro-trabajo.schema';
import { CentroTrabajoSchema } from 'src/modules/centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from 'src/modules/empresas/schemas/empresa.schema';
import { EmpresaSchema } from 'src/modules/empresas/schemas/empresa.schema';
import { Trabajador } from 'src/modules/trabajadores/schemas/trabajador.schema';
import { TrabajadorSchema } from 'src/modules/trabajadores/schemas/trabajador.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: CentroTrabajo.name, schema: CentroTrabajoSchema },
      { name: Empresa.name, schema: EmpresaSchema },
      { name: Trabajador.name, schema: TrabajadorSchema },
    ]),
  ],
  providers: [OrganizationalAccessService],
  exports: [OrganizationalAccessService],
})
export class OrganizationalAccessModule {}
