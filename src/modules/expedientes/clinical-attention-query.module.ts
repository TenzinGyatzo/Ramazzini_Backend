import { Module } from '@nestjs/common';
import { ClinicalAttentionQueryService } from './services/clinical-attention-query.service';

@Module({
  providers: [ClinicalAttentionQueryService],
  exports: [ClinicalAttentionQueryService],
})
export class ClinicalAttentionQueryModule {}
