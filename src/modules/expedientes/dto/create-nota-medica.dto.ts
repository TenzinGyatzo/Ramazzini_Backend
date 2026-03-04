import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  IsArray,
  IsBoolean,
  IsIn,
  Validate,
  ValidateIf,
} from 'class-validator';
import { SistolicaMayorIgualDiastolicaConstraint } from '../validators/nota-medica-signos-vitales.validator';

const tipoNota = ['Inicial', 'Seguimiento', 'Alta'];

export class CreateNotaMedicaDto {
  @IsNotEmpty({ message: 'El motivo del examen no puede estar vacío' })
  @IsEnum(tipoNota, {
    message:
      'El motivo del examen debe ser alguno de los siguientes: ' + tipoNota,
  })
  tipoNota: string;

  @IsDate({ message: 'La fecha de la nota médica debe ser una fecha' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha de la nota médica no puede estar vacía' })
  fechaNotaMedica: Date;

  @IsString({ message: 'El motivo de consulta debe ser un string' })
  @IsNotEmpty({ message: 'El motivo de consulta no puede estar vacío' })
  motivoConsulta: string;

  @IsOptional()
  @IsString({ message: 'Los antecedentes deben ser un string' })
  antecedentes: string;

  @IsOptional()
  @IsString({ message: 'La exploración física debe ser un string' })
  exploracionFisica: string;

  // Signos Vitales - CEX NOM-024: rangos ampliados, 0 = desconoce
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @ValidateIf(
    (o) =>
      o.tensionArterialSistolica != null && o.tensionArterialSistolica !== 0,
  )
  @Min(50, { message: 'CEX: sistólica mínimo 50 mmHg' })
  @Max(300, { message: 'CEX: sistólica máximo 300 mmHg' })
  @Validate(SistolicaMayorIgualDiastolicaConstraint)
  tensionArterialSistolica?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @ValidateIf(
    (o) =>
      o.tensionArterialDiastolica != null && o.tensionArterialDiastolica !== 0,
  )
  @Min(20, { message: 'CEX: diastólica mínimo 20 mmHg' })
  @Max(200, { message: 'CEX: diastólica máximo 200 mmHg' })
  tensionArterialDiastolica?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @ValidateIf((o) => o.frecuenciaCardiaca != null && o.frecuenciaCardiaca !== 0)
  @Min(40)
  @Max(220)
  frecuenciaCardiaca?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @ValidateIf(
    (o) => o.frecuenciaRespiratoria != null && o.frecuenciaRespiratoria !== 0,
  )
  @Min(10)
  @Max(99)
  frecuenciaRespiratoria?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @ValidateIf((o) => o.temperatura != null && o.temperatura !== 0)
  @Min(30)
  @Max(44)
  temperatura?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @ValidateIf((o) => o.saturacionOxigeno != null && o.saturacionOxigeno !== 0)
  @Min(1)
  @Max(100)
  saturacionOxigeno?: number;

  @IsOptional()
  @IsString({ message: 'El diagnóstico debe ser un string' })
  diagnostico: string; // Free-text diagnosis (backward compatibility)

  // NOM-024: CIE-10 Diagnosis Codes
  // Acepta formato "CODE - DESCRIPTION" o solo "CODE"
  @IsOptional()
  @IsString({ message: 'El código CIE-10 principal debe ser un string' })
  codigoCIE10Principal?: string; // Formato: "A30 - LEPRA [ENFERMEDAD DE HANSEN]" o "A30"

  @IsOptional()
  @IsArray({ message: 'Los códigos CIE-10 secundarios deben ser un array' })
  @IsString({
    each: true,
    message: 'Cada código CIE-10 complementario debe ser un string',
  })
  codigosCIE10Complementarios?: string[]; // Formato: ["A30 - LEPRA [ENFERMEDAD DE HANSEN]"] o ["A30"]

  // NOM-024 GIIS-B015: Campos adicionales para diagnóstico
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 0 },
    { message: 'relacionTemporal debe ser un número' },
  )
  @IsIn([0, 1], {
    message: 'relacionTemporal debe ser 0 (Primera Vez) o 1 (Subsecuente)',
  })
  relacionTemporal?: number; // 0=Primera Vez, 1=Subsecuente

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 0 },
    { message: 'primeraVezDiagnostico2 debe ser un número' },
  )
  @IsIn([-1, 0, 1], {
    message: 'primeraVezDiagnostico2 debe ser -1 (No aplica), 0 (No) o 1 (Sí)',
  })
  primeraVezDiagnostico2?: number; // -1=No aplica, 0=No, 1=Si

  @IsOptional()
  @IsString({ message: 'El código CIE-10 diagnóstico 2 debe ser un string' })
  codigoCIEDiagnostico2?: string; // Formato: "A30 - LEPRA [ENFERMEDAD DE HANSEN]" o "A30"

  @IsOptional()
  @IsBoolean({ message: 'confirmacionDiagnostica2 debe ser un booleano' })
  confirmacionDiagnostica2?: boolean; // Flag para crónicos/cáncer <18 (diagnóstico 2)

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 0 },
    { message: 'primeraVezDiagnostico3 debe ser un número' },
  )
  @IsIn([-1, 0, 1], {
    message: 'primeraVezDiagnostico3 debe ser -1 (No aplica), 0 (No) o 1 (Sí)',
  })
  primeraVezDiagnostico3?: number; // -1=No aplica, 0=No, 1=Si

  @IsOptional()
  @IsString({ message: 'El código CIE-10 diagnóstico 3 debe ser un string' })
  codigoCIEDiagnostico3?: string; // Formato: "A30 - LEPRA [ENFERMEDAD DE HANSEN]" o "A30"

  @IsOptional()
  @IsBoolean({ message: 'confirmacionDiagnostica3 debe ser un booleano' })
  confirmacionDiagnostica3?: boolean; // Flag para crónicos/cáncer <18 (diagnóstico 3)

  @IsOptional()
  @IsString({ message: 'La descripción complementaria debe ser un string' })
  diagnosticoTexto?: string; // Texto libre complementario al diagnóstico 2

  @IsOptional()
  @IsBoolean({ message: 'confirmacionDiagnostica debe ser un booleano' })
  confirmacionDiagnostica?: boolean; // Flag para crónicos/cáncer <18

  @IsOptional()
  @IsString({ message: 'El código CIE-10 causa externa debe ser un string' })
  codigoCIECausaExterna?: string; // Formato: "V01 - ACCIDENTE DE TRÁNSITO" o "V01"

  @IsOptional()
  @IsString({ message: 'La causa externa debe ser un string' })
  causaExterna?: string; // Texto libre para causa externa

  @IsOptional()
  @IsString({ each: true, message: 'Cada tratamiento debe ser un string' })
  tratamiento: string[];

  @IsOptional()
  @IsString({ each: true, message: 'Cada recomendación debe ser un string' })
  recomendaciones: string[];

  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser un string' })
  observaciones: string;

  @IsMongoId({ message: 'El id del trabajador debe ser un ObjectId' })
  @IsNotEmpty({ message: 'El id del trabajador no puede estar vacío' })
  idTrabajador: string;

  @IsString({ message: 'La ruta del PDF del informe debe ser un string' })
  @IsNotEmpty({ message: 'La ruta del PDF del informe no puede estar vacía' })
  rutaPDF: string;

  @IsMongoId({ message: 'El ID de "createdBy" no es válido' })
  @IsNotEmpty({ message: 'El ID de "createdBy" no puede estar vacío' })
  createdBy: string;

  @IsMongoId({ message: 'El ID de "updatedBy" no es válido' })
  @IsNotEmpty({ message: 'El ID de "updatedBy" no puede estar vacío' })
  updatedBy: string;
}
