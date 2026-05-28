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
  nombre: string | undefined
): string {
  const partes = [primerApellido, segundoApellido, nombre]
    .filter(parte => parte && parte.trim() !== '');
  
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
    trabajador.nombre
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
 * Formatea título profesional + nombre completo del firmante.
 */
export function formatearTituloYNombreFirmante(firmante: {
  tituloProfesional?: string;
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
}): string {
  const titulo = firmante.tituloProfesional?.trim() ?? '';
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
): string {
  if (!firmante?.nombre) {
    const titulo = firmante?.tituloProfesional?.trim() ?? '';
    return `${titulo} ${fallback}`.trim();
  }
  return formatearTituloYNombreFirmante(firmante);
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
    trabajador.segundoApellido
  ].filter(parte => parte && parte.trim() !== '');
  
  return partes.join(' ') || 'Sin nombre';
}
