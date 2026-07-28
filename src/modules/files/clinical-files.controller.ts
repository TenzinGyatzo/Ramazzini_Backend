import { Controller, Get, Head, Post, Body, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ClinicalFilesService } from './clinical-files.service';
import { RegistrarDescargaArchivoClinicoDto } from './dto/registrar-descarga-archivo-clinico.dto';

type AuthenticatedRequest = Request & { userId: string };

@ApiTags('Expedientes médicos — archivos')
@Controller('expedientes-medicos')
export class ClinicalFilesController {
  constructor(private readonly clinicalFilesService: ClinicalFilesService) {}

  @Post('registrar-descarga')
  @ApiOperation({
    summary:
      'Registra en auditoría una descarga exitosa de archivo clínico o documento externo',
  })
  @ApiResponse({ status: 201, description: 'Evento de auditoría registrado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al trabajador' })
  async registrarDescarga(
    @Body() dto: RegistrarDescargaArchivoClinicoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.clinicalFilesService.recordClinicalFileDownload(req.userId, dto);
    return { ok: true };
  }

  @Get('*')
  async getClinicalFile(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const relativePath = this.extractRelativePath(req);
    await this.clinicalFilesService.sendClinicalFileForUser(
      req.userId,
      relativePath,
      res,
    );
  }

  @Head('*')
  async headClinicalFile(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const relativePath = this.extractRelativePath(req);
    await this.clinicalFilesService.assertClinicalFileAccessibleForUser(
      req.userId,
      relativePath,
    );

    const absolutePath =
      this.clinicalFilesService.resolveSafePath(relativePath);
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
