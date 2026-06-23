/**
 * AuditService — persistence gated by AUDIT_TRAIL_PERSIST.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AuditService } from '../audit.service';
import { AuditEvent } from '../schemas/audit-event.schema';
import { AuditOutbox } from '../schemas/audit-outbox.schema';
import { AuditActionType } from '../constants/audit-action-type';
import { AuditEventClass } from '../constants/audit-event-class';
import { UsersService } from '../../users/users.service';
import {
  enableAuditTrailPersist,
  disableAuditTrailPersist,
  mockRegulatoryPolicyServiceSires,
} from '../../../../test/utils/audit-trail-test.util';

describe('AuditService — AUDIT_TRAIL_PERSIST gate', () => {
  let auditService: AuditService;
  let auditEventModelMock: { create: jest.Mock; findOne: jest.Mock };
  let auditOutboxModelMock: { create: jest.Mock };
  const originalPersist = process.env.AUDIT_TRAIL_PERSIST;

  beforeEach(async () => {
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

  afterEach(() => {
    if (originalPersist === undefined) {
      delete process.env.AUDIT_TRAIL_PERSIST;
    } else {
      process.env.AUDIT_TRAIL_PERSIST = originalPersist;
    }
  });

  it('does not persist when AUDIT_TRAIL_PERSIST is disabled (CLASS_1)', async () => {
    disableAuditTrailPersist();

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
    ).resolves.not.toThrow();

    expect(auditEventModelMock.create).not.toHaveBeenCalled();
    expect(auditOutboxModelMock.create).not.toHaveBeenCalled();
  });

  it('persists when AUDIT_TRAIL_PERSIST is enabled', async () => {
    enableAuditTrailPersist();

    await auditService.record({
      proveedorSaludId: '507f1f77bcf86cd799439011',
      actorId: 'user1',
      actionType: AuditActionType.LOGIN_SUCCESS,
      resourceType: null,
      resourceId: null,
      payload: null,
      eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
    });

    expect(auditEventModelMock.create).toHaveBeenCalledTimes(1);
  });
});
