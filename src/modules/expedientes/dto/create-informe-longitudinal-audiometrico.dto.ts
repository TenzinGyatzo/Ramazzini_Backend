import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CriterioComparacionAudiometrica,
  RolAudiometriaEnInforme,
} from '../enums/informe-longitudinal-audiometrico.enums';

export class AudiometriaConcentradaLongitudinalDto {
  @IsOptional()
  @IsMongoId({ message: 'idAudiometriaOriginal debe ser un ObjectId válido' })
  idAudiometriaOriginal?: string;

  @IsOptional()
  @IsDate({ message: 'fechaAudiometria debe ser una fecha' })
  @Type(() => Date)
  fechaAudiometria?: Date;

  @IsOptional()
  @IsString()
  metodoAudiometria?: string;

  @IsOptional()
  @IsEnum(RolAudiometriaEnInforme, { message: 'rolEnInforme no válido' })
  rolEnInforme?: RolAudiometriaEnInforme;

  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoDerecho125?: number;
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoDerecho250?: number;
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoDerecho500?: number;
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoDerecho1000?: number;
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoDerecho2000?: number;
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoDerecho3000?: number;
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoDerecho4000?: number;
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoDerecho6000?: number;
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoDerecho8000?: number;

  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoIzquierdo125?: number;
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoIzquierdo250?: number;
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoIzquierdo500?: number;
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoIzquierdo1000?: number;
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoIzquierdo2000?: number;
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoIzquierdo3000?: number;
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoIzquierdo4000?: number;
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoIzquierdo6000?: number;
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(110)
  oidoIzquierdo8000?: number;

  @IsOptional()
  @IsNumber()
  porcentajePerdidaOD?: number;
  @IsOptional()
  @IsNumber()
  porcentajePerdidaOI?: number;
  @IsOptional()
  @IsNumber()
  perdidaMonauralOD_AMA?: number;
  @IsOptional()
  @IsNumber()
  perdidaMonauralOI_AMA?: number;
  @IsOptional()
  @IsNumber()
  perdidaAuditivaBilateralAMA?: number;
  @IsOptional()
  @IsNumber()
  hipoacusiaBilateralCombinada?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  diagnosticoAudiometria?: string;
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  interpretacionAudiometrica?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  frecuenciasFaltantes?: number[];

  @IsOptional()
  @IsBoolean()
  estudioIncompleto?: boolean;
}

export class AntecedenteExposicionRuidoLongitudinalDto {
  @IsOptional()
  @IsString()
  fuente?: string;

  @IsOptional()
  @IsMongoId({ message: 'idHistoriaOtologica debe ser un ObjectId válido' })
  idHistoriaOtologica?: string;

  @IsOptional()
  @IsString()
  trabajoAmbientesRuidosos?: string;

  @IsOptional()
  @IsString()
  tiempoExposicionLaboral?: string;

  @IsOptional()
  @IsString()
  usoProteccionAuditiva?: string;

  @IsOptional()
  @IsBoolean()
  ruidoEnAgentesRiesgoActuales?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  textoLibre?: string;
}

export class CeldaDeltaAudiometricoDto {
  @IsOptional()
  @IsNumber()
  frecuenciaHz?: number;

  @IsOptional()
  @IsNumber()
  deltaDb?: number;
}

export class FilaMatrizDeltaAudiometricoDto {
  @IsOptional()
  @IsMongoId()
  idAudiometriaOriginal?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fechaAudiometria?: Date;

  @IsOptional()
  @IsString()
  oido?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CeldaDeltaAudiometricoDto)
  deltas?: CeldaDeltaAudiometricoDto[];
}

export class ResumenCronologicoAudiometricoDto {
  @IsOptional()
  @IsMongoId()
  idAudiometriaOriginal?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fechaAudiometria?: Date;

  @IsOptional()
  @IsEnum(RolAudiometriaEnInforme)
  tipo?: RolAudiometriaEnInforme;

  @IsOptional()
  @IsString()
  metodoAudiometria?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  resultadoOD?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  resultadoOI?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  cambioRespectoBasal?: string;
}

export class CreateInformeLongitudinalAudiometricoDto {
  @IsDate({ message: 'La fecha del informe longitudinal debe ser una fecha' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha del informe longitudinal no puede estar vacía' })
  fechaInformeLongitudinalAudiometrico: Date;

  @IsDate({ message: 'periodoInicio debe ser una fecha' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'periodoInicio no puede estar vacío' })
  periodoInicio: Date;

  @IsDate({ message: 'periodoFin debe ser una fecha' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'periodoFin no puede estar vacío' })
  periodoFin: Date;

  @IsMongoId({ message: 'El id del trabajador debe ser un ObjectId' })
  @IsNotEmpty({ message: 'El id del trabajador no puede estar vacío' })
  idTrabajador: string;

  @IsMongoId({ message: 'El ID de createdBy no es válido' })
  @IsNotEmpty({ message: 'El ID de createdBy no puede estar vacío' })
  createdBy: string;

  @IsMongoId({ message: 'El ID de updatedBy no es válido' })
  @IsNotEmpty({ message: 'El ID de updatedBy no puede estar vacío' })
  updatedBy: string;

  @IsOptional()
  @IsMongoId({ message: 'idAudiometriaBasal debe ser un ObjectId válido' })
  idAudiometriaBasal?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({
    each: true,
    message: 'cada elemento de audiometriasSubsecuentesIncluidas debe ser un ObjectId válido',
  })
  audiometriasSubsecuentesIncluidas?: string[];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  numeroAudiometriasIncluidas?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => AudiometriaConcentradaLongitudinalDto)
  audiometriaBasalConcentrada?: AudiometriaConcentradaLongitudinalDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AudiometriaConcentradaLongitudinalDto)
  audiometriasSubsecuentesConcentradas?: AudiometriaConcentradaLongitudinalDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AntecedenteExposicionRuidoLongitudinalDto)
  antecedenteExposicionRuido?: AntecedenteExposicionRuidoLongitudinalDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilaMatrizDeltaAudiometricoDto)
  matrizDeltas?: FilaMatrizDeltaAudiometricoDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumenCronologicoAudiometricoDto)
  resumenCronologico?: ResumenCronologicoAudiometricoDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  advertencias?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  borradorInterpretacionObjetiva?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  interpretacionLongitudinal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  recomendacionesSeguimientoAudiometrico?: string;

  @IsOptional()
  @IsEnum(CriterioComparacionAudiometrica)
  criterioComparacion?: CriterioComparacionAudiometrica;

  @IsOptional()
  @IsString()
  versionCriterio?: string;

  @IsOptional()
  @IsString()
  graficaAudiogramaOidoDerecho?: string;

  @IsOptional()
  @IsString()
  graficaAudiogramaOidoIzquierdo?: string;

  @IsOptional()
  @IsString()
  rutaPDF?: string;
}
