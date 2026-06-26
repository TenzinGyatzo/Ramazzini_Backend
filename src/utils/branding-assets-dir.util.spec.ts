import * as path from 'path';
import {
  resolveProvidersLogosDir,
  resolveSignatoriesDir,
} from './branding-assets-dir.util';

describe('branding-assets-dir.util', () => {
  const originalSignatories = process.env.SIGNATORIES_UPLOADS_DIR;
  const originalProviders = process.env.PROVIDERS_UPLOADS_DIR;

  afterEach(() => {
    if (originalSignatories === undefined) {
      delete process.env.SIGNATORIES_UPLOADS_DIR;
    } else {
      process.env.SIGNATORIES_UPLOADS_DIR = originalSignatories;
    }

    if (originalProviders === undefined) {
      delete process.env.PROVIDERS_UPLOADS_DIR;
    } else {
      process.env.PROVIDERS_UPLOADS_DIR = originalProviders;
    }
  });

  it('corrige el prefijo erróneo /www/backend usado en producción', () => {
    process.env.SIGNATORIES_UPLOADS_DIR =
      '/www/backend/assets/signatories';
    process.env.PROVIDERS_UPLOADS_DIR =
      '/www/backend/assets/providers-logos';

    expect(resolveSignatoriesDir()).toBe('/var/www/backend/assets/signatories');
    expect(resolveProvidersLogosDir()).toBe(
      '/var/www/backend/assets/providers-logos',
    );
  });

  it('usa rutas relativas al proyecto cuando no hay variable de entorno', () => {
    delete process.env.SIGNATORIES_UPLOADS_DIR;
    delete process.env.PROVIDERS_UPLOADS_DIR;

    expect(resolveSignatoriesDir()).toContain(
      path.join('assets', 'signatories'),
    );
    expect(resolveProvidersLogosDir()).toContain(
      path.join('assets', 'providers-logos'),
    );
  });
});
