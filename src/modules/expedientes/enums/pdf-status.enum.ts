/**
 * Estado de generación del PDF clínico asociado a un documento.
 * Ausente en documentos legacy → el frontend usa HEAD como fallback.
 */
export enum PdfStatus {
  GENERATING = 'generating',
  READY = 'ready',
  FAILED = 'failed',
}
