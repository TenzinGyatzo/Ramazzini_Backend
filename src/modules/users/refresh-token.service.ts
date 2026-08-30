import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import {
  RefreshSession,
  RefreshSessionDocument,
} from './schemas/refresh-session.schema';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectModel(RefreshSession.name)
    private readonly refreshSessionModel: Model<RefreshSessionDocument>,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async issue(userId: string): Promise<string> {
    const plainToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await this.refreshSessionModel.create({
      userId,
      tokenHash: this.hashToken(plainToken),
      expiresAt,
    });

    return plainToken;
  }

  async rotate(
    presentedToken: string,
  ): Promise<{
    userId: string;
    newRefreshToken: string;
    previousCreatedAt: Date | null;
  }> {
    if (!presentedToken) {
      throw new UnauthorizedException('Refresh token requerido');
    }

    const tokenHash = this.hashToken(presentedToken);
    const session = await this.refreshSessionModel
      .findOne({ tokenHash })
      .exec();

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      if (session) {
        await this.refreshSessionModel.deleteOne({ _id: session._id }).exec();
      }
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const userId = String(session.userId);
    const previousCreatedAt = session.createdAt ?? null;
    await this.refreshSessionModel.deleteOne({ _id: session._id }).exec();
    const newRefreshToken = await this.issue(userId);

    return { userId, newRefreshToken, previousCreatedAt };
  }

  async revoke(presentedToken: string): Promise<void> {
    if (!presentedToken) {
      return;
    }
    const tokenHash = this.hashToken(presentedToken);
    await this.refreshSessionModel.deleteOne({ tokenHash }).exec();
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshSessionModel.deleteMany({ userId }).exec();
  }
}
