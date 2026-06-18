import { BadRequestException } from '@nestjs/common';
import {
  PASSWORD_POLICY_MSG,
  validatePasswordPolicy,
} from './validate-password-policy';

describe('validatePasswordPolicy (H-34)', () => {
  it('rechaza contraseñas débiles', () => {
    expect(() => validatePasswordPolicy('a')).toThrow(BadRequestException);
    expect(() => validatePasswordPolicy('abcdefgh')).toThrow(
      BadRequestException,
    );
    expect(() => validatePasswordPolicy('abcdefg1')).toThrow(
      BadRequestException,
    );

    try {
      validatePasswordPolicy('x');
    } catch (error) {
      expect(error.getResponse()).toEqual({ msg: PASSWORD_POLICY_MSG });
    }
  });

  it('acepta contraseña que cumple la política', () => {
    expect(() => validatePasswordPolicy('Secret123')).not.toThrow();
  });
});
