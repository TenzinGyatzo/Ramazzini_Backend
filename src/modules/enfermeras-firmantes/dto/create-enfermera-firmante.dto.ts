import { Type, Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsNumber,
  IsDateString,
  Matches,
} from 'class-validator';

const sexos = ['Masculino', 'Femenino'];

class LogotipoDto {
  @IsString({ message: 'El "data" del logotipo debe ser un string' })
  data: string;

  @IsString({ message: 'El "contentType" del logotipo debe ser un string' })
  contentType: string;
}

export class CreateEnfermeraFirmanteDto {
  @IsString({ message: 'El nombre debe ser un string' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  nombre: string;

  @IsString({ message: 'El primer apellido debe ser un string' })
  @IsNotEmpty({ message: 'El primer apellido no puede estar vacío' })
  primerApellido: string;

  @IsOptional()
  @IsString({ message: 'El segundo apellido debe ser un string' })
  segundoApellido?: string;

  @IsOptional()
  @IsEnum(sexos, { message: 'El sexo debe ser Masculino o Femenino' })
  sexo?: string;

  @IsOptional()
  @IsString({ message: 'El título profesional debe ser un string' })
  tituloProfesional?: string;

  @IsOptional()
  @IsString({ message: 'El numero de cédula profesional debe ser un string' })
  numeroCedulaProfesional?: string;

  @IsOptional()
  @IsString({
    message: 'El nombre de la cédencial adicional debe ser un string',
  })
  nombreCredencialAdicional?: string;

  @IsOptional()
  @IsString({ message: 'El numero de cédula adicional debe ser un string' })
  numeroCredencialAdicional?: string;

  @IsOptional()
  // @ValidateNested()
  @Type(() => LogotipoDto)
  firma?: LogotipoDto;

  @IsMongoId({ message: 'El ID de "idUser" no es válido' })
  @IsNotEmpty({ message: 'El ID del usuario no puede estar vacío' })
  idUser: string;

  @IsOptional()
  @IsString({ message: 'La entidad de nacimiento debe ser un string' })
  entidadNacimiento?: string;

  @IsOptional()
  @IsString({ message: 'La entidad de residencia debe ser un string' })
  @Matches(/^$|^(0[1-9]|[12][0-9]|3[0-2]|NE|00)$/, {
    message:
      'Entidad de residencia debe ser código INEGI válido (01-32, NE, o 00)',
  })
  entidadResidencia?: string;

  @IsOptional()
  @IsString({ message: 'El municipio de residencia debe ser un string' })
  @Matches(/^$|^[0-9]{3}$/, {
    message:
      'Municipio de residencia debe ser código INEGI válido (3 dígitos, ej: 001)',
  })
  municipioResidencia?: string;

  @IsOptional()
  @IsString({ message: 'La localidad de residencia debe ser un string' })
  @Matches(/^$|^[0-9]{4}$/, {
    message:
      'Localidad de residencia debe ser código INEGI válido (4 dígitos, ej: 0001)',
  })
  localidadResidencia?: string;

  // NOM-024: CURP for healthcare professionals
  // Required for MX providers, optional for non-MX (validation in service layer)
  @IsOptional()
  @IsString({ message: 'El CURP debe ser un string' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  @Matches(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/, {
    message:
      'CURP debe tener exactamente 18 caracteres con el formato: 4 letras, 6 dígitos, H/M, 5 letras, 1 alfanumérico, 1 dígito',
  })
  curp?: string;

  @IsNotEmpty({ message: 'El país de nacimiento no puede estar vacío' })
  @IsNumber()
  @Transform(({ value }) =>
    value === '' || value == null ? undefined : Number(value),
  )
  paisNacimiento: number;

  @IsNotEmpty({ message: 'La fecha de nacimiento no puede estar vacía' })
  @IsDateString(
    {},
    { message: 'La fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD)' },
  )
  fechaNacimiento: string;

  static firma: { data: string; contentType: string };
}
