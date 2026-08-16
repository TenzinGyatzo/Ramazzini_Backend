import { DocumentoEstado } from 'src/modules/expedientes/enums/documento-estado.enum';
import {
  FichaSnapshot,
  FirmanteSnapshot,
} from 'src/modules/expedientes/schemas/ficha-snapshot.schema';
import {
  EnfermeraFirmanteInforme,
  MedicoFirmanteInforme,
  TecnicoFirmanteInforme,
} from '../types/firmante-informe.types';
import { FirmanteData, FooterFirmantesData } from '../interfaces/firmante-data.interface';

export function hasFichaTrabajadorSnapshot(
  snapshot?: FichaSnapshot | null,
): snapshot is FichaSnapshot {
  return !!snapshot?.trabajador;
}

export function pickTrabajadorForInforme<T extends object>(
  snapshot: FichaSnapshot | null | undefined,
  trabajadorLive: T,
): T | FichaSnapshot['trabajador'] {
  return snapshot?.trabajador ?? trabajadorLive;
}

export function pickNombreEmpresa(
  snapshot: FichaSnapshot | null | undefined,
  nombreLive: string,
): string {
  const snapNombre = snapshot?.empresa?.nombreComercial?.trim();
  return snapNombre || nombreLive;
}

export function hasFirmantesSnapshot(
  snapshot?: FichaSnapshot | null,
): boolean {
  return !!(
    snapshot?.firmantes?.elaborador || snapshot?.firmantes?.finalizador
  );
}

const emptyMedico = (): MedicoFirmanteInforme => ({
  nombre: '',
  primerApellido: '',
  segundoApellido: '',
  tituloProfesional: '',
  universidad: '',
  numeroCedulaProfesional: '',
  especialistaSaludTrabajo: '',
  numeroCedulaEspecialista: '',
  nombreCredencialAdicional: '',
  numeroCredencialAdicional: '',
  nombreCredencialAdicional2: '',
  numeroCredencialAdicional2: '',
  firma: null,
});

const emptyEnfermera = (): EnfermeraFirmanteInforme => ({
  nombre: '',
  primerApellido: '',
  segundoApellido: '',
  sexo: '',
  tituloProfesional: '',
  numeroCedulaProfesional: '',
  nombreCredencialAdicional: '',
  numeroCredencialAdicional: '',
  firma: null,
});

const emptyTecnico = (): TecnicoFirmanteInforme => ({
  nombre: '',
  primerApellido: '',
  segundoApellido: '',
  sexo: '',
  tituloProfesional: '',
  numeroCedulaProfesional: '',
  nombreCredencialAdicional: '',
  numeroCredencialAdicional: '',
  firma: null,
});

export function mapFirmanteSnapshotToRoles(firmante?: FirmanteSnapshot | null): {
  datosMedicoFirmante: MedicoFirmanteInforme;
  datosEnfermeraFirmante: EnfermeraFirmanteInforme;
  datosTecnicoFirmante: TecnicoFirmanteInforme;
} {
  const datosMedicoFirmante = emptyMedico();
  const datosEnfermeraFirmante = emptyEnfermera();
  const datosTecnicoFirmante = emptyTecnico();

  if (!firmante?.nombre) {
    return {
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
    };
  }

  if (firmante.tipo === 'medico') {
    return {
      datosMedicoFirmante: {
        nombre: firmante.nombre || '',
        primerApellido: firmante.primerApellido || '',
        segundoApellido: firmante.segundoApellido || '',
        tituloProfesional: firmante.tituloProfesional || '',
        universidad: firmante.universidad || '',
        numeroCedulaProfesional: firmante.numeroCedulaProfesional || '',
        especialistaSaludTrabajo: firmante.especialistaSaludTrabajo || '',
        numeroCedulaEspecialista: firmante.numeroCedulaEspecialista || '',
        nombreCredencialAdicional: firmante.nombreCredencialAdicional || '',
        numeroCredencialAdicional: firmante.numeroCredencialAdicional || '',
        nombreCredencialAdicional2: firmante.nombreCredencialAdicional2 || '',
        numeroCredencialAdicional2: firmante.numeroCredencialAdicional2 || '',
        firma: firmante.firma || null,
      },
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
    };
  }

  if (firmante.tipo === 'enfermera') {
    return {
      datosMedicoFirmante,
      datosEnfermeraFirmante: {
        nombre: firmante.nombre || '',
        primerApellido: firmante.primerApellido || '',
        segundoApellido: firmante.segundoApellido || '',
        sexo: firmante.sexo || '',
        sexoCURP: firmante.sexoCURP,
        tituloProfesional: firmante.tituloProfesional || '',
        numeroCedulaProfesional: firmante.numeroCedulaProfesional || '',
        nombreCredencialAdicional: firmante.nombreCredencialAdicional || '',
        numeroCredencialAdicional: firmante.numeroCredencialAdicional || '',
        firma: firmante.firma || null,
      },
      datosTecnicoFirmante,
    };
  }

  return {
    datosMedicoFirmante,
    datosEnfermeraFirmante,
    datosTecnicoFirmante: {
      nombre: firmante.nombre || '',
      primerApellido: firmante.primerApellido || '',
      segundoApellido: firmante.segundoApellido || '',
      sexo: firmante.sexo || '',
      sexoCURP: firmante.sexoCURP,
      tituloProfesional: firmante.tituloProfesional || '',
      numeroCedulaProfesional: firmante.numeroCedulaProfesional || '',
      nombreCredencialAdicional: firmante.nombreCredencialAdicional || '',
      numeroCredencialAdicional: firmante.numeroCredencialAdicional || '',
      firma: firmante.firma || null,
    },
  };
}

export function toFirmanteData(
  firmante?: FirmanteSnapshot | null,
): FirmanteData | null {
  if (!firmante?.nombre || !firmante.tipo) {
    return null;
  }
  return {
    nombre: firmante.nombre || '',
    primerApellido: firmante.primerApellido,
    segundoApellido: firmante.segundoApellido,
    tituloProfesional: firmante.tituloProfesional || '',
    numeroCedulaProfesional: firmante.numeroCedulaProfesional,
    especialistaSaludTrabajo: firmante.especialistaSaludTrabajo,
    numeroCedulaEspecialista: firmante.numeroCedulaEspecialista,
    nombreCredencialAdicional: firmante.nombreCredencialAdicional,
    numeroCredencialAdicional: firmante.numeroCredencialAdicional,
    firma: firmante.firma || null,
    sexo: firmante.sexo,
    sexoCURP: firmante.sexoCURP,
    tipo: firmante.tipo,
  };
}

export function resolveFooterFromSnapshot(
  snapshot: FichaSnapshot,
  estado?: string,
  footerOverride?: FooterFirmantesData,
): FooterFirmantesData | undefined {
  if (footerOverride) {
    return footerOverride;
  }

  const elaborador = toFirmanteData(snapshot.firmantes?.elaborador);
  const finalizador = toFirmanteData(snapshot.firmantes?.finalizador);
  const esFinalizado =
    estado === DocumentoEstado.FINALIZADO || estado === DocumentoEstado.ANULADO;

  if (
    esFinalizado &&
    elaborador &&
    finalizador &&
    !mismosFirmantes(elaborador, finalizador)
  ) {
    return {
      elaborador,
      finalizador,
      esDocumentoFinalizado: true,
    };
  }

  return undefined;
}

function mismosFirmantes(a: FirmanteData, b: FirmanteData): boolean {
  return (
    a.nombre === b.nombre &&
    a.primerApellido === b.primerApellido &&
    a.segundoApellido === b.segundoApellido &&
    a.numeroCedulaProfesional === b.numeroCedulaProfesional &&
    a.tipo === b.tipo
  );
}

export function pickFirmanteActivoSnapshot(
  snapshot: FichaSnapshot,
  estado?: string,
): FirmanteSnapshot | null {
  const esFinalizado =
    estado === DocumentoEstado.FINALIZADO || estado === DocumentoEstado.ANULADO;
  if (esFinalizado) {
    return snapshot.firmantes?.finalizador || snapshot.firmantes?.elaborador || null;
  }
  return snapshot.firmantes?.elaborador || snapshot.firmantes?.finalizador || null;
}
