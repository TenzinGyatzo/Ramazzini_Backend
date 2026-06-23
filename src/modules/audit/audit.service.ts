/**
 * Phase 4 AuditTrail — Record events with canonical hash and chain (D4). Class 1 hard-fail, Class 2 soft-fail to outbox.
 */
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditEvent } from './schemas/audit-event.schema';
import { AuditOutbox } from './schemas/audit-outbox.schema';
import { computeCanonicalHash } from './utils/canonical-hash.util';
import type { AuditEventCanonicalPayload } from './interfaces/audit-event-canonical.interface';
import type { RecordAuditParams } from './interfaces/audit-service.interface';
import { AuditEventClass } from './constants/audit-event-class';
import type { QueryAuditEventsDto } from './dto/query-audit-events.dto';
import { UsersService } from '../users/users.service';
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';
import { isAuditTrailPersistEnabled } from './utils/audit-trail-persist.util';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditEvent.name)
    private readonly auditEventModel: Model<AuditEvent>,
    @InjectModel(AuditOutbox.name)
    private readonly auditOutboxModel: Model<AuditOutbox>,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => RegulatoryPolicyService))
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
  ) {}

  async findEvents(
    proveedorSaludId: string,
    query: QueryAuditEventsDto,
  ): Promise<{ items: AuditEvent[]; total: number }> {
    const filter: Record<string, unknown> = {
      proveedorSaludId: new Types.ObjectId(proveedorSaludId),
    };
    if (query.from || query.to) {
      filter.timestamp = {};
      if (query.from)
        (filter.timestamp as Record<string, Date>).$gte = new Date(query.from);
      if (query.to)
        (filter.timestamp as Record<string, Date>).$lte = new Date(query.to);
    }
    if (query.actorId?.trim()) filter.actorId = query.actorId.trim();
    if (query.resourceType?.trim())
      filter.resourceType = query.resourceType.trim();
    if (query.resourceId?.trim()) filter.resourceId = query.resourceId.trim();
    const actionTypeVal =
      typeof query.actionType === 'string' ? query.actionType.trim() : '';
    if (actionTypeVal) filter.actionType = actionTypeVal;

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.auditEventModel
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditEventModel.countDocuments(filter).exec(),
    ]);
    return { items: items as AuditEvent[], total };
  }

  async exportEvents(
    proveedorSaludId: string,
    from: string,
    to: string,
    format: 'json' | 'csv',
  ): Promise<Buffer> {
    const filter: Record<string, unknown> = {
      proveedorSaludId: new Types.ObjectId(proveedorSaludId),
      timestamp: {},
    };
    (filter.timestamp as Record<string, Date>).$gte = new Date(from);
    (filter.timestamp as Record<string, Date>).$lte = new Date(to);

    const events = await this.auditEventModel
      .find(filter)
      .sort({ timestamp: 1 })
      .lean()
      .exec();

    if (format === 'json') {
      const rows = events.map((e: any) => ({
        proveedorSaludId: e.proveedorSaludId?.toString() ?? null,
        actorId: e.actorId ?? null,
        actorSnapshot: e.actorSnapshot ?? null,
        timestamp:
          e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
        actionType: e.actionType,
        resourceType: e.resourceType ?? null,
        resourceId: e.resourceId ?? null,
        payload: e.payload ?? null,
        hashEvento: e.hashEvento,
        hashEventoAnterior: e.hashEventoAnterior ?? null,
      }));
      return Buffer.from(JSON.stringify(rows, null, 0), 'utf8');
    }

    const header =
      'timestamp,actorId,actorUsername,actorEmail,actorRole,actionType,resourceType,resourceId,hashEvento,hashEventoAnterior\n';
    const lines = events.map((e: any) => {
      const ts =
        e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp;
      const a = (v: unknown) =>
        v == null ? '' : String(v).replace(/"/g, '""');
      const snap = e.actorSnapshot ?? {};
      return `"${ts}","${a(e.actorId)}","${a(snap.username)}","${a(snap.email)}","${a(snap.role)}","${a(e.actionType)}","${a(e.resourceType)}","${a(e.resourceId)}","${a(e.hashEvento)}","${a(e.hashEventoAnterior)}"`;
    });
    return Buffer.from(header + lines.join('\n'), 'utf8');
  }

  async verifyExport(
    proveedorSaludId: string,
    from: string,
    to: string,
  ): Promise<{
    valid: boolean;
    errors?: { index: number; expectedHash: string; actualHash: string }[];
  }> {
    const filter: Record<string, unknown> = {
      proveedorSaludId: new Types.ObjectId(proveedorSaludId),
      timestamp: {},
    };
    (filter.timestamp as Record<string, Date>).$gte = new Date(from);
    (filter.timestamp as Record<string, Date>).$lte = new Date(to);

    const events = await this.auditEventModel
      .find(filter)
      .sort({ timestamp: 1 })
      .lean()
      .exec();

    const errors: {
      index: number;
      expectedHash: string;
      actualHash: string;
    }[] = [];
    let prevHash: string | null = null;

    for (let i = 0; i < events.length; i++) {
      const e = events[i] as any;
      if (i > 0 && e.hashEventoAnterior !== prevHash) {
        errors.push({
          index: i,
          expectedHash: prevHash ?? '(ninguno)',
          actualHash: e.hashEventoAnterior ?? '',
        });
      }
      const canonical: AuditEventCanonicalPayload = {
        proveedorSaludId: e.proveedorSaludId?.toString() ?? null,
        actorId: e.actorId ?? null,
        timestamp:
          e.timestamp instanceof Date
            ? e.timestamp.toISOString()
            : String(e.timestamp),
        actionType: e.actionType,
        resourceType: e.resourceType ?? null,
        resourceId: e.resourceId ?? null,
        payload: e.payload ?? null,
      };
      const { hashEvento } = computeCanonicalHash(canonical, null);
      if (hashEvento !== e.hashEvento) {
        errors.push({
          index: i,
          expectedHash: hashEvento,
          actualHash: e.hashEvento ?? '',
        });
      }
      prevHash = e.hashEvento ?? null;
    }

    return { valid: errors.length === 0, ...(errors.length ? { errors } : {}) };
  }

  async record(params: RecordAuditParams): Promise<void> {
    const proveedorSaludIdStr =
      params.proveedorSaludId != null ? String(params.proveedorSaludId) : null;

    if (proveedorSaludIdStr != null) {
      const policy =
        await this.regulatoryPolicyService.getRegulatoryPolicy(
          proveedorSaludIdStr,
        );
      if (policy.regime !== 'SIRES_NOM024') {
        return;
      }
    }

    if (!isAuditTrailPersistEnabled()) {
      return;
    }

    const timestamp = new Date();
    const actorIdStr = params.actorId != null ? String(params.actorId) : null;

    let actorSnapshot: {
      username: string;
      email: string;
      role: string;
    } | null = null;
    if (actorIdStr && actorIdStr !== 'SYSTEM') {
      try {
        actorSnapshot =
          await this.usersService.getAuditActorSnapshot(actorIdStr);
      } catch {
        // Si falla la lectura del usuario, se guarda sin snapshot (actorId sigue siendo la referencia)
      }
    }

    const canonical: AuditEventCanonicalPayload = {
      proveedorSaludId: proveedorSaludIdStr,
      actorId: actorIdStr,
      timestamp: timestamp.toISOString(),
      actionType: params.actionType,
      resourceType: params.resourceType ?? null,
      resourceId: params.resourceId ?? null,
      payload: params.payload ?? null,
    };

    let previousHash: string | null = null;
    if (proveedorSaludIdStr != null) {
      const last = await this.auditEventModel
        .findOne({ proveedorSaludId: new Types.ObjectId(proveedorSaludIdStr) })
        .sort({ timestamp: -1 })
        .lean()
        .exec();
      if (last && typeof (last as any).hashEvento === 'string') {
        previousHash = (last as any).hashEvento;
      }
    }

    const { hashEvento, hashEventoAnterior } = computeCanonicalHash(
      canonical,
      previousHash,
    );

    try {
      await this.auditEventModel.create({
        proveedorSaludId:
          proveedorSaludIdStr != null
            ? new Types.ObjectId(proveedorSaludIdStr)
            : null,
        actorId: actorIdStr,
        actorSnapshot,
        timestamp,
        actionType: params.actionType,
        resourceType: params.resourceType ?? null,
        resourceId: params.resourceId ?? null,
        payload: params.payload ?? null,
        hashEvento,
        hashEventoAnterior,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (params.eventClass === AuditEventClass.CLASS_1_HARD_FAIL) {
        throw err;
      }
      this.logger.warn(
        `Audit record failed (Class 2), writing to outbox: ${message}`,
      );
      await this.auditOutboxModel.create({
        proveedorSaludId:
          proveedorSaludIdStr != null
            ? new Types.ObjectId(proveedorSaludIdStr)
            : null,
        actorId: actorIdStr,
        actorSnapshot,
        timestamp,
        actionType: params.actionType,
        payload: params.payload ?? null,
        eventClass: params.eventClass,
        errorMessage: message,
      });
    }
  }
}
