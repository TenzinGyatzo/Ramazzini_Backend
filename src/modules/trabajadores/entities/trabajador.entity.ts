import { Document } from 'mongoose';
import { CentroTrabajo } from 'src/modules/centros-trabajo/entities/centros-trabajo.entity';
import { User } from 'src/modules/users/entities/user.entity';

export class Trabajador extends Document {
  _id: string;
  primerApellido?: string;
  segundoApellido?: string;
  nombre: string;
  fechaNacimiento: Date;
  sexo: string;
  sexoCURP?: number;
  escolaridad: string;
  puesto: string;
  fechaIngreso?: Date;
  telefono: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  estadoCivil: string;
  numeroEmpleado: string;
  nss: string;
  curp: string;
  entidadNacimiento?: string;
  paisNacimiento?: number;
  entidadResidencia?: string;
  municipioResidencia?: string;
  localidadResidencia?: string;
  paisResidencia?: number;
  agentesRiesgoActuales: string;
  estadoLaboral: string;
  idCentroTrabajo: CentroTrabajo | string;
  createdBy: User | string;
  updatedBy: User | string;
  fechaTransferencia?: Date;
}
