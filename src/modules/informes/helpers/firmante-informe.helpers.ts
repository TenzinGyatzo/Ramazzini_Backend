import {
  EnfermeraFirmanteInforme,
  FirmanteActivoInforme,
  MedicoFirmanteInforme,
  TecnicoFirmanteInforme,
} from '../types/firmante-informe.types';

export function resolverFirmanteActivo(
  medico: MedicoFirmanteInforme | null,
  enfermera?: EnfermeraFirmanteInforme | null,
  tecnico?: TecnicoFirmanteInforme | null,
): {
  firmanteActivo: FirmanteActivoInforme | null;
  usarMedico: boolean;
  usarEnfermera: boolean;
  usarTecnico: boolean;
} {
  const usarMedico = !!medico?.nombre;
  const usarEnfermera = !usarMedico && !!enfermera?.nombre;
  const usarTecnico = !usarMedico && !usarEnfermera && !!tecnico?.nombre;

  const firmanteActivo = usarMedico
    ? medico
    : usarEnfermera
      ? enfermera ?? null
      : usarTecnico
        ? tecnico ?? null
        : null;

  return { firmanteActivo, usarMedico, usarEnfermera, usarTecnico };
}

export function resolverFirmanteMedicoEnfermera(
  medico: MedicoFirmanteInforme | null,
  enfermera?: EnfermeraFirmanteInforme | null,
): {
  firmanteActivo: MedicoFirmanteInforme | EnfermeraFirmanteInforme | null;
  usarMedico: boolean;
  usarEnfermera: boolean;
} {
  const usarMedico = !!medico?.nombre;
  const usarEnfermera = !usarMedico && !!enfermera?.nombre;

  const firmanteActivo = usarMedico
    ? medico
    : usarEnfermera
      ? enfermera ?? null
      : null;

  return { firmanteActivo, usarMedico, usarEnfermera };
}

export function firmanteTieneLineaNombre(
  firmante: FirmanteActivoInforme | null,
): boolean {
  return !!(firmante?.tituloProfesional && firmante?.nombre);
}
