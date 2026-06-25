/**
 * Texto y versión del consentimiento para tratamiento de información en SIRES.
 * Incrementar version al actualizar el texto legal para exigir re-aceptación.
 */
export const CONSENTIMIENTO_TRATAMIENTO_INFORMACION_SIRES = {
  version: 'v1',
  literal: `Antes de iniciar su atención médica, le informo lo siguiente:

La información personal y de salud que usted proporcione será registrada y resguardada en un Expediente Clínico Electrónico dentro del Sistema de Información para Registros Electrónicos en Salud (SIRES).

Esta información será utilizada únicamente para fines médicos, administrativos, operativos y de cumplimiento normativo relacionados con la prestación de los servicios de salud ocupacional, y su acceso estará limitado al personal autorizado.

¿Autoriza el registro y tratamiento de su información en los términos descritos?`,
  declaracionProfesional:
    'Declaro que informé al trabajador el contenido anterior y que éste otorgó su consentimiento para el registro y tratamiento de su información.',
};

export const TIPO_CONSENTIMIENTO_TRATAMIENTO =
  'TRATAMIENTO_INFORMACION_SIRES' as const;

export type TipoConsentimientoTratamiento =
  typeof TIPO_CONSENTIMIENTO_TRATAMIENTO;
