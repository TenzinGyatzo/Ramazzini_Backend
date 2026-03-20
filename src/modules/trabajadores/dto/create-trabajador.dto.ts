import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const sexos = ['Masculino', 'Femenino'];

const nivelesEscolaridad = [
  'Primaria',
  'Secundaria',
  'Preparatoria',
  'Diversificado',
  'Licenciatura',
  'Maestría',
  'Doctorado',
  'Nula',
];

const estadosCiviles = [
  'Soltero/a',
  'Casado/a',
  'Unión libre',
  'Separado/a',
  'Divorciado/a',
  'Viudo/a',
];

const estadosLaborales = ['Activo', 'Inactivo'];

export class CreateTrabajadorDto {
  @ApiProperty({
    description: 'Primer apellido del trabajador',
    example: 'Varela',
  })
  @IsString({ message: 'El primer apellido debe ser un string' })
  @IsNotEmpty({ message: 'El primer apellido no puede estar vacío' })
  primerApellido: string;

  @ApiProperty({
    description: 'Segundo apellido del trabajador',
    example: 'Ruvalcaba',
  })
  @IsString({ message: 'El segundo apellido debe ser un string' })
  @IsOptional({ message: 'El segundo apellido puede estar vacío' })
  segundoApellido?: string;

  @ApiProperty({
    description: 'Nombre completo del trabajador',
    example: 'Juan Enrique',
  })
  @IsString({ message: 'El nombre debe ser un string' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  nombre: string;

  @ApiProperty({
    description:
      'Fecha de nacimiento del trabajador, sirve para calcular edad dinamicamente',
    example: '1980-10-25T07:00:00.000+00:00',
  })
  @IsDate({ message: 'La fecha de nacimiento debe ser una fecha' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha de nacimiento no puede estar vacía' })
  fechaNacimiento: Date;

  @ApiProperty({
    description: 'Sexo del trabajador',
    enum: sexos,
    example: 'Masculino',
  })
  @IsString({ message: 'El sexo debe ser un string' })
  @IsNotEmpty({ message: 'El sexo no puede estar vacío' })
  @IsEnum(sexos, { message: 'El sexo debe ser Masculino o Femenino' })
  sexo: string;

  @ApiProperty({
    description: 'Último nivel de estudios completado',
    enum: nivelesEscolaridad,
    example: 'Diversificado',
  })
  @IsString({ message: 'La escolaridad debe ser un string' })
  @IsNotEmpty({ message: 'La escolaridad no puede estar vacía' })
  @IsEnum(nivelesEscolaridad, {
    message:
      'La escolaridad debe ser Primaria, Secundaria, Preparatoria, Diversificado, Licenciatura, Maestría, Doctorado o Nula',
  })
  escolaridad: string;

  @ApiProperty({
    description: 'Puesto actual o puesto al que aspira el trabajador',
    example: 'Maniobrista',
  })
  @IsString({ message: 'El puesto debe ser un string' })
  @IsNotEmpty({ message: 'El puesto no puede estar vacío' })
  puesto: string;

  @ApiProperty({
    description:
      'Fecha de ingreso al trabajo, sirve para calcular antigüedad dinamicamente',
    example: '2023-10-01T07:00:00.000+00:00',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  fechaIngreso?: Date;

  @ApiProperty({
    description:
      'Número de teléfono del trabajador (opcional, formato internacional)',
    example: '+526681078205',
    required: false, // Esto indica que es opcional en la documentación de Swagger
  })
  @IsOptional() // Indica que el campo es opcional
  @IsString({ message: 'El teléfono debe ser un string' })
  @Matches(/^$|^\+?[0-9]\d{3,14}$/, {
    message:
      'El teléfono debe estar vacío o tener entre 4 y 15 dígitos (formato internacional)',
  })
  telefono?: string; // El operador `?` también indica que es opcional en TypeScript

  @ApiProperty({
    description: 'Estado Civil del trabajador',
    enum: estadosCiviles,
    example: 'Casado/a',
  })
  @IsString({ message: 'El estado civil debe ser un string' })
  @IsNotEmpty({ message: 'El estado civil no puede estar vacío' })
  @IsEnum(estadosCiviles, {
    message:
      'El estado civil debe ser Soltero/a, Casado/a, Unión libre, Separado/a, Divorciado/a o Viudo/a',
  })
  estadoCivil: string;

  @ApiProperty({
    description:
      'Número de empleado del trabajador (opcional, máximo 7 dígitos)',
    example: '1234567',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El número de empleado debe ser un string' })
  @Matches(/^$|^[0-9]{1,7}$/, {
    message:
      'El número de empleado debe estar vacío o contener solo números entre 1 y 7 dígitos',
  })
  numeroEmpleado?: string;

  @ApiProperty({
    description:
      'Identificador de seguridad social (opcional, LATAM: 4-30 chars alfanuméricos y separadores)',
    example: 'CL-12.345.678-9',
    required: false,
  })
  @IsOptional()
  @IsString({
    message: 'El identificador de seguridad social debe ser un string',
  })
  @Matches(/^$|^[A-Za-z0-9\s\-_.\/]{4,30}$/, {
    message:
      'Debe estar vacío o tener 4-30 caracteres alfanuméricos y - _ . / espacios',
  })
  nss?: string;

  @ApiProperty({
    description:
      'CURP según formato RENAPO (18 caracteres). Obligatorio para proveedores MX, opcional para otros países. Formato: [A-Z]{4}\\d{6}[HM][A-Z]{5}[0-9A-Z]\\d',
    example: 'ROAJ850102HDFLRN08',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El identificador CURP debe ser un string' })
  // RENAPO format: [A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d (18 chars, uppercase)
  // Also allows generic CURP: XXXX999999XXXXXX99 (for unknown/foreign patients)
  // Allow empty for non-MX providers, but enforce strict format when provided
  @Matches(/^$|^([A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d|XXXX999999XXXXXX99)$/, {
    message:
      'CURP debe tener exactamente 18 caracteres en formato RENAPO: 4 letras, 6 dígitos, H o M, 5 letras, 1 alfanumérico, 1 dígito. Ejemplo: ROAJ850102HDFLRN08. También se permite CURP genérica: XXXX999999XXXXXX99',
  })
  curp?: string;

  // NOM-024 Person Identification Fields
  @ApiProperty({
    description:
      'Entidad de nacimiento (código INEGI 2 dígitos: 01-32, NE para Extranjero, 00 para No disponible). Obligatorio para proveedores MX.',
    example: '01',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La entidad de nacimiento debe ser un string' })
  @Matches(/^$|^(0[1-9]|[12][0-9]|3[0-2]|NE|00)$/, {
    message:
      'Entidad de nacimiento debe ser código INEGI válido (01-32, NE, o 00)',
  })
  entidadNacimiento?: string;

  @ApiProperty({
    description:
      'Nacionalidad (código RENAPO 3 letras, ej: MEX, USA, NND para No disponible). Obligatorio para proveedores MX.',
    example: 'MEX',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La nacionalidad debe ser un string' })
  @Matches(/^$|^[A-Z]{3}$/, {
    message:
      'Nacionalidad debe ser código RENAPO válido (3 letras mayúsculas, ej: MEX, USA, NND)',
  })
  nacionalidad?: string;

  @ApiProperty({
    description:
      'Entidad de residencia (código INEGI 2 dígitos: 01-32, NE para Extranjero, 00 para No disponible). Obligatorio para proveedores MX.',
    example: '01',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La entidad de residencia debe ser un string' })
  @Matches(/^$|^(0[1-9]|[12][0-9]|3[0-2]|NE|00)$/, {
    message:
      'Entidad de residencia debe ser código INEGI válido (01-32, NE, o 00)',
  })
  entidadResidencia?: string;

  @ApiProperty({
    description:
      'Municipio de residencia (código INEGI 3 dígitos: 001-999). Obligatorio para proveedores MX cuando entidadResidencia está presente.',
    example: '001',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El municipio de residencia debe ser un string' })
  @Matches(/^$|^[0-9]{3}$/, {
    message:
      'Municipio de residencia debe ser código INEGI válido (3 dígitos, ej: 001)',
  })
  municipioResidencia?: string;

  @ApiProperty({
    description:
      'Localidad de residencia (código INEGI 4 dígitos: 0001-9999). Obligatorio para proveedores MX cuando municipioResidencia está presente.',
    example: '0001',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La localidad de residencia debe ser un string' })
  @Matches(/^$|^[0-9]{4}$/, {
    message:
      'Localidad de residencia debe ser código INEGI válido (4 dígitos, ej: 0001)',
  })
  localidadResidencia?: string;

  // Agentes de Riesgo
  @IsOptional()
  @IsArray({ message: 'Los agentes de riesgo deben ser un array' })
  @IsString({ each: true, message: 'Cada agente de riesgo debe ser un string' })
  agentesRiesgoActuales?: string[];

  @ApiProperty({
    description: 'Estado laboral del trabajador',
    example: 'Activo',
  })
  @IsString({ message: 'El estado laboral debe ser un string' })
  @IsNotEmpty({ message: 'El estado laboral no puede estar vacío' })
  estadoLaboral: string;

  @ApiProperty({
    description: 'El ID del centro de trabajo al que pertenece el trabajador',
    example: '60d9f70fc39b3c1b8f0d6c0a',
  })
  @IsMongoId({ message: 'El id del centro de trabajo debe ser un ObjectId' })
  @IsNotEmpty({ message: 'El id del centro de trabajo no puede estar vacío' })
  idCentroTrabajo: string;

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

  // NOM-024: Folio alfanumérico 18 caracteres. Generado por backend, no enviado por cliente
  @ApiProperty({ description: 'Folio (generado por backend)', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{18}$/, {
    message: 'El folio debe tener exactamente 18 caracteres alfanuméricos',
  })
  folio?: string;

  // Referencia al trabajador canónico (fusión). Asignado por backend, no modificable
  @ApiProperty({
    description: 'ID trabajador canónico (asignado por backend)',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  idTrabajadorCanonico?: string;
}
