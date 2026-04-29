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
import {
  DiagnosticoCardiometabolico,
  EstadoControlCondicion,
  GradoObesidad,
} from '../schemas/cardiometabolico.enums';
import {
  CategoriaCircunferenciaCintura,
  CategoriaFrecuenciaCardiaca,
  CategoriaIMC,
  CategoriaTensionArterial,
} from '../enums/clinical-categories.enum';

export class CondicionMetabolicaEstadoDto {
  @IsOptional()
  @IsBoolean({ message: 'presente debe ser booleano' })
  presente?: boolean;

  @IsOptional()
  @IsEnum(EstadoControlCondicion, {
    message: 'control debe ser CONTROLADA, NO_CONTROLADA o NO_VALORABLE',
  })
  control?: EstadoControlCondicion;
}

export class CondicionObesidadEstadoDto {
  @IsOptional()
  @IsBoolean({ message: 'presente debe ser booleano' })
  presente?: boolean;

  @IsOptional()
  @IsEnum(GradoObesidad, { message: 'grado de obesidad no válido' })
  grado?: GradoObesidad;
}

export class EstadoCondicionesCardiometabolicasDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CondicionMetabolicaEstadoDto)
  hipertension?: CondicionMetabolicaEstadoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CondicionMetabolicaEstadoDto)
  diabetes?: CondicionMetabolicaEstadoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CondicionMetabolicaEstadoDto)
  dislipidemia?: CondicionMetabolicaEstadoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CondicionObesidadEstadoDto)
  obesidad?: CondicionObesidadEstadoDto;
}

export class SignosVitalesCardiometabolicoDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(60)
  @Max(200)
  tensionArterialSistolica?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(40)
  @Max(150)
  tensionArterialDiastolica?: number;

  @IsOptional()
  @IsEnum(CategoriaTensionArterial, { message: 'Categoría de tensión arterial no válida' })
  categoriaTensionArterial?: CategoriaTensionArterial;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(40)
  @Max(220)
  frecuenciaCardiaca?: number;

  @IsOptional()
  @IsEnum(CategoriaFrecuenciaCardiaca, {
    message: 'Categoría de frecuencia cardíaca no válida',
  })
  categoriaFrecuenciaCardiaca?: CategoriaFrecuenciaCardiaca;
}

export class SomatometriaCardiometabolicoDto {
  @IsOptional()
  @IsNumber()
  peso?: number;

  @IsOptional()
  @IsNumber()
  altura?: number;

  @IsOptional()
  @IsNumber()
  indiceMasaCorporal?: number;

  @IsOptional()
  @IsEnum(CategoriaIMC, { message: 'Categoría IMC no válida' })
  categoriaIMC?: CategoriaIMC;

  @IsOptional()
  @IsNumber()
  circunferenciaCintura?: number;

  @IsOptional()
  @IsEnum(CategoriaCircunferenciaCintura, {
    message: 'Categoría de circunferencia de cintura no válida',
  })
  categoriaCircunferenciaCintura?: CategoriaCircunferenciaCintura;
}

export class LaboratorioCardiometabolicoDto {
  @IsOptional()
  @IsNumber()
  glucosaMgDl?: number;

  @IsOptional()
  @IsNumber()
  hba1cPorcentaje?: number;

  @IsOptional()
  @IsNumber()
  colesterolTotalMgDl?: number;

  @IsOptional()
  @IsNumber()
  ldlMgDl?: number;

  @IsOptional()
  @IsNumber()
  hdlMgDl?: number;

  @IsOptional()
  @IsNumber()
  trigliceridosMgDl?: number;
}

export class CreateEventoSeguimientoCardiometabolicoDto {
  @IsDate({ message: 'La fecha del control debe ser una fecha' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha del control no puede estar vacía' })
  fechaControlCardiometabolico: Date;

  @IsString({ message: 'El motivo del seguimiento debe ser un string' })
  @IsNotEmpty({ message: 'El motivo del seguimiento no puede estar vacío' })
  motivoSeguimiento: string;

  @IsOptional()
  @IsArray({ message: 'Los diagnósticos activos deben ser un arreglo' })
  @IsEnum(DiagnosticoCardiometabolico, { each: true, message: 'Diagnóstico cardiometabólico no válido' })
  diagnosticosActivos?: DiagnosticoCardiometabolico[];

  @IsOptional()
  @ValidateNested()
  @Type(() => EstadoCondicionesCardiometabolicasDto)
  estadoCondiciones?: EstadoCondicionesCardiometabolicasDto;

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
  @IsString({ message: 'La adherencia terapéutica debe ser un string' })
  adherenciaTerapeutica?: string;

  @IsOptional()
  @IsString({ message: 'Los síntomas relevantes deben ser un string' })
  sintomasRelevantes?: string;

  @IsOptional()
  @IsString({ message: 'La evaluación clínica debe ser un string' })
  evaluacionClinica?: string;

  @IsOptional()
  @IsString({ message: 'El plan debe ser un string' })
  plan?: string;

  @IsOptional()
  @IsDate({ message: 'La próxima revisión sugerida debe ser una fecha' })
  @Type(() => Date)
  proximaRevisionSugerida?: Date;

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
