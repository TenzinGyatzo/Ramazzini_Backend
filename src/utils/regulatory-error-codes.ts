/**
 * Regulatory Error Codes
 *
 * Códigos estándar para errores relacionados con políticas regulatorias.
 * Estos códigos permiten al frontend mapear errores a mensajes UX apropiados según el régimen.
 *
 * @see docs/regulatory-policy.md para más información sobre el sistema regulatorio
 */

export enum RegulatoryErrorCode {
  /**
   * Feature deshabilitada por régimen regulatorio
   * Ejemplos: GIIS export, nota aclaratoria
   */
  REGIMEN_FEATURE_DISABLED = 'REGIMEN_FEATURE_DISABLED',

  /**
   * Documento inmutable según política regulatoria
   * Ocurre cuando se intenta editar/eliminar un documento finalizado o anulado en régimen SIRES
   */
  REGIMEN_DOCUMENT_IMMUTABLE = 'REGIMEN_DOCUMENT_IMMUTABLE',

  /**
   * Datos de identificación del trabajador inmutables tras el registro (SIRES)
   */
  REGIMEN_WORKER_IDENTIFICATION_IMMUTABLE =
    'REGIMEN_WORKER_IDENTIFICATION_IMMUTABLE',

  /**
   * Campo requerido por régimen regulatorio
   * Ejemplos: CURP, campos geográficos, CIE-10 principal
   */
  REGIMEN_FIELD_REQUIRED = 'REGIMEN_FIELD_REQUIRED',

  /**
   * Consentimiento informado diario no habilitado
   * Ocurre cuando se intenta usar consentimiento diario en régimen SIN_REGIMEN
   */
  CONSENT_NOT_ENABLED = 'CONSENT_NOT_ENABLED',

  /**
   * Consentimiento ya existe para el trabajador en la fecha especificada
   * Ocurre cuando se intenta crear un consentimiento duplicado para el mismo día
   */
  CONSENT_ALREADY_EXISTS = 'CONSENT_ALREADY_EXISTS',

  /**
   * Se requiere consentimiento para tratamiento de información (versión vigente)
   * para realizar esta acción bajo régimen SIRES_NOM024.
   */
  CONSENT_REQUIRED = 'CONSENT_REQUIRED',

  /**
   * @deprecated Ya no se usa (modelo versionado sin dateKey). Conservado por compatibilidad de clientes.
   */
  CONSENT_INVALID_DATE = 'CONSENT_INVALID_DATE',

  /**
   * Se requiere aceptar el acuerdo de confidencialidad y uso de la información
   * Ocurre cuando un usuario SIRES intenta usar el sistema sin haber aceptado la versión vigente
   */
  CONFIDENTIALITY_AGREEMENT_REQUIRED = 'CONFIDENTIALITY_AGREEMENT_REQUIRED',
}

/**
 * Tipo para detalles opcionales de errores regulatorios
 */
export interface RegulatoryErrorDetails {
  /**
   * Nombre de la feature que está deshabilitada
   * Ejemplos: 'giisExport', 'notaAclaratoria'
   */
  feature?: string;

  /**
   * Estado del documento cuando es inmutable
   * Ejemplos: 'FINALIZADO', 'ANULADO'
   */
  documentState?: string;

  /**
   * Nombre del campo que es requerido
   * Ejemplos: 'curp', 'cie10Principal', 'entidadNacimiento'
   */
  fieldName?: string;

  /**
   * Tipo de documento afectado (opcional)
   * Ejemplos: 'notaMedica', 'historiaClinica', 'lesion'
   */
  documentType?: string;

  /**
   * ID del trabajador para errores de consentimiento requerido
   */
  trabajadorId?: string;

  /**
   * Versión vigente del consentimiento para errores CONSENT_REQUIRED
   */
  currentVersion?: string;

  /**
   * Acción que requiere consentimiento
   * Ejemplos: 'create_document', 'export_giis', 'finalize_document'
   */
  action?: string;

  /**
   * Campos de identificación que no pueden modificarse
   */
  immutableFields?: string[];

  /**
   * Sujeto del error de inmutabilidad de identificación
   */
  subject?: 'trabajador' | 'firmante';
}
