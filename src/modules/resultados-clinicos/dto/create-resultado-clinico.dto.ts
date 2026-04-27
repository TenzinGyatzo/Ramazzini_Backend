import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
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
  TipoAlteracionRayosX,
  TipoAlteracionAnalisisLaboratorio,
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
  tipoAlteracionEspirometria?: TipoAlteracionEspirometria;

  // Campos específicos para EKG
  @ApiProperty({
    description: 'Tipo de alteración del EKG (solo si resultadoGlobal = ANORMAL y tipoEstudio = EKG)',
    enum: TipoAlteracionEKG,
    required: false,
  })
  @ValidateIf((o) => o.tipoEstudio === TipoEstudio.EKG && o.resultadoGlobal === ResultadoGlobal.ANORMAL)
  @IsEnum(TipoAlteracionEKG, { message: 'El tipo de alteración del EKG debe ser válido' })
  @IsNotEmpty({ message: 'El tipo de alteración es obligatorio para EKG con resultado anormal' })
  tipoAlteracionEKG?: TipoAlteracionEKG;

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
    description:
      'Categorías de alteración en Rayos X (obligatorio si tipoEstudio = RAYOS_X y resultadoGlobal = ANORMAL)',
    enum: TipoAlteracionRayosX,
    isArray: true,
    required: false,
  })
  @ValidateIf(
    (o) =>
      o.tipoEstudio === TipoEstudio.RAYOS_X && o.resultadoGlobal === ResultadoGlobal.ANORMAL,
  )
  @IsArray({ message: 'Las categorías de Rayos X deben ser un arreglo' })
  @ArrayNotEmpty({ message: 'Debe indicar al menos una categoría para Rayos X con resultado anormal' })
  @IsEnum(TipoAlteracionRayosX, {
    each: true,
    message: 'Cada categoría de Rayos X debe ser válida',
  })
  tipoAlteracionRayosX?: TipoAlteracionRayosX[];

  @ApiProperty({
    description:
      'Categorías de alteración en análisis de laboratorio (obligatorio si tipoEstudio = ANALISIS_LABORATORIO y resultadoGlobal = ANORMAL)',
    enum: TipoAlteracionAnalisisLaboratorio,
    isArray: true,
    required: false,
  })
  @ValidateIf(
    (o) =>
      o.tipoEstudio === TipoEstudio.ANALISIS_LABORATORIO &&
      o.resultadoGlobal === ResultadoGlobal.ANORMAL,
  )
  @IsArray({ message: 'Las categorías de laboratorio deben ser un arreglo' })
  @ArrayNotEmpty({
    message: 'Debe indicar al menos una categoría para análisis de laboratorio con resultado anormal',
  })
  @IsEnum(TipoAlteracionAnalisisLaboratorio, {
    each: true,
    message: 'Cada categoría de laboratorio debe ser válida',
  })
  tipoAlteracionAnalisisLaboratorio?: TipoAlteracionAnalisisLaboratorio[];

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
