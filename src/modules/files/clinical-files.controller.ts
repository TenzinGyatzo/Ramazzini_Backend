import { Controller, Get, Head, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ClinicalFilesService } from './clinical-files.service';

@Controller('expedientes-medicos')
export class ClinicalFilesController {
  constructor(private readonly clinicalFilesService: ClinicalFilesService) {}

  @Get('*')
  async getClinicalFile(@Req() req: Request, @Res() res: Response) {
    const relativePath = this.extractRelativePath(req);
    const absolutePath =
      this.clinicalFilesService.resolveSafePath(relativePath);
    await this.clinicalFilesService.sendClinicalFile(absolutePath, res);
  }

  @Head('*')
  async headClinicalFile(@Req() req: Request, @Res() res: Response) {
    const relativePath = this.extractRelativePath(req);
    const absolutePath =
      this.clinicalFilesService.resolveSafePath(relativePath);
    await this.clinicalFilesService.assertFileExists(absolutePath);

    const contentType = this.clinicalFilesService.getContentType(absolutePath);
    res.setHeader('Content-Type', contentType);
    res.status(200).end();
  }

  private extractRelativePath(req: Request): string {
    const wildcard = (req.params as Record<string, string>)['0'];
    if (wildcard) {
      return decodeURIComponent(wildcard);
    }

    const prefix = '/expedientes-medicos/';
    if (req.path.startsWith(prefix)) {
      return decodeURIComponent(req.path.slice(prefix.length));
    }

    return '';
  }
}
