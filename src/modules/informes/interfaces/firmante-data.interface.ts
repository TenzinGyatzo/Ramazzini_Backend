export interface FirmanteData {
  nombre: string;
  primerApellido?: string;
  segundoApellido?: string;
  tituloProfesional: string;
  numeroCedulaProfesional?: string;
  especialistaSaludTrabajo?: string;
  numeroCedulaEspecialista?: string;
  nombreCredencialAdicional?: string;
  numeroCredencialAdicional?: string;
  firma?: { data: string; contentType: string } | null;
  sexo?: string;
  sexoCURP?: number;
  tipo: 'medico' | 'enfermera' | 'tecnico';
}

export interface FooterFirmantesData {
  elaborador: FirmanteData | null;
  finalizador: FirmanteData | null;
  esDocumentoFinalizado: boolean;
}
