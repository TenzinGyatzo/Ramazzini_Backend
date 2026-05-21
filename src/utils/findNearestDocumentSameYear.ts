/**
 * Documento con fecha más cercana a la referencia entre los que caen en el mismo año calendario.
 * Si ningún documento tiene fecha válida en ese año, devuelve null (p. ej. alineado con Visualizador de aptitud).
 */
export function findNearestDocumentSameYear<T extends Record<string, unknown>>(
  documents: T[] | null | undefined,
  referenceDate: Date | string,
  dateKey: keyof T & string,
): T | null {
  if (!documents?.length) {
    return null;
  }
  const ref =
    referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  if (isNaN(ref.getTime())) {
    return null;
  }
  const refYear = ref.getFullYear();
  const inYear = documents.filter((d) => {
    const raw = d[dateKey];
    if (raw == null || raw === '') {
      return false;
    }
    const dt = new Date(raw as string | number | Date);
    return !isNaN(dt.getTime()) && dt.getFullYear() === refYear;
  });
  if (inYear.length === 0) {
    return null;
  }
  return inYear.reduce((nearest, current) => {
    const nearestDate = new Date(nearest[dateKey] as string | number | Date);
    const currentDate = new Date(current[dateKey] as string | number | Date);
    const diffN = Math.abs(ref.getTime() - nearestDate.getTime());
    const diffC = Math.abs(ref.getTime() - currentDate.getTime());
    return diffC < diffN ? current : nearest;
  });
}
