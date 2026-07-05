export type DuplicateMatchCriterio = 'CURP' | 'FOLIO';

export interface DuplicateWorkerSummary {
  _id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido?: string;
  curp?: string;
  folio?: string;
  numeroEmpleado?: string;
  sexo?: string;
  fechaNacimiento?: string;
  puesto?: string;
  fechaIngreso?: string;
  idCentroTrabajo: string;
  nombreCentroTrabajo?: string;
  createdAt?: Date;
}

export interface DuplicateMatch {
  trabajadorId: string;
  criterio: DuplicateMatchCriterio;
  trabajador: DuplicateWorkerSummary;
  alertId?: string;
}

export interface FusionResultadoClinicoSummary {
  _id: string;
  tipoEstudio: string;
  fechaEstudio: string;
  resultadoGlobal?: string;
}

export interface FusionRiesgoTrabajoSummary {
  _id: string;
  fechaRiesgo: string;
  tipoRiesgo?: string;
  naturalezaLesion?: string;
  parteCuerpoAfectada?: string;
}

export interface CreateTrabajadorResult {
  trabajador: any;
  posibleDuplicado: DuplicateMatch | null;
}

export interface TransferirTrabajadorResult {
  trabajador: any;
  posibleDuplicado: DuplicateMatch | null;
}
