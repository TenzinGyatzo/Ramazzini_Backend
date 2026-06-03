import { ForbiddenException } from '@nestjs/common';
import { catalogAdminConfig } from '../config/catalog-admin.config';

export function assertCatalogAdminFeature(): void {
  if (!catalogAdminConfig.enabled) {
    throw new ForbiddenException(
      'La administración de catálogos no está habilitada en este entorno',
    );
  }
}
