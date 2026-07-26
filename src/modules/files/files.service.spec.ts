import { FilesService } from './files.service';
import * as fs from 'fs/promises';

jest.mock('fs/promises', () => ({
  unlink: jest.fn(),
}));

describe('FilesService.deleteFile', () => {
  let service: FilesService;
  const unlink = fs.unlink as jest.MockedFunction<typeof fs.unlink>;

  beforeEach(() => {
    service = new FilesService();
    unlink.mockReset();
  });

  it('devuelve deleted cuando el unlink tiene éxito', async () => {
    unlink.mockResolvedValue(undefined);
    await expect(service.deleteFile('/tmp/a.pdf')).resolves.toBe('deleted');
  });

  it('trata ENOENT como missing (idempotente)', async () => {
    const err = Object.assign(new Error('not found'), { code: 'ENOENT' });
    unlink.mockRejectedValue(err);
    await expect(service.deleteFile('/tmp/gone.pdf')).resolves.toBe('missing');
  });

  it('propaga otros errores de FS', async () => {
    const err = Object.assign(new Error('denied'), { code: 'EACCES' });
    unlink.mockRejectedValue(err);
    await expect(service.deleteFile('/tmp/locked.pdf')).rejects.toThrow(
      'No se pudo eliminar el archivo: /tmp/locked.pdf',
    );
  });
});
