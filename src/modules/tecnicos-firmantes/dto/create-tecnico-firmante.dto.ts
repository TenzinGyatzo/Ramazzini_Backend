import { Type, Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsNumber,
  IsInt,
  IsDateString,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  TRABAJADOR_SEXO_CURP_VALUES,
} from 'src/modules/trabajadores/constants/trabajador-sexo-curp.constants';
import {
  IsOptionalPersonNameField,
  IsRequiredPersonNameField,
} from 'src/utils/decorators/person-name.decorators';
import { normalizeSexoCurpInput } from 'src/utils/sexo-curp.util';

const sexos = ['Masculino', 'Femenino'];

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
  @IsRequiredPersonNameField('El nombre')
  nombre: string;

  @ApiProperty()
  @IsRequiredPersonNameField('El primer apellido')
  primerApellido: string;

  @ApiProperty({ required: false })
  @IsOptionalPersonNameField('El segundo apellido')
  segundoApellido?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(sexos, { message: 'El sexo debe ser Masculino o Femenino' })
  sexo?: string;

  @ApiProperty({ required: false, enum: TRABAJADOR_SEXO_CURP_VALUES })
  @IsOptional()
  @Transform(({ value }) => normalizeSexoCurpInput(value) ?? undefined)
  @IsInt({ message: 'sexoCURP debe ser un número entero' })
  @IsEnum(TRABAJADOR_SEXO_CURP_VALUES, {
    message: 'sexoCURP debe ser 1 (Hombre), 2 (Mujer) o 3 (No binario)',
  })
  sexoCURP?: number;

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
  @Type(() => FirmaDto)
  firma?: FirmaDto;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  idUser: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  entidadNacimiento?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^$|^(0[1-9]|[12][0-9]|3[0-2]|NE|00|88|99)$/, {
    message:
      'Entidad de residencia debe ser código INEGI/GIIS válido (01-32, NE, 00, 88 o 99)',
  })
  entidadResidencia?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^$|^[0-9]{3}$/, {
    message:
      'Municipio de residencia debe ser código INEGI válido (3 dígitos, ej: 001)',
  })
  municipioResidencia?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^$|^[0-9]{4}$/, {
    message:
      'Localidad de residencia debe ser código INEGI válido (4 dígitos, ej: 0001)',
  })
  localidadResidencia?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) =>
    value === '' || value == null ? undefined : Number(value),
  )
  paisResidencia?: number;

  @ApiProperty({
    required: false,
    description: 'CURP del técnico (requerido para proveedores MX)',
  })
  @IsOptional()
  @IsString({ message: 'El CURP debe ser un string' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  @Matches(/^[A-Z]{4}\d{6}[HMX][A-Z]{5}[0-9A-Z]\d$/, {
    message:
      'CURP debe tener exactamente 18 caracteres con el formato: 4 letras, 6 dígitos, H/M/X, 5 letras, 1 alfanumérico, 1 dígito',
  })
  curp?: string;

  @ApiProperty({
    required: false,
    description: 'País de nacimiento (CATALOG_KEY de cat_pais)',
  })
  @IsNotEmpty({ message: 'El país de nacimiento no puede estar vacío' })
  @IsNumber()
  @Transform(({ value }) =>
    value === '' || value == null ? undefined : Number(value),
  )
  paisNacimiento: number;

  @ApiProperty({ required: false })
  @IsNotEmpty({ message: 'La fecha de nacimiento no puede estar vacía' })
  @IsDateString(
    {},
    { message: 'La fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD)' },
  )
  fechaNacimiento: string;

  // NOM-024: Folio alfanumérico 18 caracteres. Generado por backend, no enviado por cliente
  @ApiProperty({ description: 'Folio (generado por backend)', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{18}$/, {
    message: 'El folio debe tener exactamente 18 caracteres alfanuméricos',
  })
  folio?: string;
}
