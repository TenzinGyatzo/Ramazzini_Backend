/**
 * Resuelve el userId del prestador CEX (B015 ids 2–7).
 * Prioridad: createdBy (quien otorgó la atención) → updatedBy → finalizadoPor.
 */

type UserRef =
  | string
  | { toString(): string; _id?: string | { toString(): string } }
  | null
  | undefined;

export interface CexPrestadorUserSource {
  createdBy?: UserRef;
  updatedBy?: UserRef;
  finalizadoPor?: UserRef;
}

function toUserId(ref: UserRef): string {
  if (ref == null) return '';
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'object' && '_id' in ref && ref._id != null) {
    return typeof ref._id === 'string' ? ref._id : ref._id.toString();
  }
  if (typeof ref === 'object' && typeof ref.toString === 'function') {
    const s = ref.toString();
    return s === '[object Object]' ? '' : s;
  }
  return '';
}

/** userId del prestador para CEX: createdBy → updatedBy → finalizadoPor. */
export function resolveCexPrestadorUserId(
  nota: CexPrestadorUserSource,
): string {
  return (
    toUserId(nota.createdBy) ||
    toUserId(nota.updatedBy) ||
    toUserId(nota.finalizadoPor) ||
    ''
  );
}
