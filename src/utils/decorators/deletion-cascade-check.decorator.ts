import { SetMetadata } from '@nestjs/common';

export const DELETION_CASCADE_CHECK_KEY = 'deletion_cascade_check';

export type DeletionCascadeCheckType = 'empresa' | 'centro';

export const DeletionCascadeCheck = (type: DeletionCascadeCheckType) =>
  SetMetadata(DELETION_CASCADE_CHECK_KEY, type);
