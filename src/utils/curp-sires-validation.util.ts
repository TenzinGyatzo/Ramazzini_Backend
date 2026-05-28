import { BadRequestException } from '@nestjs/common';
import {
  validateCURP,
  validateCURPCrossCheck,
  isGenericCURP,
} from './curp-validator.util';
import { createRegulatoryError } from './regulatory-error-helper';
import { RegulatoryErrorCode } from './regulatory-error-codes';
import { buildCurpCrossCheckErrorContent } from './curp-cross-check-messages.util';

export interface CurpDemographicData {
  fechaNacimiento?: Date | string;
  sexo?: string;
  entidadNacimiento?: string;
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
}

export interface ValidateCurpSiresOptions {
  /** true = trabajadores; false = firmantes */
  allowGenericCurp: boolean;
  /** Para mensajes de error */
  subjectLabel: 'trabajador' | 'firmante';
  regime?: 'SIRES_NOM024' | 'SIN_REGIMEN';
}

/**
 * Validación CURP unificada para régimen SIRES_NOM024.
 * Cruce bloqueante A1: fecha, sexo, entidad, iniciales/consonantes (si hay nombre/apellidos) y homoclave.
 */
export function validateCurpForSires(
  curp: string | undefined,
  isCurpRequired: boolean,
  demographics: CurpDemographicData,
  options: ValidateCurpSiresOptions,
): void {
  if (!isCurpRequired) {
    return;
  }

  if (!curp || curp.trim() === '') {
    throw createRegulatoryError({
      errorCode: RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED,
      details: { fieldName: 'curp' },
      regime: options.regime ?? 'SIRES_NOM024',
    });
  }

  const normalizedCurp = curp.trim().toUpperCase();

  if (!options.allowGenericCurp && isGenericCURP(normalizedCurp)) {
    throw new BadRequestException(
      `CURP genérica no permitida para ${options.subjectLabel === 'firmante' ? 'firmantes' : 'este registro'}`,
    );
  }

  const validation = validateCURP(normalizedCurp);
  if (!validation.isValid) {
    throw new BadRequestException(
      `CURP inválido: ${validation.errors.join(', ')}`,
    );
  }

  if (options.allowGenericCurp && isGenericCURP(normalizedCurp)) {
    return;
  }

  if (demographics.fechaNacimiento && demographics.sexo) {
    const crossCheck = validateCURPCrossCheck(normalizedCurp, {
      fechaNacimiento: demographics.fechaNacimiento,
      sexo: demographics.sexo,
      entidadNacimiento: demographics.entidadNacimiento,
      nombre: demographics.nombre,
      primerApellido: demographics.primerApellido,
      segundoApellido: demographics.segundoApellido,
    });

    if (!crossCheck.isValid) {
      const { summary, userMessages, message } = buildCurpCrossCheckErrorContent(
        crossCheck.discrepancies,
        options.subjectLabel,
      );

      console.warn('CURP cross-check A1 failed:', {
        subject: options.subjectLabel,
        discrepancies: crossCheck.discrepancies,
        summary,
        userMessages,
      });

      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        ruleId: 'A1',
        summary,
        userMessages,
        message,
        details: crossCheck.discrepancies,
      });
    }
  }
}

/**
 * Validación laxa de CURP para SIN_REGIMEN (solo formato, no bloquea salvo error grave).
 */
export function validateOptionalCurpSinRegimen(curp: string | undefined): void {
  if (!curp || curp.trim() === '') {
    return;
  }

  const normalizedCurp = curp.trim().toUpperCase();
  const validation = validateCURP(normalizedCurp);

  if (!validation.isValid) {
    console.warn(
      `CURP con formato inválido para proveedor SIN_REGIMEN: ${validation.errors.join(', ')}`,
    );
  }
}
