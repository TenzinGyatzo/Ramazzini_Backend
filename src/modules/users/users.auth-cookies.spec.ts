import { UsersController } from './users.controller';
import { IS_PUBLIC_KEY } from 'src/utils/decorators/public.decorator';

describe('UsersController — auth cookies (H-10)', () => {
  it.each(['login', 'refresh'])('%s está marcado como @Public', (handlerName) => {
    const isPublic = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      UsersController.prototype[handlerName],
    );
    expect(isPublic).toBe(true);
  });

  it('logout no está marcado como @Public', () => {
    const isPublic = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      UsersController.prototype.logout,
    );
    expect(isPublic).toBeUndefined();
  });
});
