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
import { mapNotaMedicaToCexRow } from '../transformers/cex.mapper';
import { CatalogsService } from '../../catalogs/catalogs.service';
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

type Guide = 'CEX';

@Injectable()
export class GiisValidationService {
  constructor(
    @InjectModel(NotaMedica.name)
    private readonly notaMedicaModel: Model<NotaMedica>,
    private readonly catalogsService: CatalogsService,
    private readonly proveedoresSaludService: ProveedoresSaludService,
    private readonly firmanteHelper: FirmanteHelper,
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
      const notas = await this.notaMedicaModel
        .find({
          estado: DocumentoEstado.FINALIZADO,
          fechaNotaMedica: { $gte: startOfMonth, $lte: endOfMonth },
        })
        .populate('idTrabajador')
        .lean()
        .exec();
      const trabajadorIdsUnicos = [
        ...new Set(
          (notas as any[])
            .map((n) => n.idTrabajador)
            .filter(Boolean)
            .map((id) =>
              (id && typeof id === 'object' && id._id ? id._id : id).toString(),
            ),
        ),
      ];
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
      const notasDelAnio =
        trabajadorIdsUnicos.length > 0
          ? await this.notaMedicaModel
              .find({
                estado: DocumentoEstado.FINALIZADO,
                fechaNotaMedica: { $gte: startOfYear, $lte: endOfYear },
                idTrabajador: { $in: trabajadorIdsUnicos },
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

      const cexContext = {
        clues,
        getPaisCatalogKeyFromNacionalidad: (clave: string) =>
          this.catalogsService.getPaisCatalogKeyFromNacionalidad(clave),
      };
      const schema = loadGiisSchema('CEX');
      const rows: Record<string, string | number>[] = [];
      for (const nota of notas as any[]) {
        const trabajador = nota.idTrabajador || null;
        const rawUser = nota.finalizadoPor ?? nota.updatedBy;
        const userId =
          rawUser != null
            ? typeof rawUser === 'string'
              ? rawUser
              : (rawUser as Types.ObjectId).toString()
            : '';
        const prestadorData = userId
          ? await this.firmanteHelper.getPrestadorDataFromUser(userId)
          : null;
        const primeraVezAnio = firstInYearIds.has(nota._id.toString()) ? 1 : 0;
        const consultaWithPrimera = { ...nota, primeraVezAnio };
        rows.push(
          mapNotaMedicaToCexRow(
            consultaWithPrimera,
            cexContext,
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
