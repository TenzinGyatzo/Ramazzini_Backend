import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BrandingAssetsService } from './branding-assets.service';
import { getUserIdFromRequest } from 'src/utils/auth-helpers';

@Controller()
export class BrandingAssetsController {
  constructor(private readonly brandingAssetsService: BrandingAssetsService) {}

  @Get('assets/signatories/:filename')
  async getSignatory(
    @Param('filename') filename: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = getUserIdFromRequest(req);
    await this.brandingAssetsService.sendSignatoryForUser(userId, filename, res);
  }

  @Get('assets/providers-logos/:filename')
  async getProviderLogo(
    @Param('filename') filename: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = getUserIdFromRequest(req);
    await this.brandingAssetsService.sendProviderLogoForUser(
      userId,
      filename,
      res,
    );
  }
}
