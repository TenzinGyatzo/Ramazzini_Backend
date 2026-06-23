/**
 * NOM-024 Phase 4 — D5 segregación por proveedor; D7 checklist de eventos.
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

describe('NOM-024 Audit Trail (04-06)', () => {
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

  describe('D5 — Segregación por proveedor', () => {
    it('findEvents(proveedorB) does not return events from proveedorA', async () => {
      const proveedorA = new Types.ObjectId().toString();
      const proveedorB = new Types.ObjectId().toString();

      await auditService.record({
        proveedorSaludId: proveedorA,
        actorId: 'userA',
        actionType: AuditActionType.LOGIN_SUCCESS,
        resourceType: null,
        resourceId: null,
        payload: null,
        eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
      });
      await auditService.record({
        proveedorSaludId: proveedorB,
        actorId: 'userB',
        actionType: AuditActionType.LOGIN_SUCCESS,
        resourceType: null,
        resourceId: null,
        payload: null,
        eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
      });

      const { items } = await auditService.findEvents(proveedorB, {
        page: 1,
        limit: 50,
      });

      const proveedorAObjectId = new Types.ObjectId(proveedorA);
      const fromA = items.filter(
        (e: any) =>
          e.proveedorSaludId?.toString() === proveedorAObjectId.toString(),
      );
      expect(fromA.length).toBe(0);
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(
        items.every(
          (e: any) =>
            e.proveedorSaludId?.toString() === proveedorB ||
            e.proveedorSaludId === null,
        ),
      ).toBe(true);
    });
  });

  describe('D7 — Checklist de eventos', () => {
    it('action types for login, finalize, GIIS export, audit export are defined', () => {
      expect(AuditActionType.LOGIN_SUCCESS).toBe('LOGIN_SUCCESS');
      expect(AuditActionType.LOGIN_FAIL).toBe('LOGIN_FAIL');
      expect(AuditActionType.DOC_FINALIZE).toBe('DOC_FINALIZE');
      expect(AuditActionType.GIIS_EXPORT_STARTED).toBe('GIIS_EXPORT_STARTED');
      expect(AuditActionType.GIIS_EXPORT_FILE_GENERATED).toBe(
        'GIIS_EXPORT_FILE_GENERATED',
      );
      expect(AuditActionType.GIIS_EXPORT_DOWNLOADED).toBe(
        'GIIS_EXPORT_DOWNLOADED',
      );
      expect(AuditActionType.AUDIT_EXPORT_DOWNLOAD).toBe(
        'AUDIT_EXPORT_DOWNLOAD',
      );
    });

    it('each audit event has single actor (actorId or SYSTEM)', async () => {
      await auditService.record({
        proveedorSaludId: new Types.ObjectId().toString(),
        actorId: 'user1',
        actionType: AuditActionType.DOC_CREATE_DRAFT,
        resourceType: 'notaMedica',
        resourceId: 'doc1',
        payload: null,
        eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
      });

      const events = await auditEventModel.find({}).lean().exec();
      expect(events.length).toBeGreaterThanOrEqual(1);
      for (const e of events) {
        expect(e.actionType).toBeDefined();
        expect(typeof e.actorId === 'string' || e.actorId === null).toBe(true);
      }
    });
  });

  describe('AUDIT_TRAIL_PERSIST gate', () => {
    it('does not persist events when AUDIT_TRAIL_PERSIST is disabled', async () => {
      delete process.env.AUDIT_TRAIL_PERSIST;
      const proveedorSaludId = new Types.ObjectId().toString();

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
      expect(events.length).toBe(0);
    });
  });
});
