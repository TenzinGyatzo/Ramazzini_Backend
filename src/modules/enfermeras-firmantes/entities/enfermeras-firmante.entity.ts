import { Document } from 'mongoose';
import { User } from 'src/modules/users/entities/user.entity';

export class EnfermeraFirmante extends Document {
  _id: string;
  nombre: string;
  sexo?: string;
  tituloProfesional?: string;
  numeroCedulaProfesional?: string;
  nombreCredencialAdicional?: string;
  numeroCredencialAdicional?: string;
  firma?: {
    data: string;
    contentType: string;
  };
  idUser: User | string;
  curp?: string;
  entidadNacimiento?: string;
  paisNacimiento: number;
  fechaNacimiento: Date;
}
