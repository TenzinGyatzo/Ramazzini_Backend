import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class VerifyPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  password: string;
}
