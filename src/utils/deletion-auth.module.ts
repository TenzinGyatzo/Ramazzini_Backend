import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CentroTrabajo, CentroTrabajoSchema } from 'src/modules/centros-trabajo/schemas/centro-trabajo.schema';
import { Trabajador, TrabajadorSchema } from 'src/modules/trabajadores/schemas/trabajador.schema';
import { User, UserSchema } from 'src/modules/users/schemas/user.schema';
import { DeletionPasswordGuard } from './guards/deletion-password.guard';
import { DeletionCascadeService } from './services/deletion-cascade.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: CentroTrabajo.name, schema: CentroTrabajoSchema },
      { name: Trabajador.name, schema: TrabajadorSchema },
    ]),
  ],
  providers: [DeletionCascadeService, DeletionPasswordGuard],
  exports: [DeletionCascadeService, DeletionPasswordGuard],
})
export class DeletionAuthModule {}
