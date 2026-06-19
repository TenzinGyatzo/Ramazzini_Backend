import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UnauthorizedException } from '@nestjs/common';
import { SessionActivityService } from './session-activity.service';
import { UserActivitySession } from './schemas/user-activity-session.schema';
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';
import {
  SIRES_SESSION_INACTIVITY_MS,
  SESSION_IDLE_ERROR_CODE,
} from '../../utils/session-inactivity.constants';

describe('SessionActivityService', () => {
  let service: SessionActivityService;
  let sessionModel: {
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    deleteOne: jest.Mock;
    deleteMany: jest.Mock;
  };
  let regulatoryPolicyService: { getRegulatoryPolicy: jest.Mock };

  const userId = '507f1f77bcf86cd799439011';
  const proveedorSires = '507f1f77bcf86cd799439012';
  const sid = 'test-session-id';

  beforeEach(async () => {
    sessionModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
      deleteMany: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    regulatoryPolicyService = {
      getRegulatoryPolicy: jest.fn().mockResolvedValue({
        regime: 'SIRES_NOM024',
        features: { sessionTimeoutEnabled: true },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionActivityService,
        {
          provide: getModelToken(UserActivitySession.name),
          useValue: sessionModel,
        },
        {
          provide: RegulatoryPolicyService,
          useValue: regulatoryPolicyService,
        },
      ],
    }).compile();

    service = module.get(SessionActivityService);
  });

  it('createSession upserts sid with lastActivityAt', async () => {
    sessionModel.findOneAndUpdate.mockResolvedValue({});
    await service.createSession(userId, sid);
    expect(sessionModel.findOneAndUpdate).toHaveBeenCalledWith(
      { sid },
      expect.objectContaining({ sid, lastActivityAt: expect.any(Date) }),
      { upsert: true, new: true },
    );
  });

  it('assertSessionActive passes when SIN_REGIMEN', async () => {
    regulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue({
      regime: 'SIN_REGIMEN',
      features: { sessionTimeoutEnabled: false },
    });
    await expect(
      service.assertSessionActive(undefined, userId, proveedorSires),
    ).resolves.toBeUndefined();
  });

  it('assertSessionActive throws SESSION_IDLE when sid missing on SIRES', async () => {
    await expect(
      service.assertSessionActive(undefined, userId, proveedorSires),
    ).rejects.toThrow(UnauthorizedException);

    try {
      await service.assertSessionActive(undefined, userId, proveedorSires);
    } catch (error) {
      const response = (error as UnauthorizedException).getResponse() as {
        code?: string;
      };
      expect(response.code).toBe(SESSION_IDLE_ERROR_CODE);
    }
  });

  it('assertSessionActive throws SESSION_IDLE when idle exceeds threshold', async () => {
    const stale = new Date(Date.now() - SIRES_SESSION_INACTIVITY_MS - 1000);
    sessionModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        sid,
        userId,
        lastActivityAt: stale,
        save: jest.fn(),
      }),
    });

    await expect(
      service.assertSessionActive(sid, userId, proveedorSires),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('assertSessionActive passes for recent activity', async () => {
    sessionModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        sid,
        userId,
        lastActivityAt: new Date(),
        save: jest.fn(),
      }),
    });

    await expect(
      service.assertSessionActive(sid, userId, proveedorSires),
    ).resolves.toBeUndefined();
  });
});
