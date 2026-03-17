import { Type, Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsNumber,
  Matches,
} from 'class-validator';

const titulos = ['Dr.', 'Dra.'];
const siONo = ['Si', 'No'];

class LogotipoDto {
  @IsString({ message: 'El "data" del logotipo debe ser un string' })
  data: string;

  @IsString({ message: 'El "contentType" del logotipo debe ser un string' })
  contentType: string;
}

export class CreateMedicoFirmanteDto {
  @IsString({ message: 'El nombre debe ser un string' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  nombre: string;

  @IsOptional()
  @IsString({ message: 'El título profesional debe ser un string' })
  // @IsEnum(titulos, { message: 'El título profesional debe ser Dr. o Dra.' })
  tituloProfesional?: string;

  @IsOptional()
  @IsString({ message: 'La universidad debe ser un string' })
  universidad?: string;

  @IsOptional()
  @IsString({ message: 'El numero de cédula profesional debe ser un string' })
  numeroCedulaProfesional?: string;

  @IsOptional()
  // @IsEnum(siONo, { message: 'especialistaSaludTrabajo debe ser Si o No' })
  especialistaSaludTrabajo?: string;

  @IsOptional()
  @IsString({
    message: 'El numero de cédula de especialista debe ser un string',
  })
  numeroCedulaEspecialista?: string;

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

  @IsOptional()
  // @ValidateNested()
  @Type(() => LogotipoDto)
  firmaConAntefirma?: LogotipoDto;

  @IsMongoId({ message: 'El ID de "idUser" no es válido' })
  @IsNotEmpty({ message: 'El ID del usuario no puede estar vacío' })
  idUser: string;

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

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) =>
    value === '' || value == null ? undefined : Number(value),
  )
  paisNacimiento?: number;

  static firma: { data: string; contentType: string };
}
