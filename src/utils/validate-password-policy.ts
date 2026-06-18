import { BadRequestException } from '@nestjs/common';

export const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_POLICY_REGEX = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
export const PASSWORD_POLICY_MSG =
  'Mín. 8 dígitos, 1 mayúscula y 1 número.';

export function validatePasswordPolicy(password: string): void {
  if (!PASSWORD_POLICY_REGEX.test(password.trim())) {
    throw new BadRequestException({ msg: PASSWORD_POLICY_MSG });
  }
}
