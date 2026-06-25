import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum ConsentimientoMetodo {
  VERBAL = 'VERBAL',
  AUTOGRAFO = 'AUTOGRAFO',
}

export class CreateConsentimientoDto {
  @IsNotEmpty()
  @IsString()
  trabajadorId: string;

  @IsNotEmpty()
  @IsEnum(ConsentimientoMetodo)
  metodo: ConsentimientoMetodo;
}
