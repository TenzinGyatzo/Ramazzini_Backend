import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { ClinicalFilesService } from './clinical-files.service';
import { ClinicalFilesController } from './clinical-files.controller';
import { OrganizationalAccessModule } from 'src/utils/organizational-access.module';

@Module({
  imports: [OrganizationalAccessModule],
  controllers: [ClinicalFilesController],
  providers: [FilesService, ClinicalFilesService],
  exports: [FilesService, ClinicalFilesService],
})
export class FilesModule {}
