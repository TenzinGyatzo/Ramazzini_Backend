import { assertCanManageDocument } from '../../users/constants/role-permission-policy';
import { User } from '../../users/schemas/user.schema';

export function assertDocumentPermission(
  user: User | null | undefined,
  documentType: string,
): void {
  assertCanManageDocument(user, documentType);
}
