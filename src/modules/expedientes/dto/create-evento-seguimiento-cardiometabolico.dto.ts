import { Type } from 'class-transformer';
import {
  IsArray,
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
} from '../enums/cardiometabolico.enums';
import {
  CategoriaCircunferenciaCintura,
  CategoriaColesterolTotal,
  CategoriaFrecuenciaCardiaca,
  CategoriaGlucosa,
  CategoriaHbA1c,
  CategoriaHDL,
  CategoriaIMC,
  CategoriaLDL,
  CategoriaTensionArterial,
  CategoriaTrigliceridos,
} from '../enums/clinical-categories.enum';

export class VisitaControlCondicionDto {
  @IsOptional()
  @IsEnum(EstadoControlCondicion, {
    message: 'control de condición debe ser CONTROLADA, NO_CONTROLADA o NO_VALORABLE',
  })
  control?: EstadoControlCondicion;
}

export class CondicionObesidadEstadoDto {
  @IsOptional()
  @IsEnum(GradoObesidad, { message: 'grado de obesidad no válido' })
  grado?: GradoObesidad;
}

export class EstadoCondicionesCardiometabolicasDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => VisitaControlCondicionDto)
  hipertensionArterial?: VisitaControlCondicionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => VisitaControlCondicionDto)
  diabetesMellitusTipo2?: VisitaControlCondicionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => VisitaControlCondicionDto)
  dislipidemia?: VisitaControlCondicionDto;

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
  @IsEnum(CategoriaGlucosa, { message: 'Categoría de glucosa no válida' })
  categoriaGlucosa?: CategoriaGlucosa;

  @IsOptional()
  @IsNumber()
  hba1cPorcentaje?: number;

  @IsOptional()
  @IsEnum(CategoriaHbA1c, { message: 'Categoría de HbA1c no válida' })
  categoriaHbA1c?: CategoriaHbA1c;

  @IsOptional()
  @IsNumber()
  colesterolTotalMgDl?: number;

  @IsOptional()
  @IsEnum(CategoriaColesterolTotal, {
    message: 'Categoría de colesterol total no válida',
  })
  categoriaColesterolTotal?: CategoriaColesterolTotal;

  @IsOptional()
  @IsNumber()
  ldlMgDl?: number;

  @IsOptional()
  @IsEnum(CategoriaLDL, { message: 'Categoría de LDL no válida' })
  categoriaLDL?: CategoriaLDL;

  @IsOptional()
  @IsNumber()
  hdlMgDl?: number;

  @IsOptional()
  @IsEnum(CategoriaHDL, { message: 'Categoría de HDL no válida' })
  categoriaHDL?: CategoriaHDL;

  @IsOptional()
  @IsNumber()
  trigliceridosMgDl?: number;

  @IsOptional()
  @IsEnum(CategoriaTrigliceridos, {
    message: 'Categoría de triglicéridos no válida',
  })
  categoriaTrigliceridos?: CategoriaTrigliceridos;
}

export class CreateEventoSeguimientoCardiometabolicoDto {
  @IsDate({ message: 'La fecha del evento de seguimiento debe ser una fecha' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha del evento de seguimiento no puede estar vacía' })
  fechaEventoSeguimientoCardiometabolico: Date;

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
  @IsString({ message: 'Los riesgos actuales deben ser un string' })
  riesgosActuales?: string;

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
