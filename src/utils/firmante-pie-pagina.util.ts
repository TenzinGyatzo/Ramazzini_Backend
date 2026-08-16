import {
  isTrabajadorSexoCurp,
} from '../modules/trabajadores/constants/trabajador-sexo-curp.constants';
import { normalizeSexoCurpInput } from './sexo-curp.util';

export interface FirmanteSexoPieInput {
  sexo?: string;
  sexoCURP?: number;
}

export function hasFirmanteSexoForPie(
  input?: FirmanteSexoPieInput | null,
): boolean {
  if (!input) return false;
  return (
    isTrabajadorSexoCurp(normalizeSexoCurpInput(input.sexoCURP)) ||
    Boolean(input.sexo?.trim())
  );
}

export function resolveEnfermeraPiePaginaText(
  input?: FirmanteSexoPieInput | null,
  rolePhrase = 'de la evaluación',
): string | null {
  if (!hasFirmanteSexoForPie(input)) return null;

  const sexoCURP = normalizeSexoCurpInput(input?.sexoCURP);
  if (isTrabajadorSexoCurp(sexoCURP)) {
    if (sexoCURP === 2) return `Enfermera responsable ${rolePhrase}\n`;
    if (sexoCURP === 3) return `Enfermera/o responsable ${rolePhrase}\n`;
    return `Enfermero responsable ${rolePhrase}\n`;
  }

  return input!.sexo === 'Femenino'
    ? `Enfermera responsable ${rolePhrase}\n`
    : `Enfermero responsable ${rolePhrase}\n`;
}

export function resolveTecnicoPiePaginaText(
  input?: FirmanteSexoPieInput | null,
): string | null {
  if (!hasFirmanteSexoForPie(input)) return null;
  return 'Responsable de la evaluación\n';
}

export function buildEnfermeraPiePaginaPdfBlock(
  enfermeraFirmante: FirmanteSexoPieInput | null | undefined,
  rolePhrase: string,
): { text: string; bold: false } | null {
  const text = resolveEnfermeraPiePaginaText(enfermeraFirmante, rolePhrase);
  return text ? { text, bold: false } : null;
}

export function buildTecnicoPiePaginaPdfBlock(
  tecnicoFirmante: FirmanteSexoPieInput | null | undefined,
): { text: string; bold: false } | null {
  const text = resolveTecnicoPiePaginaText(tecnicoFirmante);
  return text ? { text, bold: false } : null;
}
