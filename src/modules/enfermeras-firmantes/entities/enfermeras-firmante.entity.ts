import { Document } from 'mongoose';
import { User } from 'src/modules/users/entities/user.entity';

export class EnfermeraFirmante extends Document {
  _id: string;
  nombre: string;
  primerApellido?: string;
  segundoApellido?: string;
  sexo?: string;
  sexoCURP?: number;
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
  tipoPersonalId?: number;
  entidadNacimiento?: string;
  entidadResidencia?: string;
  municipioResidencia?: string;
  localidadResidencia?: string;
  paisResidencia?: number;
  paisNacimiento: number;
  fechaNacimiento: Date;
}
