import { ForbiddenException } from '@nestjs/common';
import { canAccessAuditTrail } from '../../../utils/user-role-helpers';

export function assertAuditAccessRole(role: string | undefined): void {
  if (!canAccessAuditTrail(role ?? '')) {
    throw new ForbiddenException(
      'Solo el usuario Principal puede consultar o exportar el trail de auditoría',
    );
  }
}
