import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { EmailsService } from '../emails/emails.service';
import { RefreshTokenService } from './refresh-token.service';
import { JwtAuthGuard } from 'src/utils/guards/jwt-auth.guard';
import { AUTH_FORGOT_PASSWORD } from 'src/utils/throttle/throttle-limits';

describe('UsersController — throttling (H-28)', () => {
  let app: NestExpressApplication;

  const usersService = {
    issuePasswordResetToken: jest.fn().mockRejectedValue(
      new NotFoundException({ msg: 'El usuario no existe' }),
    ),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    usersService.issuePasswordResetToken.mockRejectedValue(
      new NotFoundException({ msg: 'El usuario no existe' }),
    );

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60_000,
            limit: 120,
          },
        ]),
      ],
      controllers: [UsersController],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: UsersService, useValue: usersService },
        {
          provide: EmailsService,
          useValue: { sendEmailPasswordReset: jest.fn() },
        },
        {
          provide: RefreshTokenService,
          useValue: { issue: jest.fn(), rotate: jest.fn(), revoke: jest.fn() },
        },
      ],
    }).compile();

    app = module.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', 1);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST forgot-password devuelve 429 al superar el límite por IP', async () => {
    const agent = request(app.getHttpServer());
    const limit = AUTH_FORGOT_PASSWORD.default.limit;
    const clientIp = '203.0.113.50';

    for (let i = 0; i < limit; i++) {
      await agent
        .post('/auth/users/forgot-password')
        .set('X-Forwarded-For', clientIp)
        .send({ email: 'test@example.com' });
    }

    const res = await agent
      .post('/auth/users/forgot-password')
      .set('X-Forwarded-For', clientIp)
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(429);
  });

  it('POST logout no devuelve 429 en la primera petición (límite global)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/users/logout')
      .set('X-Forwarded-For', '203.0.113.51');

    expect(res.status).not.toBe(429);
  });
});
