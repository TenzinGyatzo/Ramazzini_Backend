import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CatalogEntryMutationDto {
  @IsString()
  @MinLength(1)
  code: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsOptional()
  @IsString()
  catalogKey?: string;

  /** Alias de description para CIE-10 (columna NOMBRE en CSV). */
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  lsex?: string;

  @IsOptional()
  @IsString()
  linfRaw?: string;

  @IsOptional()
  @IsString()
  lsupRaw?: string;

  @IsOptional()
  @IsString()
  letra?: string;

  @IsOptional()
  @IsArray()
  tipoPersonal1VezCe?: number[];

  @IsOptional()
  @IsArray()
  tipoPersonalSubsecCe?: number[];

  @IsOptional()
  @IsBoolean()
  diaCronicos?: boolean;

  @IsOptional()
  @IsBoolean()
  diaCaInfantil?: boolean;

  @IsOptional()
  @IsString()
  clues?: string;

  @IsOptional()
  @IsString()
  nombreInstitucion?: string;

  @IsOptional()
  @IsString()
  entidad?: string;

  @IsOptional()
  @IsString()
  municipio?: string;

  @IsOptional()
  @IsString()
  localidad?: string;

  @IsOptional()
  @IsString()
  estatus?: string;

  @IsOptional()
  @IsString()
  estadoCode?: string;

  @IsOptional()
  @IsString()
  municipioCode?: string;

  @IsOptional()
  @IsString()
  localidadCode?: string;

  @IsOptional()
  @IsString()
  abreviatura?: string;

  @IsOptional()
  @IsString()
  cp?: string;

  @IsOptional()
  @IsString()
  asentamiento?: string;

  @IsOptional()
  @IsNumber()
  en_operacion?: number;
}
