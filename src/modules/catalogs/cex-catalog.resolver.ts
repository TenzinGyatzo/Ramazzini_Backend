import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { CatalogsService } from './catalogs.service';
import { CatalogType } from './interfaces/catalog-entry.interface';
import {
  CEX_SERVICIO_ATENCION_DESCRIPCION,
  CEX_TIPO_PERSONAL_DESCRIPTIONS,
  CexTipoPersonalRole,
} from './config/cex-catalog-descriptions';

export interface CexCatalogCodes {
  tipoPersonal: {
    medicoGeneral: number;
    medicoEspecialista: number;
    enfermera: number;
  };
  servicioAtencion: number;
}

@Injectable()
export class CexCatalogResolver implements OnApplicationBootstrap {
  private readonly logger = new Logger(CexCatalogResolver.name);
  private cachedCodes: CexCatalogCodes | null = null;
  private resolveErrors: string[] = [];

  constructor(private readonly catalogsService: CatalogsService) {}

  onApplicationBootstrap(): void {
    this.resolveAndCache();
  }

  isReady(): boolean {
    return this.cachedCodes !== null;
  }

  getResolveErrors(): string[] {
    return [...this.resolveErrors];
  }

  getCodes(): CexCatalogCodes {
    if (!this.cachedCodes) {
      this.resolveAndCache();
    }
    if (!this.cachedCodes) {
      throw new Error(
        `CEX catalog codes not resolved: ${this.resolveErrors.join('; ') || 'unknown error'}`,
      );
    }
    return this.cachedCodes;
  }

  getTipoPersonalForRole(role: CexTipoPersonalRole): number {
    return this.getCodes().tipoPersonal[role];
  }

  getServicioAtencionCex(): number {
    return this.getCodes().servicioAtencion;
  }

  /** Re-resolve from catalogs (e.g. after injectMockCatalog in tests). */
  refresh(): void {
    this.resolveAndCache();
  }

  private resolveAndCache(): void {
    this.resolveErrors = [];
    const tipoPersonal: Partial<CexCatalogCodes['tipoPersonal']> = {};

    for (const [role, description] of Object.entries(
      CEX_TIPO_PERSONAL_DESCRIPTIONS,
    ) as [CexTipoPersonalRole, string][]) {
      const code = this.catalogsService.findCatalogKeyByNormalizedDescription(
        CatalogType.TIPO_PERSONAL,
        description,
      );
      if (code == null) {
        this.resolveErrors.push(
          `tipoPersonal "${description}" (${role}) not found in cat_tipo_personal.csv`,
        );
      } else {
        tipoPersonal[role] = code;
      }
    }

    const servicioAtencion =
      this.catalogsService.findCatalogKeyByNormalizedDescription(
        CatalogType.SERVICIOS_ATENCION_CE,
        CEX_SERVICIO_ATENCION_DESCRIPCION,
      );
    if (servicioAtencion == null) {
      this.resolveErrors.push(
        `servicioAtencion "${CEX_SERVICIO_ATENCION_DESCRIPCION}" not found in servicios_atencion_por_tipo_personal_sis_ce.csv`,
      );
    }

    if (this.resolveErrors.length > 0) {
      this.cachedCodes = null;
      for (const err of this.resolveErrors) {
        this.logger.error(`CEX catalog resolution failed: ${err}`);
      }
      return;
    }

    this.cachedCodes = {
      tipoPersonal: tipoPersonal as CexCatalogCodes['tipoPersonal'],
      servicioAtencion: servicioAtencion!,
    };
    this.logger.log(
      `CEX catalog codes resolved: tipoPersonal=${JSON.stringify(this.cachedCodes.tipoPersonal)}, servicioAtencion=${this.cachedCodes.servicioAtencion}`,
    );
  }
}
