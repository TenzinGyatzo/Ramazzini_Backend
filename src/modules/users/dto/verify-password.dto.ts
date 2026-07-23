import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class VerifyPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  password: string;

  /** Cuando es 'deletion', un fallo se audita como DELETION_AUTH_FAIL. */
  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  resourceType?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;
}
