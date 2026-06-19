import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProveedoresSaludModule } from '../proveedores-salud/proveedores-salud.module';
import {
  UserActivitySession,
  UserActivitySessionSchema,
} from './schemas/user-activity-session.schema';
import { SessionActivityService } from './session-activity.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserActivitySession.name, schema: UserActivitySessionSchema },
    ]),
    forwardRef(() => ProveedoresSaludModule),
  ],
  providers: [SessionActivityService],
  exports: [SessionActivityService],
})
export class SessionActivityModule {}
