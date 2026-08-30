import { EmailsService } from './emails.service';
import { createTransport } from './emails.config';

jest.mock('./emails.config', () => ({
  createTransport: jest.fn(),
}));

describe('EmailsService — password reset', () => {
  const sendMail = jest.fn();
  const service = new EmailsService();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_HOST = 'smtp.test';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'smtp-user@test.com';
    process.env.EMAIL_PASS = 'smtp-secret';
    process.env.FRONTEND_URL_DOMAIN = 'https://ramazzini.app';
    sendMail.mockResolvedValue({ messageId: 'mid-1' });
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
  });

  it('sendEmailPasswordReset dirige el correo al destinatario y no incluye BCC', async () => {
    await service.sendEmailPasswordReset({
      username: 'Ana',
      email: 'ana@cliente.com',
      token: 'reset-token-value',
    });

    expect(createTransport).toHaveBeenCalledWith(
      'smtp.test',
      '587',
      'smtp-user@test.com',
      'smtp-secret',
    );
    expect(sendMail).toHaveBeenCalledTimes(1);
    const payload = sendMail.mock.calls[0][0];
    expect(payload.to).toBe('ana@cliente.com');
    expect(payload).not.toHaveProperty('bcc');
    expect(payload.html).toContain(
      'https://ramazzini.app/auth/olvide-password/reset-token-value',
    );
  });

  it('sendEmailVerification conserva BCC (otros correos no se alteran)', async () => {
    await service.sendEmailVerification({
      username: 'Ana',
      email: 'ana@cliente.com',
      token: 'verify-token-value',
    });

    const payload = sendMail.mock.calls[0][0];
    expect(payload.to).toBe('ana@cliente.com');
    expect(payload.bcc).toBe('smtp-user@test.com');
  });
});
