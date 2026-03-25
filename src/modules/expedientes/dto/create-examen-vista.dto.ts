import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const siONo = ['Si', 'No'];

const ishiharaInterpretaciones = ['Normal', 'Daltonismo'];

export class CreateExamenVistaDto {
  @ApiProperty({
    description: 'Fecha del examen de la vista',
    example: '2024-10-25T07:00:00.000+00:00',
  })
  @IsDate({ message: 'La fecha del examen debe ser una fecha' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha del examen no puede estar vacía' })
  fechaExamenVista: Date;

  // Agudeza Visual

  // Ceguera total por ojo (afecta lejana, cercana, sin y con corrección)
  @ApiProperty({
    description: 'Ojo izquierdo con ceguera total',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  ojoIzquierdoCegueraTotal?: boolean;

  @ApiProperty({
    description: 'Ojo derecho con ceguera total',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  ojoDerechoCegueraTotal?: boolean;

  // Sin corrección vista lejana
  @ApiProperty({
    description:
      'Agudeza visual lejana de ojo izquierdo sin corrección (null si ceguera total)',
    example: 20,
    nullable: true,
  })
  @ValidateIf((o) => !o.ojoIzquierdoCegueraTotal)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(5)
  @Max(400)
  @IsNotEmpty({
    message:
      'La agudeza visual lejana de ojo izquierdo sin corrección no puede estar vacía',
  })
  ojoIzquierdoLejanaSinCorreccion: number | null;

  @ApiProperty({
    description:
      'Agudeza visual lejana de ojo derecho sin corrección (null si ceguera total)',
    example: 20,
    nullable: true,
  })
  @ValidateIf((o) => !o.ojoDerechoCegueraTotal)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(5)
  @Max(400)
  @IsNotEmpty({
    message:
      'La agudeza visual lejana de ojo derecho sin corrección no puede estar vacía',
  })
  ojoDerechoLejanaSinCorreccion: number | null;

  @ApiProperty({
    description:
      'Interpretación de la agudeza visual lejana sin corrección (puede ser valor simple o formato OI: X. OD: Y)',
    example: 'Visión ligeramente reducida',
  })
  @IsString({
    message:
      'La interpretación de la agudeza visual lejana sin corrección debe ser un string',
  })
  @IsNotEmpty({
    message:
      'La interpretación de la agudeza visual lejana sin corrección no puede estar vacía',
  })
  sinCorreccionLejanaInterpretacion: string;

  @ApiProperty({
    description: 'Indica si requiere lentes para la corrección',
    enum: siONo,
    example: 'Si',
  })
  @IsString({
    message:
      'El indicador de si requiere lentes para la corrección debe ser un string',
  })
  @IsNotEmpty({
    message:
      'El indicador de si requiere lentes para la corrección no puede estar vacía',
  })
  @IsEnum(siONo, {
    message:
      'El indicador de si requiere lentes para la corrección debe ser uno de los siguientes: ' +
      siONo,
  })
  requiereLentesUsoGeneral: string;

  // Sin corrección vista cercana
  @ApiProperty({
    description:
      'Agudeza visual cercana de ojo izquierdo sin corrección (null si ceguera total)',
    example: 20,
    nullable: true,
  })
  @ValidateIf((o) => !o.ojoIzquierdoCegueraTotal)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(5)
  @Max(400)
  @IsNotEmpty({
    message:
      'La agudeza visual cercana de ojo izquierdo sin corrección no puede estar vacía',
  })
  ojoIzquierdoCercanaSinCorreccion: number | null;

  @ApiProperty({
    description:
      'Agudeza visual cercana de ojo derecho sin corrección (null si ceguera total)',
    example: 20,
    nullable: true,
  })
  @ValidateIf((o) => !o.ojoDerechoCegueraTotal)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(5)
  @Max(400)
  @IsNotEmpty({
    message:
      'La agudeza visual cercana de ojo derecho sin corrección no puede estar vacía',
  })
  ojoDerechoCercanaSinCorreccion: number | null;

  @ApiProperty({
    description:
      'Interpretación de la agudeza visual cercana sin corrección (puede ser valor simple o formato OI: X. OD: Y)',
    example: 'Visión ligeramente reducida',
  })
  @IsString({
    message:
      'La interpretación de la agudeza visual cercana sin corrección debe ser un string',
  })
  @IsNotEmpty({
    message:
      'La interpretación de la agudeza visual cercana sin corrección no puede estar vacía',
  })
  sinCorreccionCercanaInterpretacion: string;

  @ApiProperty({
    description: 'Indica si requiere lentes para la lectura',
    enum: siONo,
    example: 'Si',
  })
  @IsString({
    message:
      'El indicador de si requiere lentes para lectura debe ser un string',
  })
  @IsNotEmpty({
    message:
      'El indicador de si requiere lentes para lectura no puede estar vacía',
  })
  @IsEnum(siONo, {
    message:
      'El indicador de si requiere lentes para lectura debe ser uno de los siguientes: ' +
      siONo,
  })
  requiereLentesParaLectura: string;

  // Con corrección vista lejana
  @ApiProperty({
    description: 'Agudeza visual lejana de ojo izquierdo con corrección',
    example: 20,
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(5)
  @Max(400)
  @IsOptional()
  ojoIzquierdoLejanaConCorreccion?: number;

  @ApiProperty({
    description: 'Agudeza visual lejana de ojo derecho con corrección',
    example: 20,
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(5)
  @Max(400)
  @IsOptional()
  ojoDerechoLejanaConCorreccion?: number;

  @ApiProperty({
    description:
      'Interpretación de la agudeza visual lejana con corrección (puede ser valor simple o formato OI: X. OD: Y)',
    example: 'Visión ligeramente reducida',
  })
  @IsString({
    message:
      'La interpretación de la agudeza visual lejana con corrección debe ser un string',
  })
  @IsOptional()
  conCorreccionLejanaInterpretacion?: string;

  // Con corrección vista cercana
  @ApiProperty({
    description: 'Agudeza visual cercana de ojo izquierdo con corrección',
    example: 20,
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(5)
  @Max(400)
  @IsOptional()
  ojoIzquierdoCercanaConCorreccion?: number;

  @ApiProperty({
    description: 'Agudeza visual cercana de ojo derecho con corrección',
    example: 20,
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(5)
  @Max(400)
  @IsOptional()
  ojoDerechoCercanaConCorreccion?: number;

  @ApiProperty({
    description:
      'Interpretación de la agudeza visual cercana con corrección (puede ser valor simple o formato OI: X. OD: Y)',
    example: 'Visión ligeramente reducida',
  })
  @IsString({
    message:
      'La interpretación de la agudeza visual cercana con corrección debe ser un string',
  })
  @IsOptional()
  conCorreccionCercanaInterpretacion?: string;

  // Ishihara
  @ApiProperty({
    description: 'Número de placas que pudo ver correctamente',
    example: 10,
  })
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  @Max(14)
  @IsNotEmpty({
    message:
      'El número de placas que pudo ver correctamente no puede estar vacía',
  })
  placasCorrectas: number;

  @ApiProperty({
    description: 'Porcentaje de placas que pudo ver correctamente',
    example: 71,
  })
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  @Max(100)
  @IsNotEmpty({
    message:
      'El porcentaje de placas que pudo ver correctamente no puede estar vacía',
  })
  porcentajeIshihara: number;

  @ApiProperty({
    description: 'Interpretación de prueba Ishihara',
    enum: ishiharaInterpretaciones,
    example: 'Normal',
  })
  @IsString({
    message: 'La interpretación de la prueba Ishihara debe ser un string',
  })
  @IsNotEmpty({
    message: 'La interpretación de la prueba Ishihara no puede estar vacía',
  })
  @IsEnum(ishiharaInterpretaciones, {
    message:
      'La interpretación de la prueba Ishihara debe ser uno de los siguientes: ' +
      ishiharaInterpretaciones,
  })
  interpretacionIshihara: string;

  // Pruebas de función ocular
  @ApiProperty({
    description: 'Test de estereopsis',
    example: 'Normal',
    required: false,
  })
  @IsString({ message: 'El test de estereopsis debe ser un string' })
  @IsOptional()
  testEstereopsis: string;

  @ApiProperty({
    description: 'Test de campo visual',
    example: 'Normal',
    required: false,
  })
  @IsString({ message: 'El test de campo visual debe ser un string' })
  @IsOptional()
  testCampoVisual: string;

  @ApiProperty({
    description: 'Cover test',
    example: 'Normal',
    required: false,
  })
  @IsString({ message: 'El cover test debe ser un string' })
  @IsOptional()
  coverTest: string;

  // Receta Final
  @ApiProperty({
    description: 'Esfera del ojo izquierdo',
    example: '+2.00',
    required: false,
  })
  @IsString({ message: 'La esfera del ojo izquierdo debe ser un string' })
  @IsOptional()
  esferaOjoIzquierdo: string;

  @ApiProperty({
    description: 'Cilindro del ojo izquierdo',
    example: '-0.50',
    required: false,
  })
  @IsString({ message: 'El cilindro del ojo izquierdo debe ser un string' })
  @IsOptional()
  cilindroOjoIzquierdo: string;

  @ApiProperty({
    description: 'Adición del ojo izquierdo',
    example: '+1.50',
    required: false,
  })
  @IsString({ message: 'La adición del ojo izquierdo debe ser un string' })
  @IsOptional()
  adicionOjoIzquierdo: string;

  @ApiProperty({
    description: 'Esfera del ojo derecho',
    example: '+2.00',
    required: false,
  })
  @IsString({ message: 'La esfera del ojo derecho debe ser un string' })
  @IsOptional()
  esferaOjoDerecho: string;

  @ApiProperty({
    description: 'Cilindro del ojo derecho',
    example: '-0.50',
    required: false,
  })
  @IsString({ message: 'El cilindro del ojo derecho debe ser un string' })
  @IsOptional()
  cilindroOjoDerecho: string;

  @ApiProperty({
    description: 'Adición del ojo derecho',
    example: '+1.50',
    required: false,
  })
  @IsString({ message: 'La adición del ojo derecho debe ser un string' })
  @IsOptional()
  adicionOjoDerecho: string;

  // Diagnóstico y recomendaciones
  @ApiProperty({
    description: 'Diagnóstico y recomendaciones',
    example: 'Se recomienda el uso de lentes para corrección visual',
    required: false,
  })
  @IsString({ message: 'El diagnóstico y recomendaciones debe ser un string' })
  @IsOptional()
  diagnosticoRecomendaciones?: string;

  // Campos exclusivos Guatemala
  @ApiProperty({
    description: 'Antecedentes (solo Guatemala)',
    required: false,
  })
  @IsString()
  @IsOptional()
  antecedentes?: string;

  @ApiProperty({
    description: 'Anamnesis (solo Guatemala)',
    required: false,
  })
  @IsString()
  @IsOptional()
  anamnesis?: string;

  @ApiProperty({
    description: 'Indica si utiliza anteojos (solo Guatemala)',
    enum: siONo,
    required: false,
  })
  @IsString()
  @IsEnum(siONo)
  @IsOptional()
  utilizaAnteojos?: string;

  // RESTO
  @ApiProperty({
    description: 'El ID del trabajador',
    example: '671fe9cc00fcb5611b10686e',
  })
  @IsMongoId({ message: 'El id del trabajador debe ser un ObjectId' })
  @IsNotEmpty({ message: 'El id del trabajador no puede estar vacío' })
  idTrabajador: string;

  @ApiProperty({
    description: 'Ruta hacía el PDF del examen de la vista',
    example:
      'expedientes-medicos/Expedientes Medicos/AGRICULTURE/Parcelas Del Este/Juan Pérez López.pdf',
  })
  @IsString({
    message: 'La ruta del PDF del examen de la vista debe ser un string',
  })
  @IsNotEmpty({
    message: 'La ruta del PDF del examen de la vista no puede estar vacía',
  })
  rutaPDF: string;

  @ApiProperty({
    description: 'El ID del usuario que creó este registro',
    example: '60d9f70fc39b3c1b8f0d6c0b',
  })
  @IsMongoId({ message: 'El ID de "createdBy" no es válido' })
  @IsNotEmpty({ message: 'El ID de "createdBy" no puede estar vacío' })
  createdBy: string;

  @ApiProperty({
    description: 'El ID del usuario que actualizó este registro',
    example: '60d9f70fc39b3c1b8f0d6c0c',
  })
  @IsMongoId({ message: 'El ID de "updatedBy" no es válido' })
  @IsNotEmpty({ message: 'El ID de "updatedBy" no puede estar vacío' })
  updatedBy: string;
}
