import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_SIGNATORIES_DIR = 'assets/signatories';
const DEFAULT_PROVIDERS_LOGOS_DIR = 'assets/providers-logos';

const ABSOLUTE_PREFIX_REWRITES: Array<{ from: string; to: string }> = [
  { from: '/www/backend', to: '/var/www/backend' },
  { from: '/backend', to: '' },
];

function resolveProjectRoot(): string {
  const candidates = [
    process.cwd(),
    path.resolve(__dirname, '..', '..'),
    path.resolve(__dirname, '..', '..', '..'),
  ];

  for (const root of candidates) {
    if (
      fs.existsSync(path.join(root, 'assets')) ||
      fs.existsSync(path.join(root, 'expedientes-medicos'))
    ) {
      return root;
    }
  }

  return process.cwd();
}

function normalizeConfiguredDir(
  envValue: string | undefined,
  defaultRelative: string,
): string {
  const projectRoot = resolveProjectRoot();
  let configured = (envValue || defaultRelative).trim();

  for (const { from, to } of ABSOLUTE_PREFIX_REWRITES) {
    if (configured.startsWith(from)) {
      configured = to
        ? `${to}${configured.slice(from.length)}`
        : path.join(projectRoot, configured.slice(from.length + 1));
      break;
    }
  }

  if (path.isAbsolute(configured)) {
    return configured;
  }

  return path.resolve(projectRoot, configured);
}

export function resolveSignatoriesDir(): string {
  return normalizeConfiguredDir(
    process.env.SIGNATORIES_UPLOADS_DIR,
    DEFAULT_SIGNATORIES_DIR,
  );
}

export function resolveProvidersLogosDir(): string {
  return normalizeConfiguredDir(
    process.env.PROVIDERS_UPLOADS_DIR,
    DEFAULT_PROVIDERS_LOGOS_DIR,
  );
}
