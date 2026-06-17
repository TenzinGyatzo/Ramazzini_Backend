import { TrabajadoresController } from './trabajadores.controller';
import { IS_PUBLIC_KEY } from 'src/utils/decorators/public.decorator';

describe('TrabajadoresController — exportar (H-04)', () => {
  it('exportar-trabajadores no está marcado como @Public', () => {
    const isPublic = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      TrabajadoresController.prototype.exportarTrabajadores,
    );
    expect(isPublic).toBeUndefined();
  });
});
