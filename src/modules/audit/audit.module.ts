/**
 * Phase 4 AuditTrail — Module (04-02: schemas registered; AuditService in 04-03).
 */
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditEvent, AuditEventSchema } from './schemas/audit-event.schema';
import { AuditOutbox, AuditOutboxSchema } from './schemas/audit-outbox.schema';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { UsersModule } from '../users/users.module';
import { ProveedoresSaludModule } from '../proveedores-salud/proveedores-salud.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditEvent.name, schema: AuditEventSchema },
      { name: AuditOutbox.name, schema: AuditOutboxSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => ProveedoresSaludModule),
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [MongooseModule, AuditService],
})
export class AuditModule {}
