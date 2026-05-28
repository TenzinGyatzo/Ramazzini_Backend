import { parseNombreCompleto } from './parseNombreCompleto';
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
 * Construye demografía para cruce CURP A1 a partir del nombre completo del firmante.
 * Usa parseNombreCompleto (misma heurística que export CEX) cuando no vienen apellidos explícitos.
 */
export function buildCurpDemographicsForFirmante(
  data: FirmanteNombreInput,
): CurpDemographicData {
  const base: CurpDemographicData = {
    fechaNacimiento: data.fechaNacimiento,
    sexo: data.sexo,
    entidadNacimiento: data.entidadNacimiento,
  };

  if (data.primerApellido?.trim() && data.nombre?.trim()) {
    return {
      ...base,
      nombre: data.nombre.trim(),
      primerApellido: data.primerApellido.trim(),
      segundoApellido: data.segundoApellido?.trim() || undefined,
    };
  }

  const nombreCompleto = data.nombre?.trim();
  if (!nombreCompleto) {
    return base;
  }

  const parsed = parseNombreCompleto(nombreCompleto);
  return {
    ...base,
    nombre: parsed.nombrePrestador,
    primerApellido: parsed.primerApellidoPrestador,
    segundoApellido: parsed.segundoApellidoPrestador || undefined,
  };
}
