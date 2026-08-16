import { CurpDemographicData } from './curp-sires-validation.util';
import {
  isTrabajadorSexoCurp,
  type TrabajadorSexoCurp,
} from '../modules/trabajadores/constants/trabajador-sexo-curp.constants';
import { normalizeSexoCurpInput } from './sexo-curp.util';

export interface FirmanteNombreInput {
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  fechaNacimiento?: Date | string;
  sexo?: string;
  sexoCURP?: TrabajadorSexoCurp | number;
  entidadNacimiento?: string;
}

export interface BuildCurpDemographicsForFirmanteOptions {
  /** true en SIRES_NOM024: pos. 11 usa sexoCURP */
  useSexoCurpForValidation?: boolean;
}

/**
 * Construye demografía para cruce CURP A1 a partir de los campos estructurados del firmante.
 * Si no hay primerApellido (registro legacy), solo devuelve nombre sin inventar apellidos.
 */
export function buildCurpDemographicsForFirmante(
  data: FirmanteNombreInput,
  options?: BuildCurpDemographicsForFirmanteOptions,
): CurpDemographicData {
  const useSexoCurp = options?.useSexoCurpForValidation === true;
  const sexoCURP = normalizeSexoCurpInput(data.sexoCURP) ?? undefined;

  const base: CurpDemographicData = useSexoCurp
    ? {
        fechaNacimiento: data.fechaNacimiento,
        sexoCURP,
        entidadNacimiento: data.entidadNacimiento,
      }
    : {
        fechaNacimiento: data.fechaNacimiento,
        sexo: data.sexo,
        entidadNacimiento: data.entidadNacimiento,
      };

  const nombre = data.nombre?.trim();
  const primerApellido = data.primerApellido?.trim();

  if (nombre && primerApellido) {
    return {
      ...base,
      nombre,
      primerApellido,
      segundoApellido: data.segundoApellido?.trim() || undefined,
    };
  }

  if (nombre) {
    return {
      ...base,
      nombre,
    };
  }

  return base;
}

export function firmanteHasSexoForCurp(
  data: FirmanteNombreInput,
  useSexoCurpForValidation: boolean,
): boolean {
  if (useSexoCurpForValidation) {
    return isTrabajadorSexoCurp(normalizeSexoCurpInput(data.sexoCURP));
  }
  return Boolean(data.sexo?.trim());
}
