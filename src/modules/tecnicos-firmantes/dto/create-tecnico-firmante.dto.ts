import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  primerApellido: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  segundoApellido?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sexo?: string;

  @ApiProperty({ required: false, description: 'Título profesional del técnico' })
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
}


