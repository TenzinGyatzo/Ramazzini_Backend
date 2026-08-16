/**
 * GIIS Phase 2A: Pre-validation (report only) and validate-and-filter (skip row + excluded report).
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import { NotaMedica } from '../../expedientes/schemas/nota-medica.schema';
import { DocumentoEstado } from '../../expedientes/enums/documento-estado.enum';
import { FirmanteHelper } from '../../expedientes/helpers/firmante-helper';
import { loadGiisSchema } from '../schema-loader';
import { mapNotaMedicaToCexRow, extractCieCode } from '../transformers/cex.mapper';
import { resolveCexDiagCatalogFlags } from '../utils/cex-diag-catalog-flags.util';
import { resolveCexPrestadorUserId } from '../utils/cex-prestador-user.util';
import { CatalogsService } from '../../catalogs/catalogs.service';
import { CexCatalogResolver } from '../../catalogs/cex-catalog.resolver';
import {
  ValidationError,
  PreValidationResult,
  ValidateAndFilterResult,
  ExcludedRowEntry,
  ExcludedRowReport,
} from './validation.types';
import {
  validateRowAgainstSchema,
  CatalogLookup,
} from './schema-based-validator';
import { GiisSchema } from '../schema-loader';
import { ProveedoresSaludService } from '../../proveedores-salud/proveedores-salud.service';
import { formatCLUES } from '../formatters/field.formatter';
import { Empresa } from '../../empresas/schemas/empresa.schema';
import { CentroTrabajo } from '../../centros-trabajo/schemas/centro-trabajo.schema';
import { Trabajador } from '../../trabajadores/schemas/trabajador.schema';
import { giisExportConfig } from '../config/giis-export.config';
import { evaluateCexLoadQuality } from './cex-load-quality.util';
import { validateCexCodigoCIEDiagnostico1Row, validateCexCodigoCIEDiagnostico1Age } from './cex-cie-diagnostico1.validator';
import { mapSexoToGiisBiologico } from '../../../utils/sexo-mapper.util';
import { CatalogType, CIE10Entry } from '../../catalogs/interfaces/catalog-entry.interface';
import { normalizeCie10CatalogKey } from '../../../utils/cie10-diagnostico-sis.util';
import { getTrabajadorIdsForProveedor } from '../utils/giis-proveedor-scope.util';

type Guide = 'CEX';

@Injectable()
export class GiisValidationService {
  constructor(
    @InjectModel(NotaMedica.name)
    private readonly notaMedicaModel: Model<NotaMedica>,
    @InjectModel(Empresa.name) private readonly empresaModel: Model<Empresa>,
    @InjectModel(CentroTrabajo.name)
    private readonly centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(Trabajador.name)
    private readonly trabajadorModel: Model<Trabajador>,
    private readonly catalogsService: CatalogsService,
    private readonly proveedoresSaludService: ProveedoresSaludService,
    private readonly firmanteHelper: FirmanteHelper,
    private readonly cexCatalogResolver: CexCatalogResolver,
  ) {}

  private buildCatalogLookup(): CatalogLookup {
    return {
      validatePais: async (code: string) => {
        const r = this.catalogsService.validateGIISPais(code);
        return r.valid;
      },
      validateEntidadFederativa: (code: string) =>
        this.catalogsService.validateINEGI('estado', code),
      validateClues: async (clues: string) => {
        const ok = await this.catalogsService.validateCLUES(clues);
        if (!ok) return false;
        return this.catalogsService.validateCLUESInOperation(clues);
      },
      validateTipoPersonal: (code: string) =>
        Promise.resolve(
          this.catalogsService.validateGIISTipoPersonal(code).valid,
        ),
      validateServicioAtencion: (code: string) =>
        Promise.resolve(
          this.catalogsService.validateGIISServicioAtencion(code).valid,
        ),
      validateAfiliacion: (code: string) =>
        Promise.resolve(
          this.catalogsService.validateGIISAfiliacion(code).valid,
        ),
    };
  }

  /**
   * Pre-validate period: no TXT written, returns aggregated errors/warnings for grid.
   */
  async preValidate(
    proveedorSaludId: string,
    yearMonth: string,
    guides: Guide[],
    establecimientoClues?: string,
  ): Promise<PreValidationResult> {
    let clues = establecimientoClues?.trim();
    if (clues === undefined || clues === '') {
      const proveedor =
        await this.proveedoresSaludService.findOne(proveedorSaludId);
      const raw = proveedor?.clues?.trim() ?? '';
      clues =
        formatCLUES(raw) ||
        (raw.length === 11 ? raw.toUpperCase() : '') ||
        '9998';
    }

    const [year, month] = yearMonth.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    const catalogLookup = this.buildCatalogLookup();
    const allErrors: ValidationError[] = [];
    let totalRows = 0;

    if (guides.includes('CEX')) {
      const trabajadorIds = await getTrabajadorIdsForProveedor(
        proveedorSaludId,
        this.empresaModel,
        this.centroTrabajoModel,
        this.trabajadorModel,
      );
      const notas = await this.notaMedicaModel
        .find({
          estado: DocumentoEstado.FINALIZADO,
          fechaNotaMedica: { $gte: startOfMonth, $lte: endOfMonth },
          idTrabajador:
            trabajadorIds.length > 0 ? { $in: trabajadorIds } : { $in: [] },
        })
        .populate('idTrabajador')
        .lean()
        .exec();
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
      const notasDelAnio =
        trabajadorIds.length > 0
          ? await this.notaMedicaModel
              .find({
                estado: DocumentoEstado.FINALIZADO,
                fechaNotaMedica: { $gte: startOfYear, $lte: endOfYear },
                idTrabajador: { $in: trabajadorIds },
              })
              .select('idTrabajador fechaNotaMedica _id')
              .lean()
              .exec()
          : [];
      const firstInYearIds = new Set<string>();
      const byTrabajador = new Map<
        string,
        { fecha: Date; _id: Types.ObjectId }[]
      >();
      for (const n of notasDelAnio as any[]) {
        const key =
          n.idTrabajador &&
          typeof n.idTrabajador === 'object' &&
          (n.idTrabajador as any)._id
            ? (n.idTrabajador as any)._id.toString()
            : (n.idTrabajador ?? '').toString();
        if (!key) continue;
        if (!byTrabajador.has(key)) byTrabajador.set(key, []);
        byTrabajador.get(key)!.push({
          fecha: n.fechaNotaMedica,
          _id: n._id,
        });
      }
      for (const arr of byTrabajador.values()) {
        arr.sort(
          (a, b) =>
            a.fecha.getTime() - b.fecha.getTime() ||
            a._id.toString().localeCompare(b._id.toString()),
        );
        if (arr.length > 0) firstInYearIds.add(arr[0]._id.toString());
      }

      const cexCodes = this.cexCatalogResolver.getCodes();
      const cexContextBase = {
        clues,
        cexDefaults: {
          tipoPersonal: cexCodes.tipoPersonal.medicoGeneral,
          servicioAtencion: cexCodes.servicioAtencion,
        },
      };
      const schema = loadGiisSchema('CEX');
      const rows: Record<string, string | number>[] = [];
      for (const nota of notas as any[]) {
        const trabajador = nota.idTrabajador || null;
        const userId = resolveCexPrestadorUserId(nota);
        const prestadorData = userId
          ? await this.firmanteHelper.getPrestadorDataFromUser(userId)
          : null;
        const primeraVezAnio = firstInYearIds.has(nota._id.toString()) ? 1 : 0;
        const consultaWithPrimera = { ...nota, primeraVezAnio };
        const codigo1 = extractCieCode(consultaWithPrimera.codigoCIE10Principal);
        const diag2NoAplica =
          consultaWithPrimera.primeraVezDiagnostico2 !== 0 &&
          consultaWithPrimera.primeraVezDiagnostico2 !== 1;
        const codigo2 = diag2NoAplica
          ? ''
          : extractCieCode(consultaWithPrimera.codigoCIEDiagnostico2 as string);
        const diag3NoAplica =
          consultaWithPrimera.primeraVezDiagnostico3 !== 0 &&
          consultaWithPrimera.primeraVezDiagnostico3 !== 1;
        const codigo3 = diag3NoAplica
          ? ''
          : extractCieCode(consultaWithPrimera.codigoCIEDiagnostico3 as string);
        const diagCatalogFlags = await resolveCexDiagCatalogFlags(
          this.catalogsService,
          {
            confirmacion1: codigo1,
            confirmacion2: codigo2,
            confirmacion3: codigo3,
          },
        );
        rows.push(
          mapNotaMedicaToCexRow(
            consultaWithPrimera,
            { ...cexContextBase, diagCatalogFlags },
            trabajador,
            prestadorData ?? undefined,
          ),
        );
      }
      totalRows += rows.length;
      for (let i = 0; i < rows.length; i++) {
        const errs = await validateRowAgainstSchema(
          'CEX',
          schema,
          rows[i],
          i,
          catalogLookup,
        );
        allErrors.push(...errs);

        const cie1Cause = await validateCexCodigoCIEDiagnostico1Row(
          rows[i],
          this.catalogsService,
        );
        if (cie1Cause) {
          allErrors.push({
            guide: 'CEX',
            rowIndex: i,
            field: 'codigoCIEDiagnostico1',
            cause: cie1Cause,
            severity: 'blocker',
          });
        }

        const nota = notas[i] as any;
        const trab = nota?.idTrabajador;
        if (trab?.fechaNacimiento && nota?.fechaNotaMedica) {
          const fechaNacimiento = new Date(trab.fechaNacimiento);
          const fechaNotaMedica = new Date(nota.fechaNotaMedica);
          const catalogKey = normalizeCie10CatalogKey(
            String(rows[i].codigoCIEDiagnostico1 ?? ''),
          );
          if (catalogKey) {
            const entry = (await this.catalogsService.getCatalogEntry(
              CatalogType.CIE10,
              catalogKey,
            )) as CIE10Entry | null;
            if (entry) {
              const sexoBiologico = mapSexoToGiisBiologico(trab.sexo ?? '');
              const ageCause = validateCexCodigoCIEDiagnostico1Age(
                catalogKey,
                entry,
                fechaNacimiento,
                fechaNotaMedica,
                sexoBiologico,
              );
              if (ageCause) {
                allErrors.push({
                  guide: 'CEX',
                  rowIndex: i,
                  field: 'codigoCIEDiagnostico1',
                  cause: ageCause,
                  severity: 'blocker',
                });
              }
            }
          }
        }
      }

      if (giisExportConfig.cexLoadQualityRulesEnabled) {
        const blockerRows = new Set<number>();
        for (const e of allErrors) {
          if (e.severity === 'blocker') blockerRows.add(e.rowIndex);
        }
        const validRows = rows.filter((_, i) => !blockerRows.has(i));
        const loadQuality = evaluateCexLoadQuality(validRows);
        allErrors.push(...loadQuality.errors);
      }
    }

    return {
      errors: allErrors,
      totalRows,
    };
  }

  /**
   * Validate rows and filter: exclude rows with any blocker; accumulate excluded report and warnings.
   */
  async validateAndFilterRows(
    guide: Guide,
    rows: Record<string, string | number>[],
    schema: GiisSchema,
    catalogLookup?: CatalogLookup,
  ): Promise<ValidateAndFilterResult> {
    const validRows: Record<string, string | number>[] = [];
    const excludedEntries: ExcludedRowEntry[] = [];
    const warnings: ValidationError[] = [];
    const lookup = catalogLookup ?? this.buildCatalogLookup();

    for (let i = 0; i < rows.length; i++) {
      const errs = await validateRowAgainstSchema(
        guide,
        schema,
        rows[i],
        i,
        lookup,
      );
      const blockers = errs.filter((e) => e.severity === 'blocker');
      const warns = errs.filter((e) => e.severity === 'warning');

      if (blockers.length > 0) {
        for (const e of blockers) {
          excludedEntries.push({
            guide,
            rowIndex: i,
            field: e.field,
            cause: e.cause,
          });
        }
      } else {
        validRows.push(rows[i]);
        for (const w of warns) {
          warnings.push(w);
        }
      }
    }

    const excludedRowsSet = new Set(
      excludedEntries.map((e) => `${e.guide}:${e.rowIndex}`),
    );
    const excludedReport: ExcludedRowReport = {
      entries: excludedEntries,
      totalExcluded: excludedRowsSet.size,
    };

    return {
      validRows,
      excludedReport,
      warnings,
    };
  }
}
