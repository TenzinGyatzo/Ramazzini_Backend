import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  CLUES_VALIDATION_MESSAGE,
  CLUES_VALIDATION_REGEX,
} from 'src/utils/clues-validator.util';

const perfiles = [
  'Médico único de empresa',
  'Médico independiente que brinda servicios a empresas',
  'Empresa de salud ocupacional',
  'Equipo Médico Interno de la Empresa',
  'Otro',
];

class LogotipoDto {
  @IsString({ message: 'El "data" del logotipo debe ser un string' })
  data: string;

  @IsString({ message: 'El "contentType" del logotipo debe ser un string' })
  contentType: string;
}

class AddOnDto {
  @IsString({ message: 'El tipo de add-on debe ser un string' })
  tipo: string;

  @IsNumber({}, { message: 'La cantidad del add-on debe ser un número' })
  cantidad: number;
}

export class CreateProveedoresSaludDto {
  @IsString({ message: 'El nombre debe ser un string' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  nombre: string;

  @IsString({ message: 'El país debe ser un string' })
  @IsNotEmpty({ message: 'El país no puede estar vacío' })
  pais: string;

  @IsString({ message: 'El perfil del proveedor de salud debe ser un string' })
  @IsNotEmpty({
    message: 'El perfil del proveedor de salud no puede estar vacío',
  })
  @IsEnum(perfiles, {
    message:
      'El perfil del proveedor de salud debe ser uno de los valores predefinidos',
  })
  perfilProveedorSalud: string;

  @IsOptional()
  @IsString({ message: 'El CLUES debe ser un string' })
  @Matches(CLUES_VALIDATION_REGEX, {
    message: CLUES_VALIDATION_MESSAGE,
  })
  @Transform(({ value }) => value?.toString().toUpperCase().trim() || '')
  clues?: string;

  @IsOptional()
  @Type(() => LogotipoDto)
  logotipoEmpresa?: LogotipoDto;

  @IsOptional()
  @IsString({ message: 'El estado debe ser un string' })
  estado?: string;

  @IsOptional()
  @IsString({ message: 'El municipio debe ser un string' })
  municipio?: string;

  @IsOptional()
  @IsString({ message: 'El Código Postal debe ser un string' })
  codigoPostal?: string;

  @IsOptional()
  @IsString({ message: 'La dirección debe ser un string' })
  direccion?: string;

  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un string' })
  telefono?: string;

  @IsOptional()
  @IsString({ message: 'El email debe ser un string' })
  correoElectronico?: string;

  @IsOptional()
  @IsString({ message: 'El sitio web debe ser un string' })
  sitioWeb?: string;

  @IsOptional()
  @IsString({ message: 'El color del informe debe ser un string' })
  @Transform(({ value }) => value?.toString() || '#343A40')
  colorInforme?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return Boolean(value);
  })
  semaforizacionActivada?: boolean;

  @IsBoolean({ message: 'El campo termsAccepted debe ser un booleano' })
  termsAccepted: boolean;

  @IsString({ message: 'El campo acceptedAt debe ser una fecha' })
  acceptedAt: string;

  @IsString({ message: 'El campo termsVersion debe ser un string' })
  termsVersion: string;

  // **Régimen Regulatorio**
  @IsOptional()
  @IsEnum(['SIRES_NOM024', 'SIN_REGIMEN', 'NO_SUJETO_SIRES'], {
    message:
      'El régimen regulatorio debe ser SIRES_NOM024, SIN_REGIMEN o NO_SUJETO_SIRES',
  })
  regimenRegulatorio?: 'SIRES_NOM024' | 'SIN_REGIMEN' | 'NO_SUJETO_SIRES';

  @IsOptional()
  @IsBoolean({ message: 'declaracionAceptada debe ser un booleano' })
  declaracionAceptada?: boolean;

  @IsOptional()
  @IsString({ message: 'declaracionVersion debe ser un string' })
  declaracionVersion?: string;

  // **Campos de periodo de prueba y límites**
  @IsOptional()
  @Type(() => Date)
  fechaInicioTrial?: Date;

  @IsOptional()
  @IsBoolean({
    message: 'El campo periodoDePruebaFinalizado debe ser un booleano',
  })
  periodoDePruebaFinalizado?: boolean;

  @IsOptional()
  @IsNumber(
    {},
    {
      message:
        'El número máximo de historias permitidas al mes debe ser un número',
    },
  )
  maxHistoriasPermitidasAlMes?: number;

  // @IsOptional()
  // @IsNumber({}, { message: 'El número máximo de usuarios permitidos debe ser un número' })
  // maxUsuariosPermitidos?: number;

  // @IsOptional()
  // @IsNumber({}, { message: 'El número máximo de empresas permitidas debe ser un número' })
  // maxEmpresasPermitidas?: number;

  // @IsOptional()
  // @IsNumber({}, { message: 'El número máximo de trabajadores permitidos debe ser un número' })
  // maxTrabajadoresPermitidos?: number;

  @IsOptional()
  @IsArray({ message: 'El campo addOns debe ser un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => AddOnDto)
  addOns?: AddOnDto[];

  // **Campos de suscripción**
  @IsOptional()
  @IsString({ message: 'La suscripcion activa debe ser un string' })
  suscripcionActiva?: string;

  @IsOptional()
  @IsString({ message: 'El estado de la suscripción debe ser un string' })
  estadoSuscripcion?: string; // pending, authorized, cancelled

  @IsOptional()
  @Type(() => Date)
  finDeSuscripcion?: Date;
}
