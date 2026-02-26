import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  Res,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GiisBatchService } from './giis-batch.service';
import { GiisValidationService } from './validation/giis-validation.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { getUserIdFromRequest } from '../../utils/auth-helpers';
import { UsersService } from '../users/users.service';
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';
import {
  getOfficialBaseName,
  getOfficialFileName,
} from './naming/giis-official-naming';
import * as fs from 'fs';
import * as path from 'path';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';

const EXPORTS_BASE = 'exports/giis';
const VALID_GUIDES = ['CEX', 'LES'] as const;
const DELIVERY_WARNING_9998 =
  'Anexo 3 NOM-024: Para el reporte de información forzosamente debe contar con una CLUES válida. Este archivo fue generado con CLUES 9998 y podría ser rechazado por la DGIS.';

@Controller('api/giis-export')
export class GiisExportController {
  constructor(
    private readonly giisBatchService: GiisBatchService,
    private readonly giisValidationService: GiisValidationService,
    private readonly usersService: UsersService,
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
    private readonly auditService: AuditService,
  ) {}

  private async getProveedorSaludIdFromRequest(req: Request): Promise<string> {
    const userId = getUserIdFromRequest(req);
    const user = await this.usersService.findById(userId, 'idProveedorSalud');
    if (!user?.idProveedorSalud) {
      throw new UnauthorizedException(
        'Usuario sin proveedor de salud asociado',
      );
    }
    return user.idProveedorSalud != null ? String(user.idProveedorSalud) : '';
  }

  private async assertSiresAndOwnership(
    proveedorSaludId: string,
    batchProveedorId: string,
  ): Promise<void> {
    const a = String(proveedorSaludId);
    const b = String(batchProveedorId);
    if (a !== b) {
      throw new ForbiddenException('El batch no pertenece a su proveedor');
    }
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    if (policy.regime !== 'SIRES_NOM024') {
      throw new ForbiddenException(
        'La exportación GIIS solo está disponible para proveedores con régimen SIRES_NOM024.',
      );
    }
  }

  @Get('batches')
  async listBatches(@Req() req: Request) {
    const proveedorSaludId = await this.getProveedorSaludIdFromRequest(req);
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    if (policy.regime !== 'SIRES_NOM024') {
      throw new ForbiddenException(
        'La exportación GIIS solo está disponible para proveedores con régimen SIRES_NOM024.',
      );
    }
    const list =
      await this.giisBatchService.listBatchesForProveedor(proveedorSaludId);
    return list;
  }

  @Post('batches')
  async createBatch(@Body() dto: CreateBatchDto, @Req() req: Request) {
    const proveedorSaludId = await this.getProveedorSaludIdFromRequest(req);
    const userId = getUserIdFromRequest(req);

    const batch = await this.giisBatchService.createBatchForExport(
      proveedorSaludId,
      dto.yearMonth,
      { onlyFinalized: dto.onlyFinalized, createdByUserId: userId },
    );

    await this.giisBatchService.generateBatchCex(batch._id.toString());
    await this.giisBatchService.generateBatchLes(batch._id.toString());

    const updated = await this.giisBatchService.getBatch(batch._id.toString());
    return {
      batchId: batch._id.toString(),
      status: updated?.status ?? batch.status,
      yearMonth: batch.yearMonth,
      establecimientoClues: batch.establecimientoClues,
    };
  }

  @Get('batches/:batchId')
  async getBatch(@Param('batchId') batchId: string, @Req() req: Request) {
    const proveedorSaludId = await this.getProveedorSaludIdFromRequest(req);

    const batch = await this.giisBatchService.getBatch(batchId);
    if (!batch) {
      throw new NotFoundException('Batch no encontrado');
    }

    await this.assertSiresAndOwnership(
      proveedorSaludId,
      batch.proveedorSaludId.toString(),
    );

    return {
      batchId: batch._id.toString(),
      status: batch.status,
      yearMonth: batch.yearMonth,
      establecimientoClues: batch.establecimientoClues,
      artifacts: batch.artifacts ?? [],
      errorMessage: batch.errorMessage,
      completedAt: batch.completedAt,
      validationStatus: batch.validationStatus,
    };
  }

  @Post('prevalidate')
  async prevalidate(
    @Body() body: { yearMonth: string; guides?: string[] },
    @Req() req: Request,
  ) {
    const proveedorSaludId = await this.getProveedorSaludIdFromRequest(req);
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    if (policy.regime !== 'SIRES_NOM024') {
      throw new ForbiddenException(
        'La exportación GIIS solo está disponible para proveedores con régimen SIRES_NOM024.',
      );
    }
    const guides = (body.guides ?? ['CEX', 'LES']).filter((g) =>
      VALID_GUIDES.includes(g as (typeof VALID_GUIDES)[number]),
    ) as (typeof VALID_GUIDES)[number][];
    if (guides.length === 0) {
      throw new ForbiddenException(
        'Debe indicar al menos una guía: CEX o LES.',
      );
    }
    const result = await this.giisValidationService.preValidate(
      proveedorSaludId,
      body.yearMonth,
      guides,
    );
    return {
      yearMonth: body.yearMonth,
      guides,
      totalRows: result.totalRows,
      errors: result.errors,
    };
  }

  @Get('batches/:batchId/excluded-report')
  async getExcludedReport(
    @Param('batchId') batchId: string,
    @Query('format') format: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const proveedorSaludId = await this.getProveedorSaludIdFromRequest(req);
    const batch = await this.giisBatchService.getBatch(batchId);
    if (!batch) {
      throw new NotFoundException('Batch no encontrado');
    }
    await this.assertSiresAndOwnership(
      proveedorSaludId,
      batch.proveedorSaludId.toString(),
    );
    const report = batch.excludedReport;
    if (!report || !report.entries?.length) {
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="excluded-report-${batchId}.csv"`,
        );
        return res.send('guía,renglón,campo,causa\n');
      }
      return res.json({ entries: [], totalExcluded: 0 });
    }
    if (format === 'csv') {
      const header = 'guía,renglón,campo,causa\n';
      const rows = report.entries
        .map(
          (e) =>
            `${e.guide},${e.rowIndex},"${String(e.field).replace(/"/g, '""')}","${String(e.cause).replace(/"/g, '""')}"`,
        )
        .join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="excluded-report-${batchId}.csv"`,
      );
      return res.send(header + rows);
    }
    return res.json({
      entries: report.entries,
      totalExcluded: report.totalExcluded,
    });
  }

  @Post('batches/:batchId/build-deliverable')
  async buildDeliverable(
    @Param('batchId') batchId: string,
    @Body() body: { confirmWarnings?: boolean },
    @Req() req: Request,
  ) {
    const proveedorSaludId = await this.getProveedorSaludIdFromRequest(req);
    const batch = await this.giisBatchService.getBatch(batchId);
    if (!batch) {
      throw new NotFoundException('Batch no encontrado');
    }
    await this.assertSiresAndOwnership(
      proveedorSaludId,
      batch.proveedorSaludId.toString(),
    );
    const userId = getUserIdFromRequest(req);
    const updated = await this.giisBatchService.buildDeliverable(
      batchId,
      body.confirmWarnings,
      userId,
    );
    const clues = batch.establecimientoClues ?? '';
    const deliveryWarning =
      clues.trim() === '9998' ? DELIVERY_WARNING_9998 : undefined;
    return {
      batchId: updated?._id?.toString(),
      status: updated?.status,
      artifacts: updated?.artifacts ?? [],
      deliveryWarning,
    };
  }

  @Get('batches/:batchId/download-deliverable/:guide')
  async downloadDeliverable(
    @Param('batchId') batchId: string,
    @Param('guide') guide: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const proveedorSaludId = await this.getProveedorSaludIdFromRequest(req);
    const batch = await this.giisBatchService.getBatch(batchId);
    if (!batch) {
      throw new NotFoundException('Batch no encontrado');
    }
    await this.assertSiresAndOwnership(
      proveedorSaludId,
      batch.proveedorSaludId.toString(),
    );
    const guideUpper = guide.toUpperCase();
    if (!VALID_GUIDES.includes(guideUpper as (typeof VALID_GUIDES)[number])) {
      throw new NotFoundException(
        `Guía inválida. Debe ser una de: ${VALID_GUIDES.join(', ')}`,
      );
    }
    const artifact = batch.artifacts?.find((a) => a.guide === guideUpper);
    const zipPath = artifact?.zipPath;
    if (!zipPath) {
      throw new NotFoundException(
        `No existe entregable ZIP para la guía ${guideUpper}.`,
      );
    }
    const fullPath = path.join(process.cwd(), zipPath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Archivo ZIP no encontrado en el servidor');
    }
    const [year, month] = batch.yearMonth.split('-');
    const aa = year.slice(-2);
    const mm = month;
    const entidadInst =
      (batch.establecimientoClues ?? '').trim() === '9998'
        ? '99SMP'
        : (batch.establecimientoClues ?? '').trim().toUpperCase().slice(0, 5);
    const filename = `${guideUpper}-${entidadInst}-${aa}${mm}.ZIP`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    if ((batch.establecimientoClues ?? '').trim() === '9998') {
      res.setHeader('X-Delivery-Warning', DELIVERY_WARNING_9998);
    }
    await this.auditService.record({
      proveedorSaludId: batch.proveedorSaludId.toString(),
      actorId: getUserIdFromRequest(req) ?? 'SYSTEM',
      actionType: AuditActionType.GIIS_EXPORT_DOWNLOADED,
      resourceType: 'GiisBatch',
      resourceId: batchId,
      payload: { guide: guideUpper },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });
    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  }

  @Get('batches/:batchId/download/:guide')
  async downloadArtifact(
    @Param('batchId') batchId: string,
    @Param('guide') guide: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const proveedorSaludId = await this.getProveedorSaludIdFromRequest(req);

    const batch = await this.giisBatchService.getBatch(batchId);
    if (!batch) {
      throw new NotFoundException('Batch no encontrado');
    }

    await this.assertSiresAndOwnership(
      proveedorSaludId,
      batch.proveedorSaludId.toString(),
    );

    const guideUpper = guide.toUpperCase();
    if (!VALID_GUIDES.includes(guideUpper as (typeof VALID_GUIDES)[number])) {
      throw new NotFoundException(
        `Guía inválida. Debe ser una de: ${VALID_GUIDES.join(', ')}`,
      );
    }

    const artifact = batch.artifacts?.find((a) => a.guide === guideUpper);
    if (!artifact) {
      throw new NotFoundException(
        `No existe archivo generado para la guía ${guideUpper} en este batch`,
      );
    }

    const fullPath = path.join(process.cwd(), artifact.path);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Archivo no encontrado en el servidor');
    }

    const [year, month] = batch.yearMonth.split('-').map(Number);
    const baseName = getOfficialBaseName(
      guideUpper as 'CEX' | 'LES',
      batch.establecimientoClues ?? '',
      year,
      month,
    );
    const filename = getOfficialFileName(baseName, 'TXT');
    res.setHeader('Content-Type', 'text/plain; charset=windows-1252');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await this.auditService.record({
      proveedorSaludId: batch.proveedorSaludId.toString(),
      actorId: getUserIdFromRequest(req) ?? 'SYSTEM',
      actionType: AuditActionType.GIIS_EXPORT_DOWNLOADED,
      resourceType: 'GiisBatch',
      resourceId: batchId,
      payload: { guide: guideUpper },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });
    // Necesario para que el navegador exponga Content-Disposition a JS (CORS)
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    const stream = fs.createReadStream(fullPath, { encoding: 'utf-8' });
    stream.pipe(res);
  }
}
