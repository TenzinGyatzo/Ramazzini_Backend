/**
 * NOM-024 Phase 4 — D4 eventos append-only y tamper-evident; verificación de cadena.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  startMongoMemoryServer,
  stopMongoMemoryServer,
  clearDatabase,
} from '../utils/mongodb-memory.util';
import { AuditService } from '../../src/modules/audit/audit.service';
import {
  AuditEvent,
  AuditEventSchema,
} from '../../src/modules/audit/schemas/audit-event.schema';
import {
  AuditOutbox,
  AuditOutboxSchema,
} from '../../src/modules/audit/schemas/audit-outbox.schema';
import { AuditActionType } from '../../src/modules/audit/constants/audit-action-type';
import { AuditEventClass } from '../../src/modules/audit/constants/audit-event-class';
import { UsersService } from '../../src/modules/users/users.service';
import {
  enableAuditTrailPersist,
  mockRegulatoryPolicyServiceSires,
} from '../utils/audit-trail-test.util';
import * as fs from 'fs';
import * as path from 'path';

describe('NOM-024 Audit Tamper-Evident (04-06)', () => {
  let uri: string;
  let auditService: AuditService;
  let auditEventModel: any;

  beforeAll(async () => {
    uri = await startMongoMemoryServer();
  });

  afterAll(async () => {
    await stopMongoMemoryServer();
  });

  beforeEach(async () => {
    enableAuditTrailPersist();
    await clearDatabase();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: AuditEvent.name, schema: AuditEventSchema },
          { name: AuditOutbox.name, schema: AuditOutboxSchema },
        ]),
      ],
      providers: [
        AuditService,
        mockRegulatoryPolicyServiceSires,
        {
          provide: UsersService,
          useValue: {
            getAuditActorSnapshot: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    auditService = module.get<AuditService>(AuditService);
    auditEventModel = module.get(getModelToken(AuditEvent.name));
  });

  describe('D4 — Verificación de cadena y tamper-evident', () => {
    it('verifyExport returns valid: true for unaltered events in range', async () => {
      const proveedorSaludId = new Types.ObjectId().toString();
      const now = new Date();
      const from = new Date(now.getTime() - 60000).toISOString();
      const to = new Date(now.getTime() + 60000).toISOString();

      await auditService.record({
        proveedorSaludId,
        actorId: 'user1',
        actionType: AuditActionType.LOGIN_SUCCESS,
        resourceType: null,
        resourceId: null,
        payload: null,
        eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
      });
      await auditService.record({
        proveedorSaludId,
        actorId: 'user1',
        actionType: AuditActionType.DOC_CREATE_DRAFT,
        resourceType: 'notaMedica',
        resourceId: 'doc1',
        payload: null,
        eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
      });

      const result = await auditService.verifyExport(
        proveedorSaludId,
        from,
        to,
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('verifyExport returns valid: false after tampering hashEvento in DB', async () => {
      const proveedorSaludId = new Types.ObjectId().toString();
      const now = new Date();
      const from = new Date(now.getTime() - 60000).toISOString(); // 1 min ago
      const to = new Date(now.getTime() + 60000).toISOString(); // 1 min later

      await auditService.record({
        proveedorSaludId,
        actorId: 'user1',
        actionType: AuditActionType.LOGIN_SUCCESS,
        resourceType: null,
        resourceId: null,
        payload: null,
        eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
      });

      const events = await auditEventModel
        .find({ proveedorSaludId: new Types.ObjectId(proveedorSaludId) })
        .lean()
        .exec();
      expect(events.length).toBeGreaterThanOrEqual(1);
      await auditEventModel.updateOne(
        { _id: events[0]._id },
        { $set: { hashEvento: 'tampered' } },
      );

      const result = await auditService.verifyExport(
        proveedorSaludId,
        from,
        to,
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('D4 — Append-only: no update/delete on AuditEvent in application code', () => {
    it('audit.service.ts does not use updateOne/findOneAndUpdate/deleteOne on audit events', () => {
      const auditServicePath = path.join(
        __dirname,
        '../../src/modules/audit/audit.service.ts',
      );
      const content = fs.readFileSync(auditServicePath, 'utf8');
      // Application must only create; no in-place update or delete of AuditEvent
      expect(content).not.toMatch(
        /auditEventModel\.(updateOne|findOneAndUpdate|deleteOne|update\s*\()/,
      );
    });
  });
});
