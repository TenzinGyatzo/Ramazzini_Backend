/**
 * NOM-024 Phase 4 — Clase 1 hard-fail (op falla si audit falla), Clase 2 soft-fail (outbox).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
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

describe('NOM-024 Audit Class 1 / Class 2 (04-06)', () => {
  let auditService: AuditService;
  let auditEventModelMock: any;
  let auditOutboxModelMock: any;

  beforeEach(async () => {
    enableAuditTrailPersist();
    auditEventModelMock = {
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
        }),
      }),
      create: jest.fn().mockResolvedValue({}),
    };
    auditOutboxModelMock = {
      create: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        AuditService,
        mockRegulatoryPolicyServiceSires,
        {
          provide: getModelToken(AuditEvent.name),
          useValue: auditEventModelMock,
        },
        {
          provide: getModelToken(AuditOutbox.name),
          useValue: auditOutboxModelMock,
        },
        {
          provide: UsersService,
          useValue: {
            getAuditActorSnapshot: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    auditService = module.get<AuditService>(AuditService);
  });

  describe('Clase 1 — hard-fail', () => {
    it('when AuditEvent.create fails, record(CLASS_1) throws and operation fails', async () => {
      auditEventModelMock.create.mockRejectedValueOnce(
        new Error('audit storage failed'),
      );

      await expect(
        auditService.record({
          proveedorSaludId: '507f1f77bcf86cd799439011',
          actorId: 'user1',
          actionType: AuditActionType.DOC_FINALIZE,
          resourceType: 'notaMedica',
          resourceId: 'doc1',
          payload: null,
          eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
        }),
      ).rejects.toThrow('audit storage failed');

      expect(auditOutboxModelMock.create).not.toHaveBeenCalled();
    });
  });

  describe('Clase 2 — soft-fail y audit_outbox', () => {
    it('when AuditEvent.create fails, record(CLASS_2) does not throw and writes to outbox', async () => {
      auditEventModelMock.create.mockRejectedValueOnce(
        new Error('audit storage failed'),
      );

      await expect(
        auditService.record({
          proveedorSaludId: '507f1f77bcf86cd799439011',
          actorId: null,
          actionType: AuditActionType.LOGIN_FAIL,
          resourceType: null,
          resourceId: null,
          payload: { reason: 'bad credentials' },
          eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
        }),
      ).resolves.not.toThrow();

      expect(auditOutboxModelMock.create).toHaveBeenCalledTimes(1);
      const outboxCall = auditOutboxModelMock.create.mock.calls[0][0];
      expect(outboxCall.actionType).toBe(AuditActionType.LOGIN_FAIL);
      expect(outboxCall.errorMessage).toContain('audit storage failed');
    });
  });
});
