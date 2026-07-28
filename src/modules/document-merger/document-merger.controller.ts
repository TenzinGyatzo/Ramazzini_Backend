import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { DocumentMergerService } from './document-merger.service';
import { MergeDocumentsDto } from './dto/merge-documents.dto';

type AuthenticatedRequest = Request & { userId: string };

@ApiTags('Document merger')
@Controller('document-merger')
export class DocumentMergerController {
  constructor(private readonly documentMergerService: DocumentMergerService) {}

  @Post('merge')
  @ApiOperation({ summary: 'Combina PDFs/imágenes clínicas y descarga el resultado' })
  @ApiResponse({ status: 200, description: 'PDF combinado' })
  async mergePdf(
    @Body() dto: MergeDocumentsDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const mergedPdf = await this.documentMergerService.mergeDocuments(
      req.userId,
      dto.trabajadorId,
      dto.documents,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="merged.pdf"',
    });
    res.send(mergedPdf);
  }
}
