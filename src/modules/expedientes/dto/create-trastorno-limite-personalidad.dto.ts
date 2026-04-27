import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

const siNoOpciones = ['No', 'Sí'] as const;

export class CreateTrastornoLimitePersonalidadDto {
  @ApiProperty({
    description: 'Fecha del trastorno límite de personalidad',
    example: '2026-03-28T07:00:00.000Z',
  })
  @IsDate({ message: 'La fecha del trastorno límite de personalidad debe ser una fecha' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha del trastorno límite de personalidad no puede estar vacía' })
  fechaTrastornoLimitePersonalidad: Date;

  @ApiPropertyOptional({
    description: 'Relaciones cercanas con discusiones o rupturas repetidas',
    enum: siNoOpciones,
  })
  @IsOptional()
  @IsEnum(siNoOpciones)
  relacionesCercanasDiscusionesRupturas?: string;

  @ApiPropertyOptional({
    description: 'Autolesión deliberada o intento de suicidio',
    enum: siNoOpciones,
  })
  @IsOptional()
  @IsEnum(siNoOpciones)
  autolesionIntentoSuicidio?: string;

  @ApiPropertyOptional({
    description: 'Al menos otros dos problemas de impulsividad',
    enum: siNoOpciones,
  })
  @IsOptional()
  @IsEnum(siNoOpciones)
  impulsividadOtrosDosProblemas?: string;

  @ApiPropertyOptional({ description: 'Extremadamente de mal humor', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  extremadamenteMalHumor?: string;

  @ApiPropertyOptional({
    description: 'Muy enojado la mayor parte del tiempo; actúa enojado o sarcástico con frecuencia',
    enum: siNoOpciones,
  })
  @IsOptional()
  @IsEnum(siNoOpciones)
  enojadoFrecuenteActuaEnojadoSarcastico?: string;

  @ApiPropertyOptional({ description: 'Desconfianza frecuente de otras personas', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  desconfianzaOtrasPersonas?: string;

  @ApiPropertyOptional({ description: 'Sensación de irrealidad o entorno irreal', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  sensacionIrrealidadEntornoIrreal?: string;

  @ApiPropertyOptional({ description: 'Vacío crónico', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  vacioCronico?: string;

  @ApiPropertyOptional({
    description: 'No sabe quién es o carece de identidad',
    enum: siNoOpciones,
  })
  @IsOptional()
  @IsEnum(siNoOpciones)
  faltaIdentidadQuienEs?: string;

  @ApiPropertyOptional({
    description: 'Esfuerzos desesperados por evitar abandono',
    enum: siNoOpciones,
  })
  @IsOptional()
  @IsEnum(siNoOpciones)
  esfuerzosEvitarAbandono?: string;

  @ApiProperty({
    description: 'ID del trabajador',
    example: '671fe9cc00fcb5611b10686e',
  })
  @IsMongoId({ message: 'El id del trabajador debe ser un ObjectId' })
  @IsNotEmpty({ message: 'El id del trabajador no puede estar vacío' })
  idTrabajador: string;

  @ApiProperty({
    description: 'Ruta del PDF del trastorno límite de personalidad',
    example:
      'expedientes-medicos/Expedientes Medicos/EMPRESA/Centro/Juan Pérez López/trastorno-limite-personalidad.pdf',
  })
  @IsString({ message: 'La ruta del PDF debe ser un string' })
  @IsNotEmpty({ message: 'La ruta del PDF no puede estar vacía' })
  rutaPDF: string;

  @ApiProperty({
    description: 'ID del usuario que creó el registro',
    example: '60d9f70fc39b3c1b8f0d6c0b',
  })
  @IsMongoId({ message: 'El ID de createdBy no es válido' })
  @IsNotEmpty({ message: 'El ID de createdBy no puede estar vacío' })
  createdBy: string;

  @ApiProperty({
    description: 'ID del usuario que actualizó el registro',
    example: '60d9f70fc39b3c1b8f0d6c0c',
  })
  @IsMongoId({ message: 'El ID de updatedBy no es válido' })
  @IsNotEmpty({ message: 'El ID de updatedBy no puede estar vacío' })
  updatedBy: string;
}
