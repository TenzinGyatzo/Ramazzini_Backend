/**
 * Validación de captura de nombres/apellidos según instructivo CURP (RENAPO).
 * Delegada en person-name-character-validation.util.ts
 */

export {
  validatePersonNameCharacters as validateCurpNameCaptureField,
  validatePersonNameCharacterFields as validateCurpPersonNameCapture,
  type PersonNameCharacterValidationResult as CurpNameCaptureValidationResult,
} from './person-name-character-validation.util';
