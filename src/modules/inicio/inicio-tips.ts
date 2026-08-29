import type { InicioRegimen } from './inicio-document-types';
import type { InicioActivityScope } from './interfaces/inicio-resumen.interface';

export interface InicioTipEnlace {
  name: string;
  params?: Record<string, string>;
}

export interface InicioTip {
  id: string;
  texto: string;
  regimens: readonly InicioRegimen[];
  roles?: readonly string[];
  preferRecentTypes?: readonly string[];
  excludeIfNmStale?: boolean;
  enlace?: InicioTipEnlace;
}

export const INICIO_TIPS: readonly InicioTip[] = [
  {
    id: 'sires-nota-aclaratoria',
    texto:
      'Un documento finalizado no se puede editar. Use una nota aclaratoria para complementar sin alterarlo.',
    regimens: ['SIRES_NOM024'],
  },
  /* {
    id: 'nota-medica-seguimiento',
    texto:
      'La nota médica sirve para documentar un seguimiento sin reabrir evaluaciones ya finalizadas.',
    regimens: ['SIRES_NOM024', 'SIN_REGIMEN'],
  }, */
  {
    id: 'anular-trazabilidad',
    texto:
      'Si un documento finalizado quedó mal, anúlelo: conserva trazabilidad en lugar de borrarlo.',
    regimens: ['SIRES_NOM024'],
  },
  {
    id: 'pdf-regenerar',
    texto:
      'Si falta el PDF de un informe de Ramazzini, puede volver a generarlo. No lo suba como documento externo.',
    regimens: ['SIRES_NOM024', 'SIN_REGIMEN'],
  },
  {
    id: 'documento-externo-reservado',
    texto:
      'Reserve Documento externo para estudios o archivos que Ramazzini no genera.',
    regimens: ['SIRES_NOM024', 'SIN_REGIMEN'],
  },
  {
    id: 'audiometria-ama-lft',
    texto:
      'En audiometría elija la metodología AMA o LFT según el criterio que aplique al caso.',
    regimens: ['SIRES_NOM024', 'SIN_REGIMEN'],
    preferRecentTypes: ['audiometria'],
  },
  {
    id: 'fusion-duplicados',
    texto:
      'Si hay expedientes duplicados, puede fusionarlos y conservar el historial clínico.',
    regimens: ['SIRES_NOM024', 'SIN_REGIMEN'],
  },
  {
    id: 'asignar-centros',
    texto:
      'Puede asignar acceso por centro de trabajo sin conceder toda la empresa.',
    regimens: ['SIRES_NOM024', 'SIN_REGIMEN'],
    roles: ['Principal'],
    enlace: { name: 'manage-permissions' },
  },
];

function hashToIndex(seed: string, modulo: number): number {
  if (modulo <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % modulo;
}

export function selectInicioTip(options: {
  userId: string;
  dateKey: string;
  regimen: InicioRegimen;
  role?: string;
  activityScope?: InicioActivityScope;
  recentDocumentTypes?: string[];
  hasNmStaleAtencion?: boolean;
}): InicioTip | null {
  const recent = new Set(options.recentDocumentTypes ?? []);
  const filtered = INICIO_TIPS.filter((tip) => {
    if (!tip.regimens.includes(options.regimen)) {
      return false;
    }
    if (
      tip.roles?.length &&
      (!options.role || !tip.roles.includes(options.role))
    ) {
      return false;
    }
    if (tip.excludeIfNmStale && options.hasNmStaleAtencion) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return null;
  }

  const preferred = filtered.filter((tip) =>
    tip.preferRecentTypes?.some((type) => recent.has(type)),
  );
  const pool = preferred.length > 0 ? preferred : filtered;

  const index = hashToIndex(
    `${options.userId}|${options.dateKey}|${pool.length}`,
    pool.length,
  );
  return pool[index];
}
