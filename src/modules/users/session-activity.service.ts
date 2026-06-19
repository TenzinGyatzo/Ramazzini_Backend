import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  UserActivitySession,
  UserActivitySessionDocument,
} from './schemas/user-activity-session.schema';
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';
import {
  SIRES_SESSION_INACTIVITY_MS,
  SESSION_ACTIVITY_TOUCH_THROTTLE_MS,
  SESSION_IDLE_ERROR_CODE,
} from '../../utils/session-inactivity.constants';

@Injectable()
export class SessionActivityService {
  constructor(
    @InjectModel(UserActivitySession.name)
    private readonly sessionModel: Model<UserActivitySessionDocument>,
    @Inject(forwardRef(() => RegulatoryPolicyService))
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
  ) {}

  private throwSessionIdle(message = 'Sesión bloqueada por inactividad'): never {
    throw new UnauthorizedException({
      code: SESSION_IDLE_ERROR_CODE,
      message,
    });
  }

  private async isSessionTimeoutEnforced(
    proveedorSaludId: string | null | undefined,
  ): Promise<boolean> {
    if (!proveedorSaludId) {
      return false;
    }
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    return policy.features.sessionTimeoutEnabled === true;
  }

  async createSession(userId: string, sid: string): Promise<void> {
    const now = new Date();
    await this.sessionModel.findOneAndUpdate(
      { sid },
      {
        sid,
        userId: new Types.ObjectId(userId),
        lastActivityAt: now,
      },
      { upsert: true, new: true },
    );
  }

  async touchSession(sid: string, userId: string): Promise<void> {
    const session = await this.sessionModel.findOne({ sid }).exec();
    if (!session || String(session.userId) !== userId) {
      return;
    }

    const now = Date.now();
    const last = session.lastActivityAt?.getTime() ?? 0;
    if (now - last < SESSION_ACTIVITY_TOUCH_THROTTLE_MS) {
      return;
    }

    session.lastActivityAt = new Date(now);
    await session.save();
  }

  async assertSessionActive(
    sid: string | undefined,
    userId: string,
    proveedorSaludId: string | null | undefined,
  ): Promise<void> {
    const enforced = await this.isSessionTimeoutEnforced(proveedorSaludId);
    if (!enforced) {
      return;
    }

    if (!sid) {
      this.throwSessionIdle(
        'Sesión expirada, vuelve a iniciar sesión',
      );
    }

    const session = await this.sessionModel.findOne({ sid }).exec();
    if (!session || String(session.userId) !== userId) {
      this.throwSessionIdle(
        'Sesión expirada, vuelve a iniciar sesión',
      );
    }

    const idleMs = Date.now() - session.lastActivityAt.getTime();
    if (idleMs > SIRES_SESSION_INACTIVITY_MS) {
      this.throwSessionIdle();
    }
  }

  async assertAndTouchSession(
    sid: string | undefined,
    userId: string,
    proveedorSaludId: string | null | undefined,
  ): Promise<void> {
    await this.assertSessionActive(sid, userId, proveedorSaludId);
    if (sid) {
      await this.touchSession(sid, userId);
    }
  }

  async validateSessionOwnership(
    sid: string | undefined,
    userId: string,
  ): Promise<void> {
    if (!sid) {
      throw new UnauthorizedException('Identificador de sesión requerido');
    }
    const session = await this.sessionModel.findOne({ sid }).exec();
    if (!session || String(session.userId) !== userId) {
      throw new UnauthorizedException('Sesión inválida');
    }
  }

  async revokeSession(sid: string | undefined): Promise<void> {
    if (!sid) {
      return;
    }
    await this.sessionModel.deleteOne({ sid }).exec();
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.sessionModel
      .deleteMany({ userId: new Types.ObjectId(userId) })
      .exec();
  }
}
