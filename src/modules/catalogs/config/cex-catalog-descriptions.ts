/**
 * Descripciones de referencia para resolver CATALOG_KEY desde CSV (sin números hardcodeados).
 */
export const CEX_TIPO_PERSONAL_DESCRIPTIONS = {
  medicoGeneral: 'MÉDICA (O) GENERAL',
  medicoEspecialista: 'MÉDICA (O) ESPECIALISTA',
  enfermera: 'ENFERMERA (O)',
} as const;

export const CEX_SERVICIO_ATENCION_DESCRIPCION = 'CONSULTA EXTERNA  GENERAL';

export type CexTipoPersonalRole = keyof typeof CEX_TIPO_PERSONAL_DESCRIPTIONS;
