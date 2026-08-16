export type BorradorPendienteNivelUrgencia = 'info' | 'warning' | 'critical';

export interface BorradorPendienteElaborador {
  id: string;
  username: string;
}

export interface BorradorPendienteItem {
  id: string;
  idTrabajador: string;
  idCentroTrabajo: string;
  idEmpresa: string;
  trabajadorNombre: string;
  fechaNotaMedica: string;
  createdAt: string;
  updatedAt: string;
  diasEnBorrador: number;
  diasSinEdicion: number;
  nivelUrgencia: BorradorPendienteNivelUrgencia;
  mensajeContextual: string;
  elaborador?: BorradorPendienteElaborador;
}

export interface BorradoresPendientesResumen {
  totalPropios: number;
  totalEquipo: number;
  nivelMaximo: BorradorPendienteNivelUrgencia;
}

export interface BorradoresPendientesResponse {
  propios: BorradorPendienteItem[];
  equipo: BorradorPendienteItem[];
  resumen: BorradoresPendientesResumen;
}
