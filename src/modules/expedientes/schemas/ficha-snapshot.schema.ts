import { Schema } from 'mongoose';

const FirmaSnapshotSchema = new Schema(
  {
    data: { type: String },
    contentType: { type: String },
  },
  { _id: false },
);

export const FirmanteSnapshotSchema = new Schema(
  {
    nombre: { type: String, default: '' },
    primerApellido: { type: String },
    segundoApellido: { type: String },
    tituloProfesional: { type: String, default: '' },
    numeroCedulaProfesional: { type: String },
    especialistaSaludTrabajo: { type: String },
    numeroCedulaEspecialista: { type: String },
    nombreCredencialAdicional: { type: String },
    numeroCredencialAdicional: { type: String },
    nombreCredencialAdicional2: { type: String },
    numeroCredencialAdicional2: { type: String },
    universidad: { type: String },
    firma: { type: FirmaSnapshotSchema, default: null },
    sexo: { type: String },
    sexoCURP: { type: Number },
    tipo: { type: String, enum: ['medico', 'enfermera', 'tecnico'] },
  },
  { _id: false },
);

const TrabajadorSnapshotSchema = new Schema(
  {
    nombre: { type: String, default: '' },
    primerApellido: { type: String, default: '' },
    segundoApellido: { type: String, default: '' },
    puesto: { type: String, default: '' },
    escolaridad: { type: String, default: '' },
    sexo: { type: String, default: '' },
    estadoCivil: { type: String, default: '' },
    telefono: { type: String, default: '' },
    numeroEmpleado: { type: String },
    nss: { type: String },
    curp: { type: String },
    fechaNacimiento: { type: Date },
    fechaIngreso: { type: Date },
    contactoEmergenciaNombre: { type: String },
    contactoEmergenciaTelefono: { type: String },
  },
  { _id: false },
);

const EmpresaSnapshotSchema = new Schema(
  {
    nombreComercial: { type: String, default: '' },
  },
  { _id: false },
);

export const FichaSnapshotSchema = new Schema(
  {
    trabajador: { type: TrabajadorSnapshotSchema },
    empresa: { type: EmpresaSnapshotSchema },
    firmantes: {
      elaborador: { type: FirmanteSnapshotSchema, default: null },
      finalizador: { type: FirmanteSnapshotSchema, default: null },
    },
    capturadoEn: { type: Date },
  },
  { _id: false },
);

export type FirmanteSnapshotTipo = 'medico' | 'enfermera' | 'tecnico';

export interface FirmaSnapshot {
  data: string;
  contentType: string;
}

export interface FirmanteSnapshot {
  nombre: string;
  primerApellido?: string;
  segundoApellido?: string;
  tituloProfesional: string;
  numeroCedulaProfesional?: string;
  especialistaSaludTrabajo?: string;
  numeroCedulaEspecialista?: string;
  nombreCredencialAdicional?: string;
  numeroCredencialAdicional?: string;
  nombreCredencialAdicional2?: string;
  numeroCredencialAdicional2?: string;
  universidad?: string;
  firma?: FirmaSnapshot | null;
  sexo?: string;
  sexoCURP?: number;
  tipo: FirmanteSnapshotTipo;
}

export interface TrabajadorFichaSnapshot {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  puesto: string;
  escolaridad: string;
  sexo: string;
  estadoCivil: string;
  telefono: string;
  numeroEmpleado?: string;
  nss?: string;
  curp?: string;
  fechaNacimiento?: Date;
  fechaIngreso?: Date | null;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
}

export interface EmpresaFichaSnapshot {
  nombreComercial: string;
}

export interface FichaSnapshot {
  trabajador: TrabajadorFichaSnapshot;
  empresa: EmpresaFichaSnapshot;
  firmantes: {
    elaborador: FirmanteSnapshot | null;
    finalizador: FirmanteSnapshot | null;
  };
  capturadoEn: Date;
}
