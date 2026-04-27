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

const nivelProblemaSituacionesOpciones = [
  'Ningún problema',
  'Problemas menores',
  'Problemas moderados',
  'Problemas serios',
] as const;

export class CreateTrastornosEstadoAnimoDto {
  @ApiProperty({
    description: 'Fecha de los trastornos de estado de ánimo',
    example: '2026-03-28T07:00:00.000Z',
  })
  @IsDate({ message: 'La fecha de los trastornos de estado de ánimo debe ser una fecha' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha de los trastornos de estado de ánimo no puede estar vacía' })
  fechaTrastornosEstadoAnimo: Date;

  // Pregunta 1 (subítems)
  @ApiPropertyOptional({ description: 'P1: exaltado / comportamiento no habitual o metido en problemas', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p1ExaltadoComportamientoNoHabitualOMetidoProblemas?: string;

  @ApiPropertyOptional({ description: 'P1: irritable, gritos o peleas', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p1IrritableGritosPeleas?: string;

  @ApiPropertyOptional({ description: 'P1: más seguridad que lo habitual', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p1MasSeguridadQueLoHabitual?: string;

  @ApiPropertyOptional({ description: 'P1: dormía menos sin necesitar más sueño', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p1DormiaMenosSinNecesitarMasSueno?: string;

  @ApiPropertyOptional({ description: 'P1: hablaba más o más rápido', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p1HablabaMasOMasRapido?: string;

  @ApiPropertyOptional({ description: 'P1: pensamientos agolpados', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p1PensamientosAgolpados?: string;

  @ApiPropertyOptional({ description: 'P1: distracción / dificultad de concentración', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p1DistraccionDificultadConcentracion?: string;

  @ApiPropertyOptional({ description: 'P1: más energía que lo habitual', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p1MasEnergiaQueLoHabitual?: string;

  @ApiPropertyOptional({ description: 'P1: más activo o más cosas que lo habitual', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p1MasActivoOMasCosasQueLoHabitual?: string;

  @ApiPropertyOptional({ description: 'P1: más social o extrovertido', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p1MasSocialExtrovertido?: string;

  @ApiPropertyOptional({ description: 'P1: más apetito sexual', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p1MasApetitoSexual?: string;

  @ApiPropertyOptional({ description: 'P1: cosas exageradas o riesgosas', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p1CosasExageradasRiesgosas?: string;

  @ApiPropertyOptional({ description: 'P1: gasto de dinero que causó problemas', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p1GastoDineroProblemas?: string;

  @ApiPropertyOptional({
    description: 'P2: si hubo ≥2 Sí en P1, ¿las situaciones ocurrieron en el mismo período?',
    enum: siNoOpciones,
  })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p2SituacionesMismoPeriodo?: string;

  @ApiPropertyOptional({
    description: 'P3: nivel de problema causado por las situaciones',
    enum: nivelProblemaSituacionesOpciones,
  })
  @IsOptional()
  @IsEnum(nivelProblemaSituacionesOpciones)
  p3NivelProblemaCausado?: string;

  @ApiPropertyOptional({ description: 'P4: familiar directo con trastorno bipolar', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p4FamiliarDirectoBipolar?: string;

  @ApiPropertyOptional({ description: 'P5: diagnóstico profesional de trastorno bipolar', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p5DiagnosticoProfesionalBipolar?: string;

  @ApiProperty({
    description: 'ID del trabajador',
    example: '671fe9cc00fcb5611b10686e',
  })
  @IsMongoId({ message: 'El id del trabajador debe ser un ObjectId' })
  @IsNotEmpty({ message: 'El id del trabajador no puede estar vacío' })
  idTrabajador: string;

  @ApiProperty({
    description: 'Ruta del PDF de los trastornos de estado de ánimo',
    example:
      'expedientes-medicos/Expedientes Medicos/EMPRESA/Centro/Juan Pérez López/trastornos-estado-animo.pdf',
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
