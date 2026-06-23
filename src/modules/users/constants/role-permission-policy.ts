import { ForbiddenException } from '@nestjs/common';

export const PERMISSION_KEYS = [
  'gestionarEmpresas',
  'gestionarCentrosTrabajo',
  'gestionarTrabajadores',
  'gestionarDocumentosDiagnostico',
  'gestionarDocumentosEvaluacion',
  'gestionarDocumentosExternos',
  'gestionarOtrosDocumentos',
  'accesoCompletoEmpresasCentros',
  'accesoDashboardSalud',
  'accesoRiesgosTrabajo',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type UserPermissions = Record<PermissionKey, boolean>;

export type DocumentPermissionCategory =
  | 'gestionarDocumentosDiagnostico'
  | 'gestionarDocumentosEvaluacion'
  | 'gestionarDocumentosExternos'
  | 'gestionarOtrosDocumentos';

const ALL_TRUE: UserPermissions = {
  gestionarEmpresas: true,
  gestionarCentrosTrabajo: true,
  gestionarTrabajadores: true,
  gestionarDocumentosDiagnostico: true,
  gestionarDocumentosEvaluacion: true,
  gestionarDocumentosExternos: true,
  gestionarOtrosDocumentos: true,
  accesoCompletoEmpresasCentros: true,
  accesoDashboardSalud: true,
  accesoRiesgosTrabajo: true,
};

export const ROLE_DEFAULT_PERMISSIONS: Record<string, UserPermissions> = {
  Principal: { ...ALL_TRUE },
  Administrador: { ...ALL_TRUE },
  Médico: {
    gestionarEmpresas: false,
    gestionarCentrosTrabajo: false,
    gestionarTrabajadores: true,
    gestionarDocumentosDiagnostico: true,
    gestionarDocumentosEvaluacion: true,
    gestionarDocumentosExternos: true,
    gestionarOtrosDocumentos: true,
    accesoCompletoEmpresasCentros: false,
    accesoDashboardSalud: true,
    accesoRiesgosTrabajo: true,
  },
  'Enfermero/a': {
    gestionarEmpresas: false,
    gestionarCentrosTrabajo: false,
    gestionarTrabajadores: true,
    gestionarDocumentosDiagnostico: false,
    gestionarDocumentosEvaluacion: true,
    gestionarDocumentosExternos: true,
    gestionarOtrosDocumentos: true,
    accesoCompletoEmpresasCentros: false,
    accesoDashboardSalud: true,
    accesoRiesgosTrabajo: true,
  },
  Administrativo: {
    gestionarEmpresas: true,
    gestionarCentrosTrabajo: true,
    gestionarTrabajadores: true,
    gestionarDocumentosDiagnostico: false,
    gestionarDocumentosEvaluacion: false,
    gestionarDocumentosExternos: true,
    gestionarOtrosDocumentos: false,
    accesoCompletoEmpresasCentros: true,
    accesoDashboardSalud: true,
    accesoRiesgosTrabajo: false,
  },
  'Técnico Evaluador': {
    gestionarEmpresas: false,
    gestionarCentrosTrabajo: false,
    gestionarTrabajadores: true,
    gestionarDocumentosDiagnostico: false,
    gestionarDocumentosEvaluacion: true,
    gestionarDocumentosExternos: true,
    gestionarOtrosDocumentos: true,
    accesoCompletoEmpresasCentros: false,
    accesoDashboardSalud: true,
    accesoRiesgosTrabajo: false,
  },
};

/** Permisos que nunca pueden ser true para un rol, sin excepción. */
export const ROLE_PERMISSION_CEILINGS: Partial<
  Record<string, readonly PermissionKey[]>
> = {
  Administrativo: [
    'gestionarDocumentosDiagnostico',
    'gestionarDocumentosEvaluacion',
    'gestionarOtrosDocumentos',
    'accesoRiesgosTrabajo',
  ],
  'Técnico Evaluador': [
    'gestionarDocumentosDiagnostico',
    'accesoRiesgosTrabajo',
  ],
};

export const DOCUMENT_TYPES_BY_PERMISSION: Record<
  DocumentPermissionCategory,
  readonly string[]
> = {
  gestionarDocumentosDiagnostico: [
    'aptitud',
    'constanciaAptitud',
    'certificado',
    'certificadoExpedito',
    'receta',
    'notaMedica',
  ],
  gestionarDocumentosEvaluacion: [
    'historiaClinica',
    'exploracionFisica',
    'examenVista',
    'audiometria',
    'antidoping',
    'deteccion',
  ],
  gestionarDocumentosExternos: ['documentoExterno'],
  gestionarOtrosDocumentos: [
    'controlPrenatal',
    'historiaOtologica',
    'previoEspirometria',
    'notaAclaratoria',
    'entrevistaPsicologica',
    'trastornosEstadoAnimo',
    'cuestionarioProdromalBreve',
    'trastornoLimitePersonalidad',
    'eventoSeguimientoCardiometabolico',
    'informeLongitudinalCardiometabolico',
    'seguimientoProgramadoCardiometabolico',
  ],
};

export const DOCUMENT_TYPE_TO_PERMISSION: Record<
  string,
  DocumentPermissionCategory
> = Object.fromEntries(
  Object.entries(DOCUMENT_TYPES_BY_PERMISSION).flatMap(
    ([permission, types]) =>
      types.map((type) => [type, permission as DocumentPermissionCategory]),
  ),
);

const BYPASS_ROLES = new Set(['Principal', 'Administrador']);

export function getDefaultPermissionsForRole(role: string): UserPermissions {
  return { ...(ROLE_DEFAULT_PERMISSIONS[role] ?? emptyPermissions()) };
}

function emptyPermissions(): UserPermissions {
  return PERMISSION_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: false }),
    {} as UserPermissions,
  );
}

export function normalizePermissionsInput(
  permisos: Partial<UserPermissions> & Record<string, boolean | undefined>,
): Partial<UserPermissions> {
  const normalized = { ...permisos };
  if (
    normalized.gestionarOtrosDocumentos === undefined &&
    permisos.gestionarCuestionariosAdicionales !== undefined
  ) {
    normalized.gestionarOtrosDocumentos =
      permisos.gestionarCuestionariosAdicionales;
  }
  return normalized;
}

export function isPermissionBlockedByRole(
  role: string,
  permissionKey: PermissionKey,
): boolean {
  const blocked = ROLE_PERMISSION_CEILINGS[role];
  return blocked?.includes(permissionKey) ?? false;
}

export function sanitizePermissionsForRole(
  role: string,
  permisos: Partial<UserPermissions> & Record<string, boolean | undefined>,
): UserPermissions {
  const normalized = normalizePermissionsInput(permisos);
  const defaults = getDefaultPermissionsForRole(role);
  const merged = { ...defaults, ...normalized } as UserPermissions;

  for (const key of PERMISSION_KEYS) {
    if (isPermissionBlockedByRole(role, key)) {
      merged[key] = false;
    }
  }

  return merged;
}

export function hasBypassRole(role: string | undefined | null): boolean {
  return !!role && BYPASS_ROLES.has(role);
}

export function hasPermission(
  user: { role: string; permisos?: Partial<UserPermissions> | null },
  permissionKey: PermissionKey,
): boolean {
  if (hasBypassRole(user.role)) {
    return true;
  }
  if (isPermissionBlockedByRole(user.role, permissionKey)) {
    return false;
  }
  return user.permisos?.[permissionKey] === true;
}

export function getPermissionForDocumentType(
  documentType: string,
): DocumentPermissionCategory | null {
  return DOCUMENT_TYPE_TO_PERMISSION[documentType] ?? null;
}

export function assertCanManageDocument(
  user: { role: string; permisos?: Partial<UserPermissions> | null } | null | undefined,
  documentType: string,
): void {
  if (!user) {
    throw new ForbiddenException('No autenticado');
  }

  const permissionKey = getPermissionForDocumentType(documentType);
  if (!permissionKey) {
    throw new ForbiddenException(
      `Tipo de documento ${documentType} no reconocido para control de permisos`,
    );
  }

  if (!hasPermission(user, permissionKey)) {
    throw new ForbiddenException(
      'No tiene permiso para gestionar este tipo de documento',
    );
  }
}

export function sanitizeUserPermissions<T extends { role: string; permisos?: Partial<UserPermissions> | null }>(
  user: T,
): T {
  if (!user?.permisos) {
    return user;
  }
  return {
    ...user,
    permisos: sanitizePermissionsForRole(user.role, user.permisos),
  };
}
