export const ACCOUNT_INACTIVE_ERROR_CODE = 'ACCOUNT_INACTIVE';

export const ACCOUNT_INACTIVE_MESSAGE =
  'Tu cuenta ha sido suspendida. Contacta al administrador.';

/** Única ruta exceptuada del predicado de cuenta: POST /auth/users/logout */
export const ACCOUNT_STATUS_LOGOUT_PATH = '/auth/users/logout';

export function isAccountStatusLogoutRequest(request: {
  method?: string;
  path?: string;
  url?: string;
}): boolean {
  const method = (request.method ?? '').toUpperCase();
  if (method !== 'POST') {
    return false;
  }
  const raw = request.path || request.url || '';
  const pathname = raw.split('?')[0];
  return pathname === ACCOUNT_STATUS_LOGOUT_PATH;
}

/**
 * true = el instante de emisión es anterior al watermark (o no se puede probar lo contrario).
 * tokensInvalidBefore ausente/null: no aplica (usuarios nunca suspendidos).
 */
export function isIssuedBeforeWatermark(
  issuedAtMs: number | null | undefined,
  tokensInvalidBefore: Date | null | undefined,
): boolean {
  if (!tokensInvalidBefore) {
    return false;
  }
  if (issuedAtMs == null || Number.isNaN(issuedAtMs)) {
    return true;
  }
  return issuedAtMs < tokensInvalidBefore.getTime();
}
