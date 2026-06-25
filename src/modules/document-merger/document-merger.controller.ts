import { BadRequestException, Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { DocumentMergerService } from './document-merger.service';

type AuthenticatedRequest = Request & { userId: string };

@Controller('document-merger')
export class DocumentMergerController {
  constructor(private readonly DocumentMergerService: DocumentMergerService) {}

  @Post('merge')
  async mergePdf(
    @Body('filePaths') filePaths: unknown,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    if (!Array.isArray(filePaths) || filePaths.some((p) => typeof p !== 'string')) {
      throw new BadRequestException('filePaths debe ser un arreglo de rutas relativas');
    }

    const mergedPdf = await this.DocumentMergerService.mergeFiles(
      req.userId,
      filePaths,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="merged.pdf"',
    });
    res.send(mergedPdf);
  }
}
