import { ForbiddenException } from '@nestjs/common';

const ALLOWED_ROLES = new Set(['Principal', 'Administrador']);

export function assertCatalogAdminRole(role: string | undefined): void {
  if (!role || !ALLOWED_ROLES.has(role)) {
    throw new ForbiddenException(
      'Solo usuarios Principal o Administrador pueden administrar catálogos',
    );
  }
}
