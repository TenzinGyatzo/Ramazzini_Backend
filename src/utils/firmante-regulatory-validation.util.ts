import { BadRequestException } from '@nestjs/common';
import { CatalogsService } from '../modules/catalogs/catalogs.service';
import { GeographyValidator } from '../modules/catalogs/validators/geography.validator';
import { RegulatoryPolicy } from './regulatory-policy.service';
import { createRegulatoryError } from './regulatory-error-helper';
import { RegulatoryErrorCode } from './regulatory-error-codes';
import {
  validateCurpForSires,
  CurpDemographicData,
} from './curp-sires-validation.util';
import { validateCurpByPolicy } from './curp-policy-validator.util';
import { buildCurpDemographicsForFirmante } from './curp-firmante-demographics.util';
import { validateCurpPersonNameCapture } from './curp-name-capture-validation.util';

export interface FirmanteRegulatoryData extends CurpDemographicData {
  paisNacimiento?: number;
  curp?: string;
  entidadResidencia?: string;
  municipioResidencia?: string;
  localidadResidencia?: string;
}

/**
 * Validaciones regulatorias unificadas para médico/enfermera firmante.
 */
export async function validateFirmanteRegulatoryFields(
  policy: RegulatoryPolicy,
  data: FirmanteRegulatoryData,
  catalogsService: CatalogsService,
  geographyValidator: GeographyValidator,
): Promise<void> {
  const isSires = policy.regime === 'SIRES_NOM024';
  const geoRequired = policy.validation.geoFields === 'required';
  const curpRequired = policy.validation.curpFirmantes === 'required';
  const errors: string[] = [];

  // Regla A3: validar jerarquía de residencia si viene algún campo
  if (
    data.entidadResidencia ||
    data.municipioResidencia ||
    data.localidadResidencia
  ) {
    const validationResult = await geographyValidator.validateGeography({
      entidad: data.entidadResidencia,
      municipio: data.municipioResidencia,
      localidad: data.localidadResidencia,
    });

    if (!validationResult.valid) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        ruleId: 'A3',
        message: 'La información geográfica es inconsistente',
        details: validationResult.errors.map((e) => ({
          field:
            e.field === 'entidad'
              ? 'entidadResidencia'
              : e.field === 'municipio'
                ? 'municipioResidencia'
                : 'localidadResidencia',
          reason: e.reason,
        })),
      });
    }
  }

  if (isSires && geoRequired) {
    if (!data.entidadNacimiento || data.entidadNacimiento.trim() === '') {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED,
        details: { fieldName: 'entidadNacimiento' },
        regime: policy.regime,
      });
    }

    const entidadNac = data.entidadNacimiento.trim().toUpperCase();
    if (entidadNac !== 'NE' && entidadNac !== '00') {
      const isValid = await catalogsService.validateINEGI('estado', entidadNac);
      if (!isValid) {
        throw new BadRequestException(
          `Entidad de nacimiento inválida: ${entidadNac}. Debe ser código INEGI válido (01-32, NE, o 00)`,
        );
      }
    }

    if (!data.entidadResidencia || data.entidadResidencia.trim() === '') {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED,
        details: { fieldName: 'entidadResidencia' },
        regime: policy.regime,
      });
    }

    const entidadRes = data.entidadResidencia.trim().toUpperCase();
    if (entidadRes !== 'NE' && entidadRes !== '00') {
      const isValid = await catalogsService.validateINEGI('estado', entidadRes);
      if (!isValid) {
        errors.push(
          `Entidad de residencia inválida: ${entidadRes}. Debe ser código INEGI válido (01-32, NE, o 00)`,
        );
      }
    }

    if (!data.municipioResidencia || data.municipioResidencia.trim() === '') {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED,
        details: { fieldName: 'municipioResidencia' },
        regime: policy.regime,
      });
    }

    const municipioRes = data.municipioResidencia.trim();
    if (
      municipioRes !== '000' &&
      entidadRes &&
      entidadRes !== 'NE' &&
      entidadRes !== '00'
    ) {
      const isValid = await catalogsService.validateINEGI(
        'municipio',
        municipioRes,
        entidadRes,
      );
      if (!isValid) {
        errors.push(
          `Municipio de residencia inválido: ${municipioRes}. No pertenece a la entidad ${entidadRes}`,
        );
      }
    }

    if (!data.localidadResidencia || data.localidadResidencia.trim() === '') {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED,
        details: { fieldName: 'localidadResidencia' },
        regime: policy.regime,
      });
    }

    const localidadRes = data.localidadResidencia.trim();
    if (
      localidadRes !== '0000' &&
      municipioRes &&
      municipioRes !== '000' &&
      entidadRes &&
      entidadRes !== 'NE' &&
      entidadRes !== '00'
    ) {
      const parentKey = `${entidadRes}-${municipioRes}`;
      const isValid = await catalogsService.validateINEGI(
        'localidad',
        localidadRes,
        parentKey,
      );
      if (!isValid) {
        errors.push(
          `Localidad de residencia inválida: ${localidadRes}. No pertenece al municipio ${municipioRes} de la entidad ${entidadRes}`,
        );
      }
    }
  } else if (data.entidadNacimiento && data.entidadNacimiento.trim() !== '') {
    const entidadNac = data.entidadNacimiento.trim().toUpperCase();
    if (entidadNac !== 'NE' && entidadNac !== '00') {
      const isValid = await catalogsService.validateINEGI('estado', entidadNac);
      if (!isValid) {
        throw new BadRequestException(
          `Entidad de nacimiento inválida: ${entidadNac}. Debe ser código INEGI válido (01-32, NE, o 00)`,
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new BadRequestException(errors.join('; '));
  }

  if (curpRequired) {
    if (!data.sexo || data.sexo.trim() === '') {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED,
        details: { fieldName: 'sexo' },
        regime: policy.regime,
      });
    }

    const nameCapture = validateCurpPersonNameCapture(
      data.nombre,
      data.primerApellido,
      data.segundoApellido,
    );
    if (!nameCapture.isValid) {
      throw new BadRequestException(nameCapture.errors.join('. '));
    }

    const curpDemographics = buildCurpDemographicsForFirmante(data);

    validateCurpForSires(data.curp, true, curpDemographics, {
      allowGenericCurp: false,
      subjectLabel: 'firmante',
      regime: policy.regime,
    });
  } else if (data.curp && data.curp.trim() !== '') {
    validateCurpByPolicy(data.curp, policy);
  }
}
