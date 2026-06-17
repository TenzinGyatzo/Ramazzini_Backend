export const INVITABLE_ROLES = [
  'Médico',
  'Enfermero/a',
  'Administrativo',
  'Técnico Evaluador',
] as const;

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export function isInvitableRole(role: string): role is InvitableRole {
  return (INVITABLE_ROLES as readonly string[]).includes(role);
}
