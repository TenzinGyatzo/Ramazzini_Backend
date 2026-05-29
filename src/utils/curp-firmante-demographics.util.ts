import { CurpDemographicData } from './curp-sires-validation.util';

export interface FirmanteNombreInput {
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  fechaNacimiento?: Date | string;
  sexo?: string;
  entidadNacimiento?: string;
}

/**
 * Construye demografía para cruce CURP A1 a partir de los campos estructurados del firmante.
 * Si no hay primerApellido (registro legacy), solo devuelve nombre sin inventar apellidos.
 */
export function buildCurpDemographicsForFirmante(
  data: FirmanteNombreInput,
): CurpDemographicData {
  const base: CurpDemographicData = {
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
