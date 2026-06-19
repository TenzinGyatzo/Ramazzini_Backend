import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuditService } from './audit.service';
import { QueryAuditEventsDto } from './dto/query-audit-events.dto';
import { getUserIdFromRequest } from '../../utils/auth-helpers';
import { UsersService } from '../users/users.service';
import { AuditActionType } from './constants/audit-action-type';
import { AuditEventClass } from './constants/audit-event-class';
import { assertAuditAccessRole } from './utils/audit-access-auth.util';

@Controller('api/audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
  ) {}

  private async assertAuditAccess(req: Request): Promise<string> {
    const userId = getUserIdFromRequest(req);
    const user = await this.usersService.findById(
      userId,
      'role idProveedorSalud',
    );
    assertAuditAccessRole(user?.role);
    if (!user?.idProveedorSalud) {
      throw new UnauthorizedException(
        'Usuario sin proveedor de salud asociado para consultar auditoría',
      );
    }
    return String(user.idProveedorSalud);
  }

  @Get('events')
  async getEvents(@Query() query: QueryAuditEventsDto, @Req() req: Request) {
    const proveedorSaludId = await this.assertAuditAccess(req);
    const { items, total } = await this.auditService.findEvents(
      proveedorSaludId,
      query,
    );
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    return { items, total, page, limit };
  }

  @Get('export')
  async export(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ) {
    if (!from || !to) {
      throw new BadRequestException('Query from y to son obligatorios');
    }
    const proveedorSaludId = await this.assertAuditAccess(req);
    const userId = getUserIdFromRequest(req);
    await this.auditService.record({
      proveedorSaludId,
      actorId: userId,
      actionType: AuditActionType.AUDIT_EXPORT_DOWNLOAD,
      resourceType: 'audit_export',
      resourceId: null,
      payload: { from, to, format },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });
    const buffer = await this.auditService.exportEvents(
      proveedorSaludId,
      from,
      to,
      format ?? 'json',
    );
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const ext = format === 'csv' ? 'csv' : 'json';
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-export.${ext}"`,
    );
    res.setHeader('Content-Type', contentType);
    res.send(buffer);
  }

  @Get('verify')
  async verify(
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: Request,
  ) {
    if (!from || !to) {
      throw new BadRequestException('Query from y to son obligatorios');
    }
    const proveedorSaludId = await this.assertAuditAccess(req);
    return this.auditService.verifyExport(proveedorSaludId, from, to);
  }
}
