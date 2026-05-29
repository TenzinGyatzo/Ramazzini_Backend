import { Document } from 'mongoose';
import { User } from 'src/modules/users/entities/user.entity';

export class MedicoFirmante extends Document {
  _id: string;
  nombre: string;
  primerApellido?: string;
  segundoApellido?: string;
  tituloProfesional?: string;
  universidad?: string;
  numeroCedulaProfesional?: string;
  especialistaSaludTrabajo?: string;
  numeroCedulaEspecialista?: string;
  nombreCredencialAdicional?: string;
  numeroCredencialAdicional?: string;
  nombreCredencialAdicional2?: string;
  numeroCredencialAdicional2?: string;
  firma?: {
    data: string;
    contentType: string;
  };
  firmaConAntefirma?: {
    data: string;
    contentType: string;
  };
  idUser: User | string;
  curp?: string;
  sexo?: string;
  entidadNacimiento?: string;
  entidadResidencia?: string;
  municipioResidencia?: string;
  localidadResidencia?: string;
  paisNacimiento?: number;
  fechaNacimiento: Date;
}
