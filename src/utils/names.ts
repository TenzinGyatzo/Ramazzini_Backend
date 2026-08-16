/**
 * Utilidades para el manejo y formateo de nombres
 */

/**
 * Formatea el nombre completo de un trabajador concatenando primer apellido,
 * segundo apellido y nombre, filtrando valores undefined o vacíos
 * @param primerApellido - Primer apellido del trabajador
 * @param segundoApellido - Segundo apellido del trabajador (opcional)
 * @param nombre - Nombre del trabajador
 * @returns Nombre completo formateado o 'Sin nombre' si no hay datos válidos
 */
export function formatearNombreCompleto(
  primerApellido: string | undefined,
  segundoApellido: string | undefined,
  nombre: string | undefined,
): string {
  const partes = [primerApellido, segundoApellido, nombre].filter(
    (parte) => parte && parte.trim() !== '',
  );

  return partes.join(' ') || 'Sin nombre';
}

/**
 * Formatea el nombre completo de un trabajador usando un objeto Trabajador
 * @param trabajador - Objeto con las propiedades del trabajador
 * @returns Nombre completo formateado o 'Sin nombre' si no hay datos válidos
 */
export function formatearNombreTrabajador(trabajador: {
  primerApellido: string | undefined;
  segundoApellido: string | undefined;
  nombre: string | undefined;
}): string {
  return formatearNombreCompleto(
    trabajador.primerApellido,
    trabajador.segundoApellido,
    trabajador.nombre,
  );
}

/**
 * Formatea el nombre completo de un firmante (médico, enfermera o técnico).
 * Si no hay primerApellido (registro legacy), devuelve solo nombre.
 */
export function formatearNombreFirmante(firmante: {
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
}): string {
  const nombre = firmante.nombre?.trim() ?? '';
  const primerApellido = firmante.primerApellido?.trim() ?? '';
  const segundoApellido = firmante.segundoApellido?.trim() ?? '';

  if (!primerApellido) {
    return nombre || 'Sin nombre';
  }

  const partes = [nombre, primerApellido, segundoApellido].filter(
    (parte) => parte !== '',
  );

  return partes.join(' ') || 'Sin nombre';
}

/**
 * Sanitiza el nombre de un firmante para usarlo como parte de un filename.
 */
export function sanitizarNombreFirmanteParaArchivo(firmante: {
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
}): string {
  return formatearNombreFirmante(firmante)
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-]/g, '')
    .toLowerCase();
}

/**
 * Régimen regulatorio usado solo para formato de presentación (no persistencia).
 */
export type RegimenRegulatorioDisplay =
  | 'SIRES_NOM024'
  | 'SIN_REGIMEN'
  | 'NO_SUJETO_SIRES'
  | string
  | null
  | undefined;

/**
 * Formatea el título profesional para visualización.
 * En SIRES_NOM024 se muestra en mayúsculas; el valor canónico en BD no cambia.
 */
export function formatearTituloProfesional(
  titulo?: string | null,
  regimen?: RegimenRegulatorioDisplay,
): string {
  const trimmed = titulo?.trim() ?? '';
  if (!trimmed) return '';
  if (regimen === 'SIRES_NOM024') {
    return trimmed.toLocaleUpperCase('es-MX');
  }
  return trimmed;
}

/**
 * Formatea título profesional + nombre completo del firmante.
 */
export function formatearTituloYNombreFirmante(
  firmante: {
    tituloProfesional?: string;
    nombre?: string;
    primerApellido?: string;
    segundoApellido?: string;
  },
  regimen?: RegimenRegulatorioDisplay,
): string {
  const titulo = formatearTituloProfesional(
    firmante.tituloProfesional,
    regimen,
  );
  const nombre = formatearNombreFirmante(firmante);
  return `${titulo} ${nombre}`.trim();
}

/**
 * Formatea título + nombre con fallback cuando no hay nombre configurado.
 */
export function formatearTituloYNombreFirmanteConFallback(
  firmante: {
    tituloProfesional?: string;
    nombre?: string;
    primerApellido?: string;
    segundoApellido?: string;
  } | null,
  fallback: string,
  regimen?: RegimenRegulatorioDisplay,
): string {
  if (!firmante?.nombre) {
    const titulo = formatearTituloProfesional(
      firmante?.tituloProfesional,
      regimen,
    );
    return `${titulo} ${fallback}`.trim();
  }
  return formatearTituloYNombreFirmante(firmante, regimen);
}

/**
 * Formatea el nombre completo de un trabajador en el orden: nombre + primer apellido + segundo apellido
 * @param trabajador - Objeto con las propiedades del trabajador
 * @returns Nombre completo formateado o 'Sin nombre' si no hay datos válidos
 */
export function formatearNombreTrabajadorCertificado(trabajador: {
  primerApellido: string | undefined;
  segundoApellido: string | undefined;
  nombre: string | undefined;
}): string {
  const partes = [
    trabajador.nombre,
    trabajador.primerApellido,
    trabajador.segundoApellido,
  ].filter((parte) => parte && parte.trim() !== '');

  return partes.join(' ') || 'Sin nombre';
}
