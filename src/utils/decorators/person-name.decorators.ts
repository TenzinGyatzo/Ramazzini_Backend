import { applyDecorators } from '@nestjs/common';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  PERSON_NAME_MAX_LENGTH,
  PERSON_NAME_MIN_LENGTH,
  personNameLengthMessage,
} from '../constants/person-name.constants';

export function IsRequiredPersonNameField(fieldLabel: string) {
  return applyDecorators(
    IsString({ message: `${fieldLabel} debe ser un string` }),
    IsNotEmpty({ message: `${fieldLabel} no puede estar vacío` }),
    MinLength(PERSON_NAME_MIN_LENGTH, {
      message: personNameLengthMessage(fieldLabel),
    }),
    MaxLength(PERSON_NAME_MAX_LENGTH, {
      message: personNameLengthMessage(fieldLabel),
    }),
  );
}

export function IsOptionalPersonNameField(fieldLabel: string) {
  return applyDecorators(
    IsOptional(),
    IsString({ message: `${fieldLabel} debe ser un string` }),
    ValidateIf((_, value) => value != null && String(value).trim() !== ''),
    MinLength(PERSON_NAME_MIN_LENGTH, {
      message: personNameLengthMessage(fieldLabel),
    }),
    MaxLength(PERSON_NAME_MAX_LENGTH, {
      message: personNameLengthMessage(fieldLabel),
    }),
  );
}
