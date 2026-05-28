import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsEnum,
  IsMongoId,
  IsOptional,
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
  static firma: { data: string; contentType: string };
}
