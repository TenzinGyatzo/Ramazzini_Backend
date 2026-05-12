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
  Min,
  ValidateNested,
} from 'class-validator';
import { EstadoControlCondicion, GradoObesidad } from '../enums/cardiometabolico.enums';
import {
  ConsistenciaSeguimientoLongitudinal,
  GraficaLongitudinalCardiometabolica,
  NivelRiesgoLongitudinal,
  TendenciaLongitudinal,
} from '../enums/informe-longitudinal-cardiometabolico.enums';
import {
  EstadoSeguimientoProgramadoCardiometabolico,
  MotivoSeguimientoProgramadoCardiometabolico,
} from '../enums/seguimiento-programado-cardiometabolico.enum';
import {
  LaboratorioCardiometabolicoDto,
  SignosVitalesCardiometabolicoDto,
  SomatometriaCardiometabolicoDto,
} from './create-evento-seguimiento-cardiometabolico.dto';

export class CondicionControlResumenLongitudinalDto {
  @IsOptional()
  @IsBoolean({ message: 'presente debe ser booleano' })
  presente?: boolean;

  @IsOptional()
  @IsEnum(EstadoControlCondicion, {
    message: 'estadoActual debe ser CONTROLADA, NO_CONTROLADA o NO_VALORABLE',
  })
  estadoActual?: EstadoControlCondicion;

  @IsOptional()
  @IsEnum(TendenciaLongitudinal, {
    message: 'tendencia longitudinal no válida',
  })
  tendencia?: TendenciaLongitudinal;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  interpretacionAutomatica?: string;
}

export class CondicionObesidadResumenLongitudinalDto {
  @IsOptional()
  @IsBoolean({ message: 'presente debe ser booleano' })
  presente?: boolean;

  @IsOptional()
  @IsEnum(GradoObesidad, { message: 'grado de obesidad no válido' })
  gradoActual?: GradoObesidad;

  @IsOptional()
  @IsEnum(TendenciaLongitudinal, {
    message: 'tendencia longitudinal no válida',
  })
  tendencia?: TendenciaLongitudinal;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  interpretacionAutomatica?: string;
}

export class ResumenCondicionesCardiometabolicasDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CondicionControlResumenLongitudinalDto)
  hipertension?: CondicionControlResumenLongitudinalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CondicionControlResumenLongitudinalDto)
  diabetes?: CondicionControlResumenLongitudinalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CondicionControlResumenLongitudinalDto)
  dislipidemia?: CondicionControlResumenLongitudinalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CondicionObesidadResumenLongitudinalDto)
  obesidad?: CondicionObesidadResumenLongitudinalDto;
}

export class ResumenIndicadorLongitudinalDto {
  @IsOptional()
  @IsNumber()
  valorInicial?: number;

  @IsOptional()
  @IsNumber()
  valorFinal?: number;

  @IsOptional()
  @IsNumber()
  cambioAbsoluto?: number;

  @IsOptional()
  @IsNumber()
  cambioPorcentual?: number;

  @IsOptional()
  @IsNumber()
  mejorValor?: number;

  @IsOptional()
  @IsNumber()
  peorValor?: number;

  @IsOptional()
  @IsEnum(TendenciaLongitudinal, {
    message: 'tendencia longitudinal no válida',
  })
  tendencia?: TendenciaLongitudinal;

  @IsOptional()
  @IsString()
  interpretacion?: string;

  @IsOptional()
  @IsBoolean()
  tieneDatosSuficientes?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  numeroMediciones?: number;
}

export class ResumenIndicadoresLongitudinalDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ResumenIndicadorLongitudinalDto)
  tensionArterialSistolica?: ResumenIndicadorLongitudinalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResumenIndicadorLongitudinalDto)
  tensionArterialDiastolica?: ResumenIndicadorLongitudinalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResumenIndicadorLongitudinalDto)
  peso?: ResumenIndicadorLongitudinalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResumenIndicadorLongitudinalDto)
  indiceMasaCorporal?: ResumenIndicadorLongitudinalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResumenIndicadorLongitudinalDto)
  circunferenciaCintura?: ResumenIndicadorLongitudinalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResumenIndicadorLongitudinalDto)
  glucosaMgDl?: ResumenIndicadorLongitudinalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResumenIndicadorLongitudinalDto)
  hba1cPorcentaje?: ResumenIndicadorLongitudinalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResumenIndicadorLongitudinalDto)
  ldlMgDl?: ResumenIndicadorLongitudinalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResumenIndicadorLongitudinalDto)
  trigliceridosMgDl?: ResumenIndicadorLongitudinalDto;
}

export class EventoConcentradoCardiometabolicoDto {
  @IsOptional()
  @IsMongoId({ message: 'idEventoOriginal debe ser un ObjectId válido' })
  idEventoOriginal?: string;

  @IsOptional()
  @IsDate({ message: 'fechaControl debe ser una fecha' })
  @Type(() => Date)
  fechaControl?: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => SignosVitalesCardiometabolicoDto)
  signosVitales?: SignosVitalesCardiometabolicoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SomatometriaCardiometabolicoDto)
  somatometria?: SomatometriaCardiometabolicoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LaboratorioCardiometabolicoDto)
  laboratorio?: LaboratorioCardiometabolicoDto;

  @IsOptional()
  @IsString()
  riesgoActual?: string;

  @IsOptional()
  @IsString()
  plan?: string;
}

export class SeguimientoProgramadoConcentradoCardiometabolicoDto {
  @IsOptional()
  @IsMongoId({
    message: 'idSeguimientoProgramadoOriginal debe ser un ObjectId válido',
  })
  idSeguimientoProgramadoOriginal?: string;

  @IsOptional()
  @IsDate({ message: 'fechaProgramada debe ser una fecha' })
  @Type(() => Date)
  fechaProgramada?: Date;

  @IsOptional()
  @IsDate({ message: 'fechaReprogramada debe ser una fecha' })
  @Type(() => Date)
  fechaReprogramada?: Date;

  @IsOptional()
  @IsBoolean()
  esResultadoDeReprogramacion?: boolean;

  @IsOptional()
  @IsEnum(EstadoSeguimientoProgramadoCardiometabolico, {
    message: 'estado de seguimiento programado no válido',
  })
  estado?: EstadoSeguimientoProgramadoCardiometabolico;

  @IsOptional()
  @IsEnum(MotivoSeguimientoProgramadoCardiometabolico, {
    message: 'motivo de seguimiento programado no válido',
  })
  motivo?: MotivoSeguimientoProgramadoCardiometabolico;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsMongoId({ message: 'idEventoClinico debe ser un ObjectId válido' })
  idEventoClinico?: string;
}

export class CreateInformeLongitudinalCardiometabolicoDto {
  @IsDate({ message: 'La fecha del informe longitudinal debe ser una fecha' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha del informe longitudinal no puede estar vacía' })
  fechaInformeLongitudinalCardiometabolico: Date;

  @IsDate({ message: 'periodoInicio debe ser una fecha' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'periodoInicio no puede estar vacío' })
  periodoInicio: Date;

  @IsDate({ message: 'periodoFin debe ser una fecha' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'periodoFin no puede estar vacío' })
  periodoFin: Date;

  @IsOptional()
  @IsDate({ message: 'fechaUltimoEventoConsiderado debe ser una fecha' })
  @Type(() => Date)
  fechaUltimoEventoConsiderado?: Date;

  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  @IsNotEmpty({ message: 'numeroEventosIncluidos es obligatorio' })
  numeroEventosIncluidos: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  numeroEventosValidos?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  numeroSeguimientosProgramados?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  numeroSeguimientosRealizados?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  numeroInasistencias?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  numeroCancelaciones?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  numeroReprogramaciones?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  porcentajeAsistencia?: number;

  @IsOptional()
  @IsEnum(ConsistenciaSeguimientoLongitudinal, {
    message: 'consistencia de seguimiento longitudinal no válida',
  })
  consistenciaSeguimiento?: ConsistenciaSeguimientoLongitudinal;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  datosFaltantesRelevantes?: string[];

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
  @IsArray()
  @IsMongoId({
    each: true,
    message: 'cada elemento de eventosIncluidos debe ser un ObjectId válido',
  })
  eventosIncluidos?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({
    each: true,
    message:
      'cada elemento de seguimientosProgramadosIncluidos debe ser un ObjectId válido',
  })
  seguimientosProgramadosIncluidos?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ResumenCondicionesCardiometabolicasDto)
  resumenCondiciones?: ResumenCondicionesCardiometabolicasDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventoConcentradoCardiometabolicoDto)
  eventosConcentrados?: EventoConcentradoCardiometabolicoDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeguimientoProgramadoConcentradoCardiometabolicoDto)
  seguimientosProgramadosConcentrados?: SeguimientoProgramadoConcentradoCardiometabolicoDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ResumenIndicadoresLongitudinalDto)
  resumenIndicadores?: ResumenIndicadoresLongitudinalDto;

  @IsOptional()
  @IsArray()
  @IsEnum(GraficaLongitudinalCardiometabolica, {
    each: true,
    message: 'gráfica longitudinal no válida',
  })
  graficasIncluidas?: GraficaLongitudinalCardiometabolica[];

  @IsOptional()
  @IsEnum(NivelRiesgoLongitudinal, {
    message: 'nivel de riesgo longitudinal no válido',
  })
  nivelRiesgoLongitudinal?: NivelRiesgoLongitudinal;

  @IsOptional()
  @IsString()
  interpretacionRiesgoLongitudinal?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  factoresPersistentes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alertasRelevantes?: string[];

  @IsOptional()
  @IsString()
  resumenLongitudinalSugerido?: string;

  @IsOptional()
  @IsString()
  conclusionClinicaSugerida?: string;

  @IsOptional()
  @IsString()
  recomendacionesSugeridas?: string;

  @IsOptional()
  @IsString()
  limitacionesSugeridas?: string;

  @IsOptional()
  @IsString()
  resumenLongitudinal?: string;

  @IsOptional()
  @IsString()
  conclusionClinica?: string;

  @IsOptional()
  @IsString()
  recomendaciones?: string;

  @IsOptional()
  @IsString()
  limitaciones?: string;

  @IsOptional()
  @IsString()
  rutaPDF?: string;
}
