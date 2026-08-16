export const PERSON_NAME_MIN_LENGTH = 2;
export const PERSON_NAME_MAX_LENGTH = 50;

export function personNameLengthMessage(fieldLabel: string): string {
  return `${fieldLabel} debe tener entre ${PERSON_NAME_MIN_LENGTH} y ${PERSON_NAME_MAX_LENGTH} caracteres`;
}
