import { calculateAge } from './age-calculator.util';

function convertirFechaAAAAAMMDD(fecha: Date): string {
  if (isNaN(fecha.getTime())) {
    throw new Error('La fecha proporcionada no es válida.');
  }

  const dia = String(fecha.getDate()).padStart(2, '0'); // Obtiene el día con dos dígitos
  const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // Los meses empiezan en 0, por eso se suma 1
  const año = fecha.getFullYear(); // Obtiene el año completo

  return `${año}-${mes}-${dia}`;
}

function convertirFechaADDMMAAAA(fecha: Date): string {
  if (isNaN(fecha.getTime())) {
    throw new Error('La fecha proporcionada no es válida.');
  }

  const dia = String(fecha.getUTCDate()).padStart(2, '0'); // Obtiene el día en UTC
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0'); // Mes en UTC
  const año = fecha.getUTCFullYear(); // Año en UTC

  return `${dia}/${mes}/${año}`;
}

function convertirFechaISOaDDMMYYYY(dateString: string): string {
  const fecha = new Date(dateString);

  if (isNaN(fecha.getTime())) {
    throw new Error('La fecha proporcionada no es válida.');
  }

  const dia = String(fecha.getUTCDate()).padStart(2, '0'); // Obtiene el día en UTC
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0'); // Mes en UTC (suma 1 porque empieza en 0)
  const año = fecha.getUTCFullYear(); // Año en UTC

  return `${dia}-${mes}-${año}`;
}

function convertirFechaISOaYYYYMMDD(dateString: string): string {
  if (!dateString) {
    return ''; // Retorna un string vacío si el parámetro es una cadena vacía
  }

  const fecha = new Date(dateString);

  if (isNaN(fecha.getTime())) {
    throw new Error('La fecha proporcionada no es válida.');
  }

  const dia = String(fecha.getUTCDate()).padStart(2, '0'); // Obtiene el día en UTC con dos dígitos
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0'); // Los meses empiezan en 0, por eso se suma 1
  const año = fecha.getUTCFullYear(); // Obtiene el año completo en UTC

  return `${año}-${mes}-${dia}`;
}

function calcularEdad(
  dateString: string,
  fechaReferencia?: Date | string,
): number {
  const fechaNacimiento = new Date(dateString);
  if (isNaN(fechaNacimiento.getTime())) {
    throw new Error('La fecha proporcionada no es válida.');
  }

  const referencia = fechaReferencia
    ? new Date(fechaReferencia)
    : new Date();

  if (isNaN(referencia.getTime())) {
    throw new Error('La fecha de referencia no es válida.');
  }

  return calculateAge(fechaNacimiento, referencia);
}

function calcularAntiguedad(
  dateString: string,
  fechaReferencia?: Date | string,
): string {
  if (!dateString || dateString === '' || dateString === 'No recuerda') {
    return '-';
  }

  const fechaIngreso = new Date(dateString);

  if (isNaN(fechaIngreso.getTime())) {
    return 'Fecha inválida';
  }

  const referencia = fechaReferencia
    ? new Date(fechaReferencia)
    : new Date();

  if (isNaN(referencia.getTime())) {
    return 'Fecha inválida';
  }

  const antiguedadEnMilisegundos =
    referencia.getTime() - fechaIngreso.getTime();
  const dias = Math.floor(antiguedadEnMilisegundos / (1000 * 60 * 60 * 24));

  if (dias < 7) {
    return 'Nuevo Ingreso';
  }

  if (dias <= 28) {
    const semanas = Math.floor(dias / 7);
    return `${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
  }

  const totalMonths =
    (referencia.getFullYear() - fechaIngreso.getFullYear()) * 12 +
    referencia.getMonth() -
    fechaIngreso.getMonth();
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years < 1) {
    const mesText = months === 1 ? 'mes' : 'meses';
    return `${months} ${mesText}`;
  }

  const mesText = months === 1 ? 'mes' : 'meses';
  const yearText = years === 1 ? 'año' : 'años';

  if (months === 0) {
    return `${years} ${yearText}`;
  }

  return `${years} ${yearText}, ${months} ${mesText}`;
}

export {
  convertirFechaADDMMAAAA,
  convertirFechaAAAAAMMDD,
  convertirFechaISOaDDMMYYYY,
  convertirFechaISOaYYYYMMDD,
  calcularEdad,
  calcularAntiguedad,
};
