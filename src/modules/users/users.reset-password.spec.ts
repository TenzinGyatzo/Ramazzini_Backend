import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
  PASSWORD_RESET_EMAIL_FAIL_MSG,
  UsersController,
} from './users.controller';
import { UsersService } from './users.service';
import { EmailsService } from '../emails/emails.service';
import { RefreshTokenService } from './refresh-token.service';
import { JwtAuthGuard } from 'src/utils/guards/jwt-auth.guard';
import { DeletionPasswordGuard } from 'src/utils/guards/deletion-password.guard';
import { AuditService } from '../audit/audit.service';
import { LoginLockoutService } from './login-lockout.service';
import { SessionActivityService } from './session-activity.service';
import { EXPIRED_TOKEN_MSG, INVALID_TOKEN_MSG } from 'src/utils/user-token';
import { PASSWORD_POLICY_MSG } from 'src/utils/validate-password-policy';

describe('UsersController — reset password (H-34)', () => {
  let app: NestExpressApplication;

  const issuedResetUser = {
    _id: { toString: () => 'user-1' },
    username: 'user1',
    email: 'user@test.com',
    token: 'a'.repeat(64),
  };

  const usersService = {
    resetPasswordWithToken: jest.fn(),
    validatePasswordResetToken: jest.fn(),
    verifyAccountWithToken: jest.fn(),
    issuePasswordResetToken: jest.fn(),
    clearPasswordResetTokenIfMatches: jest.fn(),
  };

  const emailsService = {
    sendEmailPasswordReset: jest.fn(),
    sendEmailVerification: jest.fn(),
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
        { provide: EmailsService, useValue: emailsService },
        {
          provide: RefreshTokenService,
          useValue: {
            issue: jest.fn(),
            rotate: jest.fn(),
            revoke: jest.fn(),
            revokeAllForUser: jest.fn(),
          },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
        { provide: LoginLockoutService, useValue: {} },
        {
          provide: SessionActivityService,
          useValue: {
            revokeSession: jest.fn(),
            revokeAllForUser: jest.fn(),
            assertAndTouchSession: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(DeletionPasswordGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST forgot-password espera el envío y responde éxito solo después', async () => {
    usersService.issuePasswordResetToken.mockResolvedValue(issuedResetUser);
    const callOrder: string[] = [];
    usersService.issuePasswordResetToken.mockImplementation(async () => {
      callOrder.push('issue');
      return issuedResetUser;
    });
    emailsService.sendEmailPasswordReset.mockImplementation(async () => {
      callOrder.push('send');
    });

    const res = await request(app.getHttpServer())
      .post('/auth/users/forgot-password')
      .send({ email: 'user@test.com' });

    expect(callOrder).toEqual(['issue', 'send']);
    expect(emailsService.sendEmailPasswordReset).toHaveBeenCalledTimes(1);
    expect(emailsService.sendEmailPasswordReset).toHaveBeenCalledWith({
      username: 'user1',
      email: 'user@test.com',
      token: issuedResetUser.token,
    });
    expect(usersService.clearPasswordResetTokenIfMatches).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body.msg).toBe('Hemos enviado un email con las instrucciones');
  });

  it('POST forgot-password no responde éxito si SMTP falla e invalida el token emitido', async () => {
    usersService.issuePasswordResetToken.mockResolvedValue(issuedResetUser);
    emailsService.sendEmailPasswordReset.mockRejectedValue(
      new Error('SMTP 535 authentication failed secret=smtp-pass'),
    );
    usersService.clearPasswordResetTokenIfMatches.mockResolvedValue(undefined);

    const res = await request(app.getHttpServer())
      .post('/auth/users/forgot-password')
      .send({ email: 'user@test.com' });

    expect(res.status).toBe(503);
    expect(res.body.msg).toBe(PASSWORD_RESET_EMAIL_FAIL_MSG);
    expect(JSON.stringify(res.body)).not.toMatch(/SMTP|535|smtp-pass|secret=/i);
    expect(res.body.msg).not.toBe(
      'Hemos enviado un email con las instrucciones',
    );
    expect(usersService.clearPasswordResetTokenIfMatches).toHaveBeenCalledWith(
      'user-1',
      issuedResetUser.token,
    );
  });

  it('POST forgot-password no oculta el fallo SMTP si falla la invalidación del token', async () => {
    usersService.issuePasswordResetToken.mockResolvedValue(issuedResetUser);
    emailsService.sendEmailPasswordReset.mockRejectedValue(
      new Error('ECONNREFUSED smtp.internal'),
    );
    usersService.clearPasswordResetTokenIfMatches.mockRejectedValue(
      new Error('cleanup failed'),
    );

    const res = await request(app.getHttpServer())
      .post('/auth/users/forgot-password')
      .send({ email: 'user@test.com' });

    expect(res.status).toBe(503);
    expect(res.body.msg).toBe(PASSWORD_RESET_EMAIL_FAIL_MSG);
    expect(JSON.stringify(res.body)).not.toMatch(
      /ECONNREFUSED|smtp\.internal|cleanup failed/i,
    );
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
