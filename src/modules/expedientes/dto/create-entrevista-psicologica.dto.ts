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

/** I. Observación general (conductual) */
const aparienciaOpciones = [
  'Adecuada',
  'Descuidada',
  'Incongruente con el contexto',
] as const;

const actitudHaciaEvaluadorOpciones = [
  'Colaboradora',
  'Indiferente',
  'Hostil',
  'Evasiva',
] as const;

const nivelCooperacionOpciones = ['Alta', 'Media', 'Baja'] as const;

const contactoVisualOpciones = [
  'Adecuado',
  'Escaso',
  'Evitativo',
  'Excesivo',
] as const;

const conductaMotoraOpciones = [
  'Normal',
  'Inquietud psicomotora',
  'Retardo psicomotor',
  'Movimientos inusuales',
] as const;

/** II. Estado de ánimo y afecto */
const estadoAnimoPredominanteOpciones = [
  'Eutímico (normal)',
  'Ansioso',
  'Deprimido',
  'Irritable',
] as const;

const afectoOpciones = ['Adecuado', 'Plano', 'Lábil', 'Incongruente'] as const;

const intensidadEmocionalOpciones = [
  'Normal',
  'Disminuida',
  'Aumentada',
] as const;

/** III. Pensamiento */
const cursoPensamientoOpciones = [
  'Normal',
  'Acelerado',
  'Enlentecido',
  'Disgregado',
] as const;

const siNoOpciones = ['No', 'Sí'] as const;

/** V. Cognición */
const orientacionOpciones = [
  'Orientación en tiempo, espacio y persona',
  'Desorientación parcial',
  'Desorientación global',
] as const;

const atencionConcentracionOpciones = [
  'Adecuada',
  'Disminuida',
  'Muy limitada',
] as const;

const memoriaOpciones = [
  'Conservada',
  'Leve alteración',
  'Alteración significativa',
] as const;

/** VI. Juicio y conciencia de estado */
const juicioOpciones = [
  'Conservado',
  'Parcialmente alterado',
  'Alterado',
] as const;

const concienciaEstadoOpciones = ['Presente', 'Parcial', 'Ausente'] as const;

/** VII. Funcionamiento psicosocial */
const relacionesInterpersonalesOpciones = [
  'Adecuadas',
  'Conflictos ocasionales',
  'Conflictos frecuentes',
  'Aislamiento',
] as const;

const desempenoLaboralOpciones = [
  'Adecuado',
  'Disminuido',
  'Inestable',
] as const;

const manejoEstresOpciones = ['Adecuado', 'Limitado', 'Inadecuado'] as const;

export class CreateEntrevistaPsicologicaDto {
  @ApiProperty({
    description: 'Fecha de la entrevista psicológica',
    example: '1980-10-25T07:00:00.000Z',
  })
  @IsDate({ message: 'La fecha de la entrevista psicológica debe ser una fecha' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha de la entrevista psicológica no puede estar vacía' })
  fechaEntrevistaPsicologica: Date;

  // I. Observación general (conductual)
  @ApiProperty({ description: 'Apariencia', enum: aparienciaOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(aparienciaOpciones)
  apariencia: string;

  @ApiProperty({ description: 'Actitud hacia el evaluador', enum: actitudHaciaEvaluadorOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(actitudHaciaEvaluadorOpciones)
  actitudHaciaEvaluador: string;

  @ApiProperty({ description: 'Nivel de cooperación', enum: nivelCooperacionOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(nivelCooperacionOpciones)
  nivelCooperacion: string;

  @ApiProperty({ description: 'Contacto visual', enum: contactoVisualOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(contactoVisualOpciones)
  contactoVisual: string;

  @ApiProperty({ description: 'Conducta motora', enum: conductaMotoraOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(conductaMotoraOpciones)
  conductaMotora: string;

  // II. Estado de ánimo y afecto
  @ApiProperty({ description: 'Estado de ánimo predominante', enum: estadoAnimoPredominanteOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(estadoAnimoPredominanteOpciones)
  estadoAnimoPredominante: string;

  @ApiProperty({ description: 'Afecto', enum: afectoOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(afectoOpciones)
  afecto: string;

  @ApiProperty({ description: 'Intensidad emocional', enum: intensidadEmocionalOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(intensidadEmocionalOpciones)
  intensidadEmocional: string;

  // III. Pensamiento
  @ApiProperty({ description: 'Curso del pensamiento', enum: cursoPensamientoOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(cursoPensamientoOpciones)
  cursoPensamiento: string;

  @ApiProperty({ description: 'Alteraciones del pensamiento', enum: siNoOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(siNoOpciones)
  alteracionesPensamiento: string;

  @ApiPropertyOptional({
    description: 'Descripción de alteraciones del pensamiento (si aplica)',
    example: 'Pensamiento lógico, coherente y dirigido a objetivos.',
  })
  @IsOptional()
  @IsString()
  descripcionAlteracionesPensamiento?: string;

  // IV. Percepción
  @ApiProperty({ description: 'Alteraciones perceptuales', enum: siNoOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(siNoOpciones)
  alteracionesPerceptuales: string;

  @ApiPropertyOptional({
    description: 'Descripción de alteraciones perceptuales (si aplica)',
    example: 'Niega alteraciones perceptuales.',
  })
  @IsOptional()
  @IsString()
  descripcionAlteracionesPerceptuales?: string;

  // V. Cognición
  @ApiProperty({ description: 'Orientación', enum: orientacionOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(orientacionOpciones)
  orientacion: string;

  @ApiProperty({ description: 'Atención y concentración', enum: atencionConcentracionOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(atencionConcentracionOpciones)
  atencionConcentracion: string;

  @ApiProperty({ description: 'Memoria', enum: memoriaOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(memoriaOpciones)
  memoria: string;

  // VI. Juicio y conciencia de estado
  @ApiProperty({ description: 'Juicio', enum: juicioOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(juicioOpciones)
  juicio: string;

  @ApiProperty({ description: 'Conciencia de estado (insight)', enum: concienciaEstadoOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(concienciaEstadoOpciones)
  concienciaEstado: string;

  // VII. Funcionamiento psicosocial
  @ApiProperty({ description: 'Relaciones interpersonales', enum: relacionesInterpersonalesOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(relacionesInterpersonalesOpciones)
  relacionesInterpersonales: string;

  @ApiProperty({
    description: 'Desempeño laboral (autorreporte)',
    enum: desempenoLaboralOpciones,
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(desempenoLaboralOpciones)
  desempenoLaboralAutorreporte: string;

  @ApiProperty({ description: 'Manejo del estrés', enum: manejoEstresOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(manejoEstresOpciones)
  manejoEstres: string;

  // VIII. Riesgo inmediato
  @ApiProperty({ description: 'Ideación suicida', enum: siNoOpciones })
  @IsString()
  @IsNotEmpty()
  @IsEnum(siNoOpciones)
  ideacionSuicida: string;

  @ApiPropertyOptional({
    description: 'Observaciones sobre ideación suicida (si aplica)',
    example: 'Niega ideación suicida.',
  })
  @IsOptional()
  @IsString()
  observacionesIdeacionSuicida?: string;

  // IX. Conclusión clínica
  @ApiProperty({
    description: 'Conclusión clínica (2–4 líneas integrando hallazgos)',
    example:
      'Paciente orientado en las tres esferas, con estado de ánimo eutímico, pensamiento lógico y sin alteraciones perceptuales.',
  })
  @IsString()
  @IsNotEmpty({ message: 'La conclusión clínica es obligatoria' })
  conclusionClinica: string;

  @ApiProperty({
    description: 'ID del trabajador',
    example: '671fe9cc00fcb5611b10686e',
  })
  @IsMongoId({ message: 'El id del trabajador debe ser un ObjectId' })
  @IsNotEmpty({ message: 'El id del trabajador no puede estar vacío' })
  idTrabajador: string;

  @ApiProperty({
    description: 'Ruta del PDF de la entrevista psicológica',
    example:
      'expedientes-medicos/Expedientes Medicos/EMPRESA/Centro/Juan Pérez López/entrevista.pdf',
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
