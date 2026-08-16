export interface FirmaInforme {
  data: string;
  contentType: string;
}

export interface FirmanteNombreInforme {
  nombre: string;
  primerApellido?: string;
  segundoApellido?: string;
}

export interface MedicoFirmanteInforme extends FirmanteNombreInforme {
  tituloProfesional: string;
  universidad?: string;
  numeroCedulaProfesional: string;
  especialistaSaludTrabajo: string;
  numeroCedulaEspecialista: string;
  nombreCredencialAdicional: string;
  numeroCredencialAdicional: string;
  nombreCredencialAdicional2?: string;
  numeroCredencialAdicional2?: string;
  firma: FirmaInforme | null;
}

export interface EnfermeraFirmanteInforme extends FirmanteNombreInforme {
  sexo: string;
  sexoCURP?: number;
  tituloProfesional: string;
  numeroCedulaProfesional: string;
  nombreCredencialAdicional: string;
  numeroCredencialAdicional: string;
  firma: FirmaInforme | null;
}

export interface TecnicoFirmanteInforme extends FirmanteNombreInforme {
  sexo: string;
  sexoCURP?: number;
  tituloProfesional: string;
  numeroCedulaProfesional: string;
  nombreCredencialAdicional: string;
  numeroCredencialAdicional: string;
  firma: FirmaInforme | null;
}

export type FirmanteActivoInforme =
  | MedicoFirmanteInforme
  | EnfermeraFirmanteInforme
  | TecnicoFirmanteInforme;
