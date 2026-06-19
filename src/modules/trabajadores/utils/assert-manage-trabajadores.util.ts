import { ForbiddenException } from '@nestjs/common';
import { User } from '../../users/schemas/user.schema';

/**
 * NOM-024 / DGIS: manual worker fusion and worker mutations require gestionarTrabajadores.
 */
export function assertManageTrabajadores(user: User | null | undefined): void {
  if (!user) {
    throw new ForbiddenException('No autenticado');
  }

  if (user.role === 'Principal' || user.role === 'Administrador') {
    return;
  }

  if (user.permisos?.gestionarTrabajadores === true) {
    return;
  }

  throw new ForbiddenException(
    'No tiene permiso para gestionar trabajadores',
  );
}
