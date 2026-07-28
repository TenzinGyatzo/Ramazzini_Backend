import { Module, forwardRef } from '@nestjs/common';
import { DocumentMergerService } from './document-merger.service';
import { DocumentMergerController } from './document-merger.controller';
import { FilesModule } from '../files/files.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { OrganizationalAccessModule } from 'src/utils/organizational-access.module';

@Module({
  imports: [
    FilesModule,
    OrganizationalAccessModule,
    forwardRef(() => AuditModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [DocumentMergerController],
  providers: [DocumentMergerService],
})
export class DocumentMergerModule {}
