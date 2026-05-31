import {
  ForbiddenException,
  BadRequestException,
  UnprocessableEntityException,
  ConflictException,
} from '@nestjs/common';
import {
  RegulatoryErrorCode,
  RegulatoryErrorDetails,
} from './regulatory-error-codes';

/**
 * Regulatory Error Response Format
 * Formato estándar para respuestas de error regulatorio
 */
export interface RegulatoryErrorResponse {
  statusCode: number;
  message: string;
  errorCode: RegulatoryErrorCode;
  details?: RegulatoryErrorDetails;
}

/**
 * Opciones para crear un error regulatorio
 */
export interface CreateRegulatoryErrorOptions {
  errorCode: RegulatoryErrorCode;
  details?: RegulatoryErrorDetails;
  /**
   * Régimen regulatorio del proveedor (opcional, usado para mensajes personalizados)
   */
  regime?: 'SIRES_NOM024' | 'SIN_REGIMEN';
}

/**
 * Helper para crear excepciones regulatorias con formato estándar
 *
 * @param options - Opciones para crear el error
 * @returns HttpException con formato estándar (errorCode + message + details)
 *
 * @example
 * // Feature deshabilitada
 * throw createRegulatoryError({
 *   errorCode: RegulatoryErrorCode.REGIMEN_FEATURE_DISABLED,
 *   details: { feature: 'giisExport' },
 *   regime: 'SIN_REGIMEN'
 * });
 *
 * @example
 * // Documento inmutable
 * throw createRegulatoryError({
 *   errorCode: RegulatoryErrorCode.REGIMEN_DOCUMENT_IMMUTABLE,
 *   details: { documentState: 'FINALIZADO', documentType: 'notaMedica' },
 *   regime: 'SIRES_NOM024'
 * });
 *
 * @example
 * // Campo requerido
 * throw createRegulatoryError({
 *   errorCode: RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED,
 *   details: { fieldName: 'curp' },
 *   regime: 'SIRES_NOM024'
 * });
 */
export function createRegulatoryError(
  options: CreateRegulatoryErrorOptions,
):
  | ForbiddenException
  | BadRequestException
  | UnprocessableEntityException
  | ConflictException {
  const { errorCode, details, regime } = options;

  // Generar mensaje base según el código de error
  const baseMessage = generateBaseMessage(errorCode, details, regime);

  // Determinar el status code según el tipo de error
  const statusCode = getStatusCodeForErrorCode(errorCode);

  // Crear respuesta con formato estándar
  const response: RegulatoryErrorResponse = {
    statusCode,
    message: baseMessage,
    errorCode,
    ...(details && { details }),
  };

  // Retornar la excepción apropiada
  switch (statusCode) {
    case 403:
      return new ForbiddenException(response);
    case 409:
      return new ConflictException(response);
    case 422:
      return new UnprocessableEntityException(response);
    case 400:
    default:
      return new BadRequestException(response);
  }
}

/**
 * Genera el mensaje base según el código de error y detalles
 */
function generateBaseMessage(
  errorCode: RegulatoryErrorCode,
  details?: RegulatoryErrorDetails,
  regime?: 'SIRES_NOM024' | 'SIN_REGIMEN',
): string {
  switch (errorCode) {
    case RegulatoryErrorCode.REGIMEN_FEATURE_DISABLED:
      const featureName = getFeatureDisplayName(details?.feature);
      if (regime === 'SIN_REGIMEN') {
        return `Esta función no está habilitada en tu configuración${featureName ? `: ${featureName}` : ''}`;
      }
      return `La función ${featureName || 'solicitada'} solo está disponible para proveedores con régimen SIRES (NOM-024)`;

    case RegulatoryErrorCode.REGIMEN_DOCUMENT_IMMUTABLE:
      const documentType = details?.documentType
        ? getDocumentTypeDisplayName(details.documentType)
        : 'documento';
      const stateDisplay =
        details?.documentState === 'FINALIZADO'
          ? 'finalizado'
          : details?.documentState === 'ANULADO'
            ? 'anulado'
            : 'en este estado';

      if (regime === 'SIRES_NOM024') {
        return `No se puede modificar un ${documentType} ${stateDisplay}. Los documentos en este estado son inmutables según la política regulatoria SIRES (NOM-024)`;
      }
      return `No se puede modificar un ${documentType} ${stateDisplay}`;

    case RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED:
      const fieldName = getFieldDisplayName(details?.fieldName);
      if (regime === 'SIRES_NOM024') {
        return `El campo ${fieldName} es obligatorio según la normativa SIRES (NOM-024)`;
      }
      return `El campo ${fieldName} es obligatorio`;

    case RegulatoryErrorCode.REGIMEN_WORKER_IDENTIFICATION_IMMUTABLE:
      if (regime === 'SIRES_NOM024') {
        return 'Los datos de identificación del trabajador no pueden modificarse una vez concluido el registro según la normativa SIRES (NOM-024).';
      }
      return 'Los datos de identificación del trabajador no pueden modificarse.';

    case RegulatoryErrorCode.CONSENT_NOT_ENABLED:
      return 'El consentimiento informado diario solo está disponible para proveedores con régimen SIRES (NOM-024)';

    case RegulatoryErrorCode.CONSENT_ALREADY_EXISTS:
      return 'Ya existe un consentimiento registrado para este trabajador en la fecha especificada';

    case RegulatoryErrorCode.CONSENT_REQUIRED:
      return 'Se requiere consentimiento informado diario para realizar esta acción';

    case RegulatoryErrorCode.CONSENT_INVALID_DATE:
      return 'El consentimiento usado corresponde a una fecha diferente. Se requiere consentimiento del día actual.';

    default:
      return 'Error regulatorio';
  }
}

/**
 * Obtiene el código de estado HTTP apropiado para un código de error
 */
function getStatusCodeForErrorCode(errorCode: RegulatoryErrorCode): number {
  switch (errorCode) {
    case RegulatoryErrorCode.REGIMEN_FEATURE_DISABLED:
    case RegulatoryErrorCode.REGIMEN_DOCUMENT_IMMUTABLE:
    case RegulatoryErrorCode.REGIMEN_WORKER_IDENTIFICATION_IMMUTABLE:
    case RegulatoryErrorCode.CONSENT_NOT_ENABLED:
    case RegulatoryErrorCode.CONSENT_REQUIRED:
    case RegulatoryErrorCode.CONSENT_INVALID_DATE:
      return 403; // Forbidden
    case RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED:
      return 400; // Bad Request (validación)
    case RegulatoryErrorCode.CONSENT_ALREADY_EXISTS:
      return 409; // Conflict
    default:
      return 400;
  }
}

/**
 * Obtiene el nombre de display para una feature
 */
function getFeatureDisplayName(feature?: string): string {
  if (!feature) return '';

  const featureNames: Record<string, string> = {
    giisExport: 'Exportación GIIS',
    notaAclaratoria: 'Notas aclaratorias',
    sessionTimeout: 'Timeout de sesión',
    documentImmutability: 'Inmutabilidad de documentos',
    dailyConsent: 'Consentimiento informado diario',
  };

  return featureNames[feature] || feature;
}

/**
 * Obtiene el nombre de display para un tipo de documento
 */
function getDocumentTypeDisplayName(documentType?: string): string {
  if (!documentType) return 'documento';

  const documentNames: Record<string, string> = {
    notaMedica: 'nota médica',
    historiaClinica: 'historia clínica',
    deteccion: 'detección',
    aptitud: 'aptitud para el puesto',
    certificado: 'certificado médico',
  };

  return documentNames[documentType] || documentType;
}

/**
 * Obtiene el nombre de display para un campo
 */
function getFieldDisplayName(fieldName?: string): string {
  if (!fieldName) return 'requerido';

  const fieldNames: Record<string, string> = {
    curp: 'CURP',
    cie10Principal: 'CIE-10 principal',
    entidadNacimiento: 'Entidad de nacimiento',
    entidadResidencia: 'Entidad de residencia',
    municipioResidencia: 'Municipio de residencia',
    localidadResidencia: 'Localidad de residencia',
    paisNacimiento: 'País de nacimiento',
    paisResidencia: 'País de residencia',
  };

  return fieldNames[fieldName] || fieldName;
}
