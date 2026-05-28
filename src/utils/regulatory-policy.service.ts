import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProveedoresSaludService } from '../modules/proveedores-salud/proveedores-salud.service';

/**
 * Regulatory Policy Interface
 * Define las features habilitadas según el régimen regulatorio
 */
export interface RegulatoryPolicy {
  regime: 'SIRES_NOM024' | 'SIN_REGIMEN';
  features: {
    sessionTimeoutEnabled: boolean;
    enforceDocumentImmutabilityUI: boolean;
    documentImmutabilityEnabled: boolean;
    showSiresUI: boolean;
    giisExportEnabled: boolean;
    notaAclaratoriaEnabled: boolean;
    cluesFieldVisible: boolean; // CLUES visible solo en SIRES
    dailyConsentEnabled: boolean; // Consentimiento informado diario
    workerIdentificationImmutable: boolean; // Identificación trabajador inmutable post-alta
  };
  validation: {
    curpFirmantes: 'required' | 'optional';
    workerCurp: 'required_strict' | 'optional'; // CURP trabajadores
    cie10Principal: 'required' | 'optional'; // CIE-10 principal
    geoFields: 'required' | 'optional'; // Campos geográficos
  };
}

/**
 * Regulatory Policy Service
 *
 * Resuelve la política regulatoria basada en el régimen regulatorio del proveedor.
 * Esta es la fuente única de verdad para decisiones regulatorias en la aplicación.
 *
 * Reglas:
 * - SIRES_NOM024: Todas las features regulatorias habilitadas (timeout, inmutabilidad, UI SIRES)
 * - SIN_REGIMEN: Todas las features regulatorias deshabilitadas
 * - Fallback: Si falta régimen, asumir SIN_REGIMEN (comportamiento más permisivo)
 */
@Injectable()
export class RegulatoryPolicyService {
  constructor(
    @Inject(forwardRef(() => ProveedoresSaludService))
    private readonly proveedoresSaludService: ProveedoresSaludService,
  ) {}

  /**
   * Obtiene la política regulatoria para un proveedor de salud
   * @param proveedorSaludId - ObjectId del ProveedorSalud
   * @returns Promise<RegulatoryPolicy> - Política regulatoria con features habilitadas/deshabilitadas
   */
  async getRegulatoryPolicy(
    proveedorSaludId: string | Types.ObjectId,
  ): Promise<RegulatoryPolicy> {
    const idString = proveedorSaludId.toString();

    try {
      // Validar ObjectId format
      if (!Types.ObjectId.isValid(idString)) {
        // Fallback defensivo: asumir SIN_REGIMEN si ID inválido
        return this.createSinRegimenPolicy();
      }

      const proveedor = await this.proveedoresSaludService.findOne(idString);

      if (!proveedor) {
        // Fallback defensivo: asumir SIN_REGIMEN si no existe
        return this.createSinRegimenPolicy();
      }

      // Resolver régimen regulatorio
      const regimen = proveedor.regimenRegulatorio;

      // Si tiene régimen explícito, usarlo
      if (regimen === 'SIRES_NOM024') {
        return this.createSiresPolicy();
      }

      if (regimen === 'SIN_REGIMEN') {
        return this.createSinRegimenPolicy();
      }

      // Fallback defensivo: si falta o es otro valor, asumir SIN_REGIMEN
      return this.createSinRegimenPolicy();
    } catch (error) {
      // Log error pero retornar política segura (SIN_REGIMEN)
      console.error(
        `Error retrieving regulatory policy for ${idString}:`,
        error,
      );
      return this.createSinRegimenPolicy();
    }
  }

  /**
   * Crea una política para régimen SIRES_NOM024
   * Todas las features regulatorias habilitadas
   */
  private createSiresPolicy(): RegulatoryPolicy {
    return {
      regime: 'SIRES_NOM024',
      features: {
        sessionTimeoutEnabled: true,
        enforceDocumentImmutabilityUI: true,
        documentImmutabilityEnabled: true,
        showSiresUI: true,
        giisExportEnabled: true,
        notaAclaratoriaEnabled: true,
        cluesFieldVisible: true,
        dailyConsentEnabled: true,
        workerIdentificationImmutable: true,
      },
      validation: {
        curpFirmantes: 'required',
        workerCurp: 'required_strict',
        cie10Principal: 'required',
        geoFields: 'required',
      },
    };
  }

  /**
   * Crea una política para régimen SIN_REGIMEN
   * Todas las features regulatorias deshabilitadas
   */
  private createSinRegimenPolicy(): RegulatoryPolicy {
    return {
      regime: 'SIN_REGIMEN',
      features: {
        sessionTimeoutEnabled: false,
        enforceDocumentImmutabilityUI: false,
        documentImmutabilityEnabled: false,
        showSiresUI: false,
        giisExportEnabled: false,
        notaAclaratoriaEnabled: false,
        cluesFieldVisible: false,
        dailyConsentEnabled: false,
        workerIdentificationImmutable: false,
      },
      validation: {
        curpFirmantes: 'optional',
        workerCurp: 'optional',
        cie10Principal: 'required',
        geoFields: 'optional',
      },
    };
  }
}
