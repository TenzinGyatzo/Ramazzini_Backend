import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { CLUES_VALIDATION_REGEX } from 'src/utils/clues-validator.util';

const perfiles = [
  'Médico único de empresa',
  'Médico independiente que brinda servicios a empresas',
  'Empresa de salud ocupacional',
  'Equipo Médico Interno de la Empresa',
  'Otro',
];

interface Logotipo {
  data: string;
  contentType: string;
}

@Schema()
export class ProveedorSalud extends Document {
  @Prop({ required: true })
  nombre: string;
  @Prop({ required: true })
  pais: string;
  @Prop({ required: true, enum: perfiles })
  perfilProveedorSalud: string;
  // NOM-024: CLUES (Clave Única de Establecimiento de Salud)
  // 11 alphanumeric characters, or sentinel 9998 (servicios médicos privados)
  @Prop({
    required: false,
    match: CLUES_VALIDATION_REGEX,
  })
  clues?: string;
  @Prop({
    type: {
      data: { type: String },
      contentType: { type: String },
    },
  })
  logotipoEmpresa: Logotipo;
  @Prop()
  estado: string;
  @Prop()
  municipio: string;
  @Prop()
  codigoPostal: string;
  @Prop()
  direccion: string;
  @Prop()
  telefono: string;
  @Prop()
  correoElectronico: string;
  @Prop()
  sitioWeb: string;
  @Prop({ default: '#343A40' })
  colorInforme: string;
  @Prop({ default: false })
  semaforizacionActivada: boolean;
  @Prop()
  termsAccepted: boolean;
  @Prop()
  acceptedAt: string;
  @Prop()
  termsVersion: string;

  // **Régimen Regulatorio**
  @Prop({
    type: String,
    enum: ['SIRES_NOM024', 'SIN_REGIMEN'],
    required: false, // Opcional para compatibilidad con datos existentes
  })
  regimenRegulatorio?: string;

  // **Metadatos de auditoría para cambio de régimen regulatorio**
  @Prop({ required: false })
  regimenChangedAt?: Date;

  @Prop({ required: false })
  regimenChangedByUserId?: string;

  @Prop({ required: false, maxlength: 500 })
  regimenChangeReason?: string;

  // **Declaración de contexto operativo (solo para régimen SIN_REGIMEN)**
  @Prop({ required: false })
  declaracionAceptada?: boolean;

  @Prop({ required: false })
  declaracionAceptadaAt?: Date;

  @Prop({ required: false })
  declaracionVersion?: string; // Similar a termsVersion

  // **Información de periodo de prueba y límites**
  @Prop({ default: new Date() })
  fechaInicioTrial: Date; // Fecha de inicio de los 15 días de prueba

  @Prop({ default: false })
  periodoDePruebaFinalizado: boolean; // Indica si han pasado los 15 días de prueba

  @Prop({ default: 25 })
  maxHistoriasPermitidasAlMes: number; // Inicialmente 15 para periodo de prueba

  // **Add-ons dinámicos**
  @Prop({
    type: [
      {
        tipo: { type: String }, // 'usuario_adicional', 'empresas_extra'
        cantidad: { type: Number, default: 0 }, // Cantidad de add-ons adquiridos
      },
    ],
    default: [],
  })
  addOns: { tipo: string; cantidad: number }[];

  @Prop()
  suscripcionActiva: string; // id de la suscripcion con estado 'authorized'

  @Prop()
  estadoSuscripcion: string; // 'inactive', 'authorized', 'cancelled'

  @Prop()
  finDeSuscripcion: Date; // Fecha hasta la cual el usuario mantiene acceso tras cancelar

  // **Configuración de reglas de puntaje para productividad**
  @Prop({
    type: {
      aptitudes: { type: Number, default: 3 },
      historias: { type: Number, default: 1 },
      exploraciones: { type: Number, default: 1 },
      examenesVista: { type: Number, default: 1 },
      audiometrias: { type: Number, default: 1 },
      antidopings: { type: Number, default: 1 },
      notas: { type: Number, default: 2 },
      externos: { type: Number, default: 0 },
    },
    default: {
      aptitudes: 3,
      historias: 1,
      exploraciones: 1,
      examenesVista: 1,
      audiometrias: 1,
      antidopings: 1,
      notas: 2,
      externos: 0,
    },
  })
  reglasPuntaje: {
    aptitudes: number;
    historias: number;
    exploraciones: number;
    examenesVista: number;
    audiometrias: number;
    antidopings: number;
    notas: number;
    externos: number;
  };
}

export const ProveedorSaludSchema =
  SchemaFactory.createForClass(ProveedorSalud);
