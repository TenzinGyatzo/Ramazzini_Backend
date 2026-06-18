import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { EmailsService } from '../emails/emails.service';
import { RefreshTokenService } from './refresh-token.service';
import { JwtAuthGuard } from 'src/utils/guards/jwt-auth.guard';
import { EXPIRED_TOKEN_MSG, INVALID_TOKEN_MSG } from 'src/utils/user-token';
import { PASSWORD_POLICY_MSG } from 'src/utils/validate-password-policy';

describe('UsersController — reset password (H-34)', () => {
  let app: NestExpressApplication;

  const usersService = {
    resetPasswordWithToken: jest.fn(),
    validatePasswordResetToken: jest.fn(),
    verifyAccountWithToken: jest.fn(),
    issuePasswordResetToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
          useValue: {
            sendEmailPasswordReset: jest.fn(),
            sendEmailVerification: jest.fn(),
          },
        },
        {
          provide: RefreshTokenService,
          useValue: { issue: jest.fn(), rotate: jest.fn(), revoke: jest.fn() },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST forgot-password/:token devuelve 400 con msg si la contraseña es débil', async () => {
    usersService.resetPasswordWithToken.mockRejectedValue(
      new BadRequestException({ msg: PASSWORD_POLICY_MSG }),
    );

    const res = await request(app.getHttpServer())
      .post('/auth/users/forgot-password/some-token')
      .send({ password: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe(PASSWORD_POLICY_MSG);
  });

  it('POST forgot-password/:token devuelve 200 con msg si el reset es válido', async () => {
    usersService.resetPasswordWithToken.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .post('/auth/users/forgot-password/some-token')
      .send({ password: 'Secret123' });

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe('Contraseña actualizada correctamente');
  });

  it('GET verify/:token propaga msg en token inválido', async () => {
    usersService.verifyAccountWithToken.mockRejectedValue(
      new NotFoundException({ msg: INVALID_TOKEN_MSG }),
    );

    const res = await request(app.getHttpServer()).get(
      '/auth/users/verify/bad-token',
    );

    expect(res.status).toBe(404);
    expect(res.body.msg).toBe(INVALID_TOKEN_MSG);
  });

  it('GET forgot-password/:token propaga msg en token expirado', async () => {
    usersService.validatePasswordResetToken.mockRejectedValue(
      new BadRequestException({ msg: EXPIRED_TOKEN_MSG }),
    );

    const res = await request(app.getHttpServer()).get(
      '/auth/users/forgot-password/expired-token',
    );

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe(EXPIRED_TOKEN_MSG);
  });
});
