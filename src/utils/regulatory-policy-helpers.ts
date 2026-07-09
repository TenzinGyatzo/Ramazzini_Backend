import { RegulatoryPolicy } from './regulatory-policy.service';

/**
 * Regulatory Policy Helpers
 *
 * Conjunto de helpers estandarizados para acceder a features y validaciones
 * de la política regulatoria sin comparar strings directamente.
 *
 * Uso:
 * ```typescript
 * const policy = await regulatoryPolicyService.getRegulatoryPolicy(proveedorId);
 * if (policyFeatures.notaAclaratoriaEnabled(policy)) {
 *   // Lógica para nota aclaratoria
 * }
 * ```
 */

/**
 * Helpers para features regulatorias
 */
export const policyFeatures = {
  /**
   * Indica si las notas aclaratorias están habilitadas
   */
  notaAclaratoriaEnabled: (policy: RegulatoryPolicy): boolean =>
    policy.features.notaAclaratoriaEnabled,

  /**
   * Indica si la exportación GIIS está habilitada
   */
  giisExportEnabled: (policy: RegulatoryPolicy): boolean =>
    policy.features.giisExportEnabled,

  /**
   * Indica si la inmutabilidad de documentos está habilitada
   */
  documentImmutabilityEnabled: (policy: RegulatoryPolicy): boolean =>
    policy.features.documentImmutabilityEnabled,

  /**
   * Indica si el timeout de sesión está habilitado
   */
  sessionTimeoutEnabled: (policy: RegulatoryPolicy): boolean =>
    policy.features.sessionTimeoutEnabled,

  /**
   * Indica si el campo CLUES debe ser visible
   */
  cluesFieldVisible: (policy: RegulatoryPolicy): boolean =>
    policy.features.cluesFieldVisible,

  /**
   * Indica si la UI SIRES debe mostrarse
   */
  showSiresUI: (policy: RegulatoryPolicy): boolean =>
    policy.features.showSiresUI,

  /**
   * Indica si se debe forzar inmutabilidad en UI
   */
  enforceDocumentImmutabilityUI: (policy: RegulatoryPolicy): boolean =>
    policy.features.enforceDocumentImmutabilityUI,

  /**
   * Indica si el consentimiento diario está habilitado
   */
  dailyConsentEnabled: (policy: RegulatoryPolicy): boolean =>
    policy.features.dailyConsentEnabled,

  /**
   * Indica si el acuerdo de confidencialidad está habilitado
   */
  confidentialityAgreementEnabled: (policy: RegulatoryPolicy): boolean =>
    policy.features.confidentialityAgreementEnabled,

  /**
   * Indica si los datos de identificación del trabajador son inmutables tras el alta
   */
  workerIdentificationImmutable: (policy: RegulatoryPolicy): boolean =>
    policy.features.workerIdentificationImmutable,

  /**
   * Indica si el documento Control Prenatal está habilitado
   */
  controlPrenatalEnabled: (policy: RegulatoryPolicy): boolean =>
    policy.features.controlPrenatalEnabled,
};

/**
 * Helpers para validaciones regulatorias
 */
export const policyValidation = {
  /**
   * Indica si CURP es requerido para firmantes
   */
  curpFirmantes: (policy: RegulatoryPolicy): boolean =>
    policy.validation.curpFirmantes === 'required',

  /**
   * Indica si CURP es requerido estrictamente para trabajadores
   */
  workerCurp: (policy: RegulatoryPolicy): boolean =>
    policy.validation.workerCurp === 'required_strict',

  /**
   * Indica si CIE-10 principal es requerido
   */
  cie10Principal: (policy: RegulatoryPolicy): boolean =>
    policy.validation.cie10Principal === 'required',

  /**
   * Indica si los campos geográficos son requeridos
   */
  geoFields: (policy: RegulatoryPolicy): boolean =>
    policy.validation.geoFields === 'required',
};
