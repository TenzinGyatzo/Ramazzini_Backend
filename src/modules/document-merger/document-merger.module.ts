import { Module } from '@nestjs/common';
import { DocumentMergerService } from './document-merger.service';
import { DocumentMergerController } from './document-merger.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [DocumentMergerController],
  providers: [DocumentMergerService],
})
export class DocumentMergerModule {}
