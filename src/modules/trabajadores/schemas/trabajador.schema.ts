import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { CentroTrabajo } from 'src/modules/centros-trabajo/entities/centros-trabajo.entity';
import { User } from 'src/modules/users/entities/user.entity';

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

@Schema()
export class Trabajador extends Document {
  @Prop({ required: true })
  primerApellido: string;

  @Prop({ required: false })
  segundoApellido: string;

  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  fechaNacimiento: Date;

  @Prop({ required: true, enum: sexos })
  sexo: string;

  @Prop({ required: true, enum: nivelesEscolaridad })
  escolaridad: string;

  @Prop({ required: true })
  puesto: string;

  @Prop({ required: false })
  fechaIngreso: Date;

  @Prop({ required: false, match: /^$|^\+?[0-9]\d{3,14}$/ })
  telefono: string;

  @Prop({ required: true, enum: estadosCiviles })
  estadoCivil: string;

  @Prop({ required: false, match: /^$|^[0-9]{1,7}$/, unique: false })
  numeroEmpleado: string;

  @Prop({
    required: false,
    match: /^$|^[A-Za-z0-9\s\-_.\/]{4,30}$/,
    unique: false,
  })
  nss: string;

  @Prop({
    required: false,
    // RENAPO format: [A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d (18 chars, uppercase)
    // Also allows generic CURP: XXXX999999XXXXXX99 (for unknown/foreign patients)
    // Allow empty string for non-MX providers, but enforce strict format when provided
    match: /^$|^([A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d|XXXX999999XXXXXX99)$/,
    unique: false,
  })
  curp: string;

  // NOM-024 Person Identification Fields
  // Entidad de nacimiento (INEGI state code, 2 chars): 01-32, NE (Extranjero), 00 (No disponible)
  @Prop({
    required: false,
    match: /^$|^(0[1-9]|[12][0-9]|3[0-2]|NE|00)$/,
  })
  entidadNacimiento?: string;

  // Nacionalidad (RENAPO nationality code, 3 chars): e.g., MEX, USA, NND (No disponible)
  @Prop({
    required: false,
    match: /^$|^[A-Z]{3}$/,
  })
  nacionalidad?: string;

  // Entidad de residencia (INEGI state code, 2 chars): 01-32, NE (Extranjero), 00 (No disponible)
  @Prop({
    required: false,
    match: /^$|^(0[1-9]|[12][0-9]|3[0-2]|NE|00)$/,
  })
  entidadResidencia?: string;

  // Municipio de residencia (INEGI municipality code, 3 chars): 001-999
  @Prop({
    required: false,
    match: /^$|^[0-9]{3}$/,
  })
  municipioResidencia?: string;

  // Localidad de residencia (INEGI locality code, 4 chars): 0001-9999
  @Prop({
    required: false,
    match: /^$|^[0-9]{4}$/,
  })
  localidadResidencia?: string;

  @Prop({ required: false, default: [] })
  agentesRiesgoActuales: string[];

  @Prop({ required: true, enum: estadosLaborales, default: 'Activo' })
  estadoLaboral: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'CentroTrabajo',
    required: true,
  })
  idCentroTrabajo: CentroTrabajo;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: User;

  @Prop({ required: false })
  fechaTransferencia: Date;

  // NOM-024-SSA3-2012: Folio alfanumérico de 18 caracteres (Identificador en la UM)
  // Generado por backend al crear. Null para trabajadores existentes (no retroactivo)
  @Prop({
    required: false,
    match: /^[A-Za-z0-9]{18}$/,
  })
  folio?: string;

  // Referencia al trabajador canónico cuando este registro es duplicado (fusión)
  // El expediente se asocia al canónico; acceso desde cualquier registro del grupo muestra lo mismo
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Trabajador',
    required: false,
  })
  idTrabajadorCanonico?: MongooseSchema.Types.ObjectId;
}

export const TrabajadorSchema = SchemaFactory.createForClass(Trabajador).set(
  'timestamps',
  true,
);
// Índices para conteos y búsquedas comunes
TrabajadorSchema.index({ idCentroTrabajo: 1 });
TrabajadorSchema.index({ numeroEmpleado: 1 });
TrabajadorSchema.index({ estadoLaboral: 1 });
TrabajadorSchema.index({ folio: 1 });
