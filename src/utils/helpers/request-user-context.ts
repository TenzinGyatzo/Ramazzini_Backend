import { Request } from 'express';

/**
 * Clave en el request HTTP para compartir idProveedorSalud entre APP_GUARDs
 * (p. ej. SessionInactivity → ConfidentialityAgreement) sin repetir findById.
 * `null` = ya se resolvió y el usuario no tiene proveedor; `undefined` = aún no resuelto.
 */
export const REQUEST_PROVEEDOR_SALUD_ID_KEY = 'idProveedorSalud' as const;

export type RequestWithUserContext = Request & {
  userId?: string;
  [REQUEST_PROVEEDOR_SALUD_ID_KEY]?: string | null;
};
