import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshSession } from './schemas/refresh-session.schema';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  const sessions: Array<{
    _id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
  }> = [];

  const model = {
    create: jest.fn(async (doc) => {
      const row = {
        _id: `id-${sessions.length}`,
        createdAt: new Date(),
        ...doc,
      };
      sessions.push(row);
      return row;
    }),
    findOne: jest.fn((filter) => ({
      exec: jest.fn(async () => {
        const row = sessions.find((s) => s.tokenHash === filter.tokenHash);
        return row ?? null;
      }),
    })),
    deleteOne: jest.fn((filter) => ({
      exec: jest.fn(async () => {
        const idx = sessions.findIndex(
          (s) =>
            (filter._id && s._id === filter._id) ||
            (filter.tokenHash && s.tokenHash === filter.tokenHash),
        );
        if (idx >= 0) sessions.splice(idx, 1);
        return { deletedCount: idx >= 0 ? 1 : 0 };
      }),
    })),
    deleteMany: jest.fn(({ userId }) => ({
      exec: jest.fn(async () => {
        const before = sessions.length;
        for (let i = sessions.length - 1; i >= 0; i--) {
          if (sessions[i].userId === userId) sessions.splice(i, 1);
        }
        return { deletedCount: before - sessions.length };
      }),
    })),
  };

  beforeEach(async () => {
    sessions.length = 0;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: getModelToken(RefreshSession.name), useValue: model },
      ],
    }).compile();

    service = module.get(RefreshTokenService);
  });

  it('issue y rotate invalidan el token anterior', async () => {
    const first = await service.issue('user-1');
    const rotated = await service.rotate(first);

    expect(rotated.userId).toBe('user-1');
    expect(rotated.newRefreshToken).not.toBe(first);

    await expect(service.rotate(first)).rejects.toThrow(UnauthorizedException);
  });

  it('revoke elimina la sesión', async () => {
    const token = await service.issue('user-2');
    await service.revoke(token);
    await expect(service.rotate(token)).rejects.toThrow(UnauthorizedException);
  });

  it('revokeAllForUser elimina todas las sesiones del usuario', async () => {
    const token = await service.issue('user-3');
    await service.issue('user-other');
    await service.revokeAllForUser('user-3');
    await expect(service.rotate(token)).rejects.toThrow(UnauthorizedException);
  });
});
