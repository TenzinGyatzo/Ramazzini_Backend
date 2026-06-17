import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { ClinicalFilesService } from './clinical-files.service';
import { ClinicalFilesController } from './clinical-files.controller';

@Module({
  controllers: [ClinicalFilesController],
  providers: [FilesService, ClinicalFilesService],
  exports: [FilesService, ClinicalFilesService],
})
export class FilesModule {}
