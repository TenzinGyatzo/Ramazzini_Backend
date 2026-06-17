import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { INVITABLE_ROLES } from '../constants/invitable-roles';

export class InviteUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(INVITABLE_ROLES)
  role: string;
}
