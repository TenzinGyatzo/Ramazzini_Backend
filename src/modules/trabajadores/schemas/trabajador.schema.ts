import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from 'mongoose';
import { CentroTrabajo } from "src/modules/centros-trabajo/entities/centros-trabajo.entity";
import { User } from "src/modules/users/entities/user.entity";

const sexos = ["Masculino", "Femenino"];

const nivelesEscolaridad = [
  "Primaria",
  "Secundaria",
  "Preparatoria",
  "Diversificado",
  "Licenciatura",
  "Maestría",
  "Doctorado",
  "Nula",
];

const estadosCiviles = [
  "Soltero/a",
  "Casado/a",
  "Unión libre",
  "Separado/a",
  "Divorciado/a",
  "Viudo/a",
];

const estadosLaborales = ["Activo", "Inactivo"];

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

    @Prop({ required: false })
    contactoEmergenciaNombre: string;

    @Prop({ required: false, match: /^$|^\+?[0-9]\d{3,14}$/ })
    contactoEmergenciaTelefono: string;

    @Prop({ required: true, enum: estadosCiviles })
    estadoCivil: string;

    @Prop({ required: false, match: /^$|^[0-9]{1,7}$/, unique: false })
    numeroEmpleado: string;

    @Prop({ required: false, match: /^$|^[A-Za-z0-9\s\-_.\/]{4,30}$/, unique: false })
    nss: string;

    @Prop({ required: false, match: /^$|^[A-Za-z0-9\s\-_.\/#]{4,30}$/, unique: false })
    curp: string;
    
    @Prop({ required: false, default: [] })
    agentesRiesgoActuales: string[];

    @Prop({ required: true, enum: estadosLaborales, default: "Activo" })
    estadoLaboral: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CentroTrabajo', required: true })
    idCentroTrabajo: CentroTrabajo;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    createdBy: User;
  
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    updatedBy: User;

    @Prop({ required: false })
    fechaTransferencia: Date;
}

export const TrabajadorSchema = SchemaFactory.createForClass(Trabajador).set('timestamps', true);
// Índices para conteos y búsquedas comunes
TrabajadorSchema.index({ idCentroTrabajo: 1 });
TrabajadorSchema.index({ idCentroTrabajo: 1, fechaTransferencia: 1, createdAt: 1 });
TrabajadorSchema.index({ numeroEmpleado: 1 });
TrabajadorSchema.index({ estadoLaboral: 1 });