import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

class FirmaDto {
  @ApiProperty({ description: 'Nombre de archivo de la firma' })
  @IsString()
  data: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  contentType: string;
}

export class CreateTecnicoFirmanteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sexo?: string;

  @ApiProperty({
    required: false,
    description: 'Título profesional del técnico',
  })
  @IsOptional()
  @IsString()
  tituloProfesional?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  numeroCedulaProfesional?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombreCredencialAdicional?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  numeroCredencialAdicional?: string;

  @ApiProperty({ required: false, type: FirmaDto })
  @IsOptional()
  firma?: FirmaDto;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  idUser: string;

  // NOM-024: CURP for healthcare professionals
  // Required for MX providers, optional for non-MX (validation in service layer)
  @ApiProperty({
    required: false,
    description: 'CURP del técnico (requerido para proveedores MX)',
  })
  @IsOptional()
  @IsString({ message: 'El CURP debe ser un string' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  @Matches(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/, {
    message:
      'CURP debe tener exactamente 18 caracteres con el formato: 4 letras, 6 dígitos, H/M, 5 letras, 1 alfanumérico, 1 dígito',
  })
  curp?: string;

  @ApiProperty({
    required: false,
    description: 'País de nacimiento (CATALOG_KEY de cat_pais)',
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) =>
    value === '' || value == null ? undefined : Number(value),
  )
  paisNacimiento?: number;
}
