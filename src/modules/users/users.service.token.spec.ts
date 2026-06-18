import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { EXPIRED_TOKEN_MSG, INVALID_TOKEN_MSG } from 'src/utils/user-token';
import { PASSWORD_POLICY_MSG } from 'src/utils/validate-password-policy';

describe('UsersService — tokens (H-34)', () => {
  let service: UsersService;
  let savedUsers: Array<Record<string, unknown>>;

  const userModel = {
    findOne: jest.fn((filter: { token?: string; email?: string }) => ({
      exec: jest.fn(async () => {
        if (filter.token) {
          return (
            savedUsers.find((u) => u.token === filter.token) ?? null
          );
        }
        if (filter.email) {
          return savedUsers.find((u) => u.email === filter.email) ?? null;
        }
        return null;
      }),
    })),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
    findOneAndDelete: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockUser = (overrides: Record<string, unknown> = {}) => ({
    token: 'valid-token',
    tokenExpiresAt: new Date(Date.now() + 60_000),
    verified: false,
    password: 'hashed',
    username: 'user1',
    email: 'user@test.com',
    save: jest.fn(async function (this: Record<string, unknown>) {
      const idx = savedUsers.findIndex((u) => u.email === this.email);
      if (idx >= 0) savedUsers[idx] = { ...this };
      else savedUsers.push({ ...this });
      return this;
    }),
    ...overrides,
  });

  beforeEach(() => {
    savedUsers = [];
    userModel.findOne.mockClear();

    service = new UsersService(
      userModel as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('verifyAccountWithToken confirma cuenta y limpia token', async () => {
    const user = mockUser();
    savedUsers.push(user);

    const result = await service.verifyAccountWithToken('valid-token');

    expect(result.verified).toBe(true);
    expect(result.token).toBe('');
    expect(result.tokenExpiresAt).toBeNull();
    expect(user.save).toHaveBeenCalled();
  });

  it('resetPasswordWithToken rechaza contraseña débil', async () => {
    savedUsers.push(mockUser());

    await expect(
      service.resetPasswordWithToken('valid-token', 'x'),
    ).rejects.toMatchObject({
      response: { msg: PASSWORD_POLICY_MSG },
    });
  });

  it('resetPasswordWithToken actualiza password y limpia token', async () => {
    savedUsers.push(mockUser());

    const result = await service.resetPasswordWithToken(
      'valid-token',
      'Secret123',
    );

    expect(result.password).toBe('Secret123');
    expect(result.token).toBe('');
    expect(result.tokenExpiresAt).toBeNull();
  });

  it('findByTokenAndValidate rechaza token expirado', async () => {
    savedUsers.push(
      mockUser({
        tokenExpiresAt: new Date(Date.now() - 1000),
      }),
    );

    await expect(service.findByTokenAndValidate('valid-token')).rejects.toMatchObject({
      response: { msg: EXPIRED_TOKEN_MSG },
    });
  });

  it('findByTokenAndValidate acepta token legacy sin tokenExpiresAt', async () => {
    savedUsers.push(
      mockUser({
        tokenExpiresAt: null,
      }),
    );

    const user = await service.findByTokenAndValidate('valid-token');
    expect(user.token).toBe('valid-token');
  });

  it('findByTokenAndValidate rechaza token inexistente', async () => {
    await expect(
      service.findByTokenAndValidate('missing'),
    ).rejects.toMatchObject({
      response: { msg: INVALID_TOKEN_MSG },
    });
  });

  it('issuePasswordResetToken emite token seguro con expiración', async () => {
    savedUsers.push(mockUser({ token: '', tokenExpiresAt: null }));

    const result = await service.issuePasswordResetToken('user@test.com');

    expect(result.token).toHaveLength(64);
    expect(result.tokenExpiresAt).toBeInstanceOf(Date);
  });

  it('issuePasswordResetToken lanza NotFoundException con msg si no existe email', async () => {
    await expect(
      service.issuePasswordResetToken('missing@test.com'),
    ).rejects.toThrow(NotFoundException);

    await expect(
      service.issuePasswordResetToken('missing@test.com'),
    ).rejects.toMatchObject({
      response: { msg: 'El usuario no existe' },
    });
  });
});
