import { Injectable } from '@nestjs/common';
import { CatalogsService } from '../catalogs.service';
import {
  ENTIDADES_RESIDENCIA_ESPECIALES,
  LOCALIDADES_RESIDENCIA_ESPECIALES,
  MUNICIPIOS_RESIDENCIA_ESPECIALES,
  normalizeEntidadResidencia,
} from '../../../utils/giis-residencia-geo.util';

/**
 * Payload for geography validation
 */
export interface GeographyValidationPayload {
  entidad?: string;
  municipio?: string;
  localidad?: string;
  codigoPostal?: string; // Opcional, solo si existe en modelo
}

/**
 * Validation error detail
 */
export interface GeographyValidationError {
  field: string;
  reason: string;
}

/**
 * Result of geography validation
 */
export interface GeographyValidationResult {
  valid: boolean;
  errors: GeographyValidationError[];
}

/**
 * Geography Validator Service
 *
 * Validates hierarchical geographic consistency:
 * - Entidad → Municipio → Localidad
 * Uses INEGI catalogs available in the server.
 *
 * This is the "last guardian" for:
 * - Direct payloads (Postman, scripts)
 * - Future imports
 * - Regulatory integrity (NOM-024 / GIIS)
 */
@Injectable()
export class GeographyValidator {
  constructor(private readonly catalogsService: CatalogsService) {}

  /**
   * Normalize entity code: trim + uppercase
   */
  private normalizeEntidad(code: string | undefined): string | undefined {
    if (!code) return undefined;
    return code.trim().toUpperCase();
  }

  /**
   * Normalize municipality/locality code: trim only (keep numeric format)
   */
  private normalizeCodigo(code: string | undefined): string | undefined {
    if (!code) return undefined;
    return code.trim();
  }

  /**
   * Check if entity code is a sentinel value (NE, 00, 88, 99)
   */
  private isEntidadSentinel(code: string): boolean {
    return ENTIDADES_RESIDENCIA_ESPECIALES.includes(
      normalizeEntidadResidencia(code) as (typeof ENTIDADES_RESIDENCIA_ESPECIALES)[number],
    );
  }

  /**
   * Check if municipality code is a sentinel value (000, 997, 998, 999)
   */
  private isMunicipioSentinel(code: string): boolean {
    return MUNICIPIOS_RESIDENCIA_ESPECIALES.includes(
      code.trim() as (typeof MUNICIPIOS_RESIDENCIA_ESPECIALES)[number],
    );
  }

  /**
   * Check if locality code is a sentinel value (0000, 9997, 9998, 9999)
   */
  private isLocalidadSentinel(code: string): boolean {
    return LOCALIDADES_RESIDENCIA_ESPECIALES.includes(
      code.trim() as (typeof LOCALIDADES_RESIDENCIA_ESPECIALES)[number],
    );
  }

  /**
   * Validate entity exists in catalog
   */
  async validateEntidad(entidadClave: string): Promise<boolean> {
    if (!entidadClave) return false;

    const normalized = this.normalizeEntidad(entidadClave);
    if (!normalized) return false;

    // Allow sentinel values
    if (this.isEntidadSentinel(normalized)) {
      return true;
    }

    return await this.catalogsService.validateINEGI('estado', normalized);
  }

  /**
   * Validate municipality exists and belongs to entity
   */
  async validateMunicipio(
    entidadClave: string,
    municipioClave: string,
  ): Promise<boolean> {
    if (!municipioClave) return false;

    const normalizedMunicipio = this.normalizeCodigo(municipioClave);
    if (!normalizedMunicipio) return false;

    // Allow sentinel value
    if (this.isMunicipioSentinel(normalizedMunicipio)) {
      return true;
    }

    // Municipality requires entity
    if (!entidadClave) {
      return false;
    }

    const normalizedEntidad = this.normalizeEntidad(entidadClave);
    if (!normalizedEntidad) return false;

    // Don't validate municipality if entity is sentinel
    if (this.isEntidadSentinel(normalizedEntidad)) {
      return true;
    }

    return await this.catalogsService.validateINEGI(
      'municipio',
      normalizedMunicipio,
      normalizedEntidad,
    );
  }

  /**
   * Validate locality exists and belongs to municipality
   */
  async validateLocalidad(
    municipioClave: string,
    localidadClave: string,
    entidadClave?: string,
  ): Promise<boolean> {
    if (!localidadClave) return false;

    const normalizedLocalidad = this.normalizeCodigo(localidadClave);
    if (!normalizedLocalidad) return false;

    // Allow sentinel value
    if (this.isLocalidadSentinel(normalizedLocalidad)) {
      return true;
    }

    // Locality requires municipality
    if (!municipioClave) {
      return false;
    }

    const normalizedMunicipio = this.normalizeCodigo(municipioClave);
    if (!normalizedMunicipio) return false;

    // Don't validate locality if municipality is sentinel
    if (this.isMunicipioSentinel(normalizedMunicipio)) {
      return true;
    }

    // Build parent key: estado-municipio
    if (entidadClave) {
      const normalizedEntidad = this.normalizeEntidad(entidadClave);
      if (normalizedEntidad && !this.isEntidadSentinel(normalizedEntidad)) {
        const parentKey = `${normalizedEntidad}-${normalizedMunicipio}`;
        return await this.catalogsService.validateINEGI(
          'localidad',
          normalizedLocalidad,
          parentKey,
        );
      }
    }

    // Fallback: validate without parent (less strict)
    return await this.catalogsService.validateINEGI(
      'localidad',
      normalizedLocalidad,
      undefined,
    );
  }

  /**
   * Validate complete geography hierarchy
   *
   * Rules:
   * 1. If entity is provided, it must exist in catalog
   * 2. If municipality is provided:
   *    - Must exist
   *    - Must belong to provided entity
   * 3. If locality is provided:
   *    - Must exist
   *    - Must belong to provided municipality
   * 4. Dependency rule:
   *    - Cannot have municipality without entity
   *    - Cannot have locality without municipality
   */
  async validateGeography(
    payload: GeographyValidationPayload,
  ): Promise<GeographyValidationResult> {
    const errors: GeographyValidationError[] = [];

    const entidad = this.normalizeEntidad(payload.entidad);
    const municipio = this.normalizeCodigo(payload.municipio);
    const localidad = this.normalizeCodigo(payload.localidad);

    // Rule 1: Validate entity if provided
    if (entidad) {
      const isValidEntidad = await this.validateEntidad(entidad);
      if (!isValidEntidad) {
        errors.push({
          field: 'entidad',
          reason: `La entidad "${entidad}" no existe en el catálogo`,
        });
      }
    }

    // Rule 2: Validate municipality if provided
    if (municipio) {
      // Dependency: municipality requires entity
      if (!entidad) {
        errors.push({
          field: 'municipio',
          reason: 'No puede existir municipio sin entidad',
        });
      } else {
        const isValidMunicipio = await this.validateMunicipio(
          entidad,
          municipio,
        );
        if (!isValidMunicipio) {
          errors.push({
            field: 'municipio',
            reason: `El municipio "${municipio}" no pertenece a la entidad "${entidad}"`,
          });
        }
      }
    }

    // Rule 3: Validate locality if provided
    if (localidad) {
      // Dependency: locality requires municipality
      if (!municipio) {
        errors.push({
          field: 'localidad',
          reason: 'No puede existir localidad sin municipio',
        });
      } else {
        const isValidLocalidad = await this.validateLocalidad(
          municipio,
          localidad,
          entidad,
        );
        if (!isValidLocalidad) {
          errors.push({
            field: 'localidad',
            reason: `La localidad "${localidad}" no pertenece al municipio "${municipio}"`,
          });
        }
      }
    }

    // Rule 4: Optional - Validate postal code if provided and catalog available
    // This is optional as per requirements
    // TODO: Implement if postal code validation is needed

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
