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

const gradoAcuerdoStatementSiOpciones = [
  'Totalmente en desacuerdo',
  'En desacuerdo',
  'Neutral',
  'De acuerdo',
  'Totalmente de acuerdo',
] as const;

export class CreateCuestionarioProdromalBreveDto {
  @ApiProperty({
    description: 'Fecha del cuestionario prodromal breve',
    example: '2024-10-25T07:00:00.000Z',
  })
  @IsDate({ message: 'La fecha del cuestionario prodromal breve debe ser una fecha' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha del cuestionario prodromal breve no puede estar vacía' })
  fechaCuestionarioProdromalBreve: Date;

  @ApiPropertyOptional({ description: 'Pregunta 1 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p1?: string;

  @ApiPropertyOptional({
    description: 'P1: grado de acuerdo si contestó Sí (asustado, preocupado o causa problemas)',
    enum: gradoAcuerdoStatementSiOpciones,
  })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p1GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 2 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p2?: string;

  @ApiPropertyOptional({ description: 'P2: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p2GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 3 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p3?: string;

  @ApiPropertyOptional({ description: 'P3: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p3GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 4 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p4?: string;

  @ApiPropertyOptional({ description: 'P4: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p4GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 5 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p5?: string;

  @ApiPropertyOptional({ description: 'P5: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p5GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 6 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p6?: string;

  @ApiPropertyOptional({ description: 'P6: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p6GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 7 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p7?: string;

  @ApiPropertyOptional({ description: 'P7: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p7GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 8 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p8?: string;

  @ApiPropertyOptional({ description: 'P8: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p8GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 9 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p9?: string;

  @ApiPropertyOptional({ description: 'P9: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p9GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 10 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p10?: string;

  @ApiPropertyOptional({ description: 'P10: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p10GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 11 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p11?: string;

  @ApiPropertyOptional({ description: 'P11: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p11GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 12 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p12?: string;

  @ApiPropertyOptional({ description: 'P12: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p12GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 13 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p13?: string;

  @ApiPropertyOptional({ description: 'P13: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p13GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 14 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p14?: string;

  @ApiPropertyOptional({ description: 'P14: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p14GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 15 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p15?: string;

  @ApiPropertyOptional({ description: 'P15: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p15GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 16 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p16?: string;

  @ApiPropertyOptional({ description: 'P16: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p16GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 17 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p17?: string;

  @ApiPropertyOptional({ description: 'P17: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p17GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 18 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p18?: string;

  @ApiPropertyOptional({ description: 'P18: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p18GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 19 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p19?: string;

  @ApiPropertyOptional({ description: 'P19: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p19GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 20 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p20?: string;

  @ApiPropertyOptional({ description: 'P20: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p20GradoAcuerdoStatement?: string;

  @ApiPropertyOptional({ description: 'Pregunta 21 (Sí/No)', enum: siNoOpciones })
  @IsOptional()
  @IsEnum(siNoOpciones)
  p21?: string;

  @ApiPropertyOptional({ description: 'P21: grado de acuerdo si contestó Sí', enum: gradoAcuerdoStatementSiOpciones })
  @IsOptional()
  @IsEnum(gradoAcuerdoStatementSiOpciones)
  p21GradoAcuerdoStatement?: string;

  @ApiProperty({
    description: 'ID del trabajador',
    example: '671fe9cc00fcb5611b10686e',
  })
  @IsMongoId({ message: 'El id del trabajador debe ser un ObjectId' })
  @IsNotEmpty({ message: 'El id del trabajador no puede estar vacío' })
  idTrabajador: string;

  @ApiProperty({
    description: 'Ruta del PDF del cuestionario prodromal breve',
    example:
      'expedientes-medicos/Expedientes Medicos/EMPRESA/Centro/Juan Pérez López/cuestionario-prodromal-breve.pdf',
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
