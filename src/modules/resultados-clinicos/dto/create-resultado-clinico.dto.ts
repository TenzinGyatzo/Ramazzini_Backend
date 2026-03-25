import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import {
  TipoEstudio,
  ResultadoGlobal,
  RelevanciaClinica,
  TipoAlteracionEspirometria,
  TipoAlteracionEKG,
  TipoSangre,
} from '../schemas/resultado-clinico.schema';

export class CreateResultadoClinicoDto {
  @ApiProperty({
    description: 'ID del trabajador',
    example: '671fe9cc00fcb5611b10686e',
  })
  @IsMongoId({ message: 'El ID del trabajador debe ser un ObjectId válido' })
  @IsNotEmpty({ message: 'El ID del trabajador es requerido' })
  idTrabajador: string;

  @ApiProperty({
    description: 'Tipo de estudio clínico',
    enum: TipoEstudio,
    example: TipoEstudio.ESPIROMETRIA,
  })
  @IsEnum(TipoEstudio, { message: 'El tipo de estudio debe ser válido' })
  @IsNotEmpty({ message: 'El tipo de estudio es requerido' })
  tipoEstudio: TipoEstudio;

  @ApiProperty({
    description: 'Fecha del estudio',
    example: '2024-01-15T10:00:00.000Z',
  })
  @IsDate({ message: 'La fecha del estudio debe ser una fecha válida' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha del estudio es requerida' })
  fechaEstudio: Date;

  @ApiProperty({
    description: 'Resultado global del estudio (no aplica para Tipo de Sangre)',
    enum: ResultadoGlobal,
    example: ResultadoGlobal.NORMAL,
    required: false,
  })
  @ValidateIf((o) => o.tipoEstudio !== TipoEstudio.TIPO_SANGRE)
  @IsEnum(ResultadoGlobal, { message: 'El resultado global debe ser válido' })
  @IsNotEmpty({ message: 'El resultado global es requerido para estudios distintos a Tipo de Sangre' })
  resultadoGlobal?: ResultadoGlobal;

  @ApiProperty({
    description: 'Hallazgo específico del estudio',
    required: false,
    example: 'Hallazgo significativo observado',
  })
  @ValidateIf((o) => o.hallazgoEspecifico !== undefined)
  @IsString({ message: 'El hallazgo específico debe ser un string' })
  hallazgoEspecifico?: string;

  @ApiProperty({
    description: 'Relevancia clínica del hallazgo',
    enum: RelevanciaClinica,
    required: false,
    example: RelevanciaClinica.MODERADA,
  })
  @ValidateIf((o) => o.resultadoGlobal === ResultadoGlobal.ANORMAL && o.relevanciaClinica !== undefined)
  @IsEnum(RelevanciaClinica, { message: 'La relevancia clínica debe ser válida' })
  relevanciaClinica?: RelevanciaClinica;

  @ApiProperty({
    description: 'Recomendación basada en el resultado',
    required: false,
    example: 'Seguimiento recomendado',
  })
  @ValidateIf((o) => o.recomendacion !== undefined)
  @IsString({ message: 'La recomendación debe ser un string' })
  recomendacion?: string;

  // Campos específicos para Espirometría
  @ApiProperty({
    description: 'Tipo de alteración espirométrica (solo si resultadoGlobal = ANORMAL y tipoEstudio = ESPIROMETRIA)',
    enum: TipoAlteracionEspirometria,
    required: false,
  })
  @ValidateIf((o) => o.tipoEstudio === TipoEstudio.ESPIROMETRIA && o.resultadoGlobal === ResultadoGlobal.ANORMAL)
  @IsEnum(TipoAlteracionEspirometria, { message: 'El tipo de alteración debe ser válido' })
  @IsNotEmpty({ message: 'El tipo de alteración es obligatorio para espirometría con resultado anormal' })
  tipoAlteracion?: TipoAlteracionEspirometria;

  // Campos específicos para EKG
  @ApiProperty({
    description: 'Tipo de alteración principal del EKG (solo si resultadoGlobal = ANORMAL y tipoEstudio = EKG)',
    enum: TipoAlteracionEKG,
    required: false,
  })
  @ValidateIf((o) => o.tipoEstudio === TipoEstudio.EKG && o.resultadoGlobal === ResultadoGlobal.ANORMAL)
  @IsEnum(TipoAlteracionEKG, { message: 'El tipo de alteración principal debe ser válido' })
  @IsNotEmpty({ message: 'El tipo de alteración principal es obligatorio para EKG con resultado anormal' })
  tipoAlteracionPrincipal?: TipoAlteracionEKG;

  // Campos específicos para Tipo de Sangre
  @ApiProperty({
    description: 'Tipo de sangre (obligatorio si tipoEstudio = TIPO_SANGRE)',
    enum: TipoSangre,
    required: false,
    example: TipoSangre.O_POS,
  })
  @ValidateIf((o) => o.tipoEstudio === TipoEstudio.TIPO_SANGRE)
  @IsEnum(TipoSangre, { message: 'El tipo de sangre debe ser válido' })
  @IsNotEmpty({ message: 'El tipo de sangre es obligatorio para estudios de tipo de sangre' })
  tipoSangre?: TipoSangre;

  @ApiProperty({
    description: 'ID del usuario que crea el registro',
    example: '60d9f70fc39b3c1b8f0d6c0b',
    required: false,
  })
  @IsOptional()
  @IsMongoId({ message: 'El ID de "createdBy" debe ser un ObjectId válido' })
  createdBy?: string;

  @ApiProperty({
    description: 'ID del usuario que actualiza el registro',
    example: '60d9f70fc39b3c1b8f0d6c0c',
    required: false,
  })
  @IsOptional()
  @IsMongoId({ message: 'El ID de "updatedBy" debe ser un ObjectId válido' })
  updatedBy?: string;

  @ApiProperty({
    description: 'ID del documento externo vinculado',
    example: '60d9f70fc39b3c1b8f0d6c0d',
    required: false,
  })
  @IsOptional()
  @IsMongoId({ message: 'El ID del documento externo debe ser válido' })
  idDocumentoExterno?: string;
}
