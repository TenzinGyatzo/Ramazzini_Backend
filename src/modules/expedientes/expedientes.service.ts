// Servicios para gestionar la data que se almacena en la base de datos
import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types, Connection, PipelineStage } from 'mongoose';
import { Antidoping } from './schemas/antidoping.schema';
import { AptitudPuesto } from './schemas/aptitud-puesto.schema';
import { Audiometria } from './schemas/audiometria.schema';
import { Certificado } from './schemas/certificado.schema';
import { CertificadoExpedito } from './schemas/certificado-expedito.schema';
import { DocumentoExterno } from './schemas/documento-externo.schema';
import { ExamenVista } from './schemas/examen-vista.schema';
import { ExploracionFisica } from './schemas/exploracion-fisica.schema';
import { HistoriaClinica } from './schemas/historia-clinica.schema';
import { NotaMedica } from './schemas/nota-medica.schema';
import { NotaAclaratoria } from './schemas/nota-aclaratoria.schema';
import { ControlPrenatal } from './schemas/control-prenatal.schema';
import { HistoriaOtologica } from './schemas/historia-otologica.schema';
import { PrevioEspirometria } from './schemas/previo-espirometria.schema';
import { ConstanciaAptitud } from './schemas/constancia-aptitud.schema';
import { Receta } from './schemas/receta.schema';
import { Deteccion } from './schemas/deteccion.schema';
import { EntrevistaPsicologica } from './schemas/entrevista-psicologica.schema';
import { TrastornosEstadoAnimo } from './schemas/trastornos-estado-animo.schema';
import { CuestionarioProdromalBreve } from './schemas/cuestionario-prodromal-breve.schema';
import { TrastornoLimitePersonalidad } from './schemas/trastorno-limite-personalidad.schema';
import { EventoSeguimientoCardiometabolico } from './schemas/evento-seguimiento-cardiometabolico.schema';
import { InformeLongitudinalCardiometabolico } from './schemas/informe-longitudinal-cardiometabolico.schema';
import { InformeLongitudinalAudiometrico } from './schemas/informe-longitudinal-audiometrico.schema';
import { FilesService } from '../files/files.service';
import { convertirFechaISOaDDMMYYYY } from 'src/utils/dates';
import path from 'path';
import { parseISO } from 'date-fns';
import * as fs from 'fs/promises';
import { Trabajador } from '../trabajadores/schemas/trabajador.schema';
import { DocumentoEstado } from './enums/documento-estado.enum';
import { PdfStatus } from './enums/pdf-status.enum';
import { NOM024ComplianceUtil } from '../../utils/nom024-compliance.util';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from '../empresas/schemas/empresa.schema';
import { CatalogsService } from '../catalogs/catalogs.service';
import {
  validateVitalSigns,
  extractVitalSignsFromDTO,
  validateBloodPressureConsistency,
} from '../../utils/vital-signs-validator.util';
import {
  normalizeNotaMedicaCexSentinels,
  validateNotaMedicaCexQuantities,
} from './constants/nota-medica-cex.ranges';
import { InformesService } from '../informes/informes.service';
import { mapSexoToGiisBiologico } from '../../utils/sexo-mapper.util';
import {
  CIE10Entry,
  CatalogType,
} from '../catalogs/interfaces/catalog-entry.interface';
import { validateDocumentDateE1ForRegime } from './validators/document-date-e1.helper';
import { validateNoDuplicateCIE10PrincipalAndComplementary } from './validators/diagnosis-duplicate.validator';
import { validateCodigoCIEDiagnostico1 } from './validators/cie10-diagnostico1.validator';
import { validateCodigoCIEDiagnostico23 } from './validators/cie10-diagnostico23.validator';
import { validateConfirmacionDiagnosticaFields } from './validators/confirmacion-diagnostica.validator';
import { validateCie10SexAgeAgainstCatalog } from './validators/cie10-catalog-sex-age.validator';
import { isCIE10Exact4Chars } from '../../utils/cie10-diagnostico-sis.util';
import { FirmanteHelper } from './helpers/firmante-helper';
import { CexCatalogResolver } from '../catalogs/cex-catalog.resolver';
import {
  normalizarCamposEmbarazo,
  validarCamposEmbarazo,
} from './validators/nota-medica-embarazo.validator';
import { Cie10CatalogLookupService } from './services/cie10-catalog-lookup.service';
import { ProveedoresSaludService } from '../proveedores-salud/proveedores-salud.service';
import {
  RegulatoryPolicy,
  RegulatoryPolicyService,
} from '../../utils/regulatory-policy.service';
import { createRegulatoryError } from '../../utils/regulatory-error-helper';
import { RegulatoryErrorCode } from '../../utils/regulatory-error-codes';
import { ConsentimientosService } from '../consentimientos/consentimientos.service';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import { UsersService } from '../users/users.service';
import { WorkerFusionService } from '../trabajadores/worker-fusion.service';
import { OrganizationalAccessService } from '../../utils/organizational-access.service';
import {
  EXPEDIENTE_DOCUMENT_MODEL_NAMES,
  EXPEDIENTE_MODEL_NAME_TO_DOCUMENT_TYPE,
  WORKER_LINKED_COLLECTIONS,
  type WorkerLinkedCollectionConfig,
} from '../trabajadores/constants/worker-linked-collections.constant';
import { ResultadoClinico } from '../resultados-clinicos/schemas/resultado-clinico.schema';
import { resolveTrabajadorProveedorChain } from '../../utils/helpers/treatment-consent.helper';
import type { TreatmentConsentRequestContext } from '../../utils/helpers/treatment-consent-request.context';
import { getDocumentoListSelect } from './constants/documento-list-projection';
import { FichaSnapshotService } from './services/ficha-snapshot.service';
import {
  MAX_EXTERNAL_DOCUMENT_BYTES,
  assertTrabajadorIdsConsistent,
  buildClinicalDirectoryPath,
  buildExternalDocumentFilename,
  getWriteBase,
  resolveAndContain,
} from './utils/clinical-directory-path';
import { FichaSnapshot } from './schemas/ficha-snapshot.schema';
import {
  calendarYearBounds,
  valorPrimeraVezAnioSegunExistencia,
} from '../giis-export/utils/primera-vez-anio.util';
import {
  APTITUD_INFORME_VECINO_TYPES,
  getAptitudInformeVecinoSelect,
  type AptitudInformeVecinoType,
} from './constants/aptitud-informe-vecinos-projection';

/** Contexto de régimen/proveedor resuelto una vez por request (create/update/upload) */
interface DocumentRegimeContext {
  trabajadorId: string;
  trabajador: Record<string, any> | null;
  proveedorSaludId: string | null;
  policy: RegulatoryPolicy | null;
}

@Injectable()
export class ExpedientesService {
  private readonly models: Record<string, Model<any>>;
  private readonly dateFields: Record<string, string>;
  private readonly documentTypeToStoreKey: Record<string, string>;

  constructor(
    @InjectModel(Antidoping.name) private antidopingModel: Model<Antidoping>,
    @InjectModel(AptitudPuesto.name) private aptitudModel: Model<AptitudPuesto>,
    @InjectModel(Audiometria.name) private audiometriaModel: Model<Audiometria>,
    @InjectModel(Certificado.name) private certificadoModel: Model<Certificado>,
    @InjectModel(CertificadoExpedito.name)
    private certificadoExpeditoModel: Model<CertificadoExpedito>,
    @InjectModel(DocumentoExterno.name)
    private documentoExternoModel: Model<DocumentoExterno>,
    @InjectModel(ExamenVista.name) private examenVistaModel: Model<ExamenVista>,
    @InjectModel(ExploracionFisica.name)
    private exploracionFisicaModel: Model<ExploracionFisica>,
    @InjectModel(HistoriaClinica.name)
    private historiaClinicaModel: Model<HistoriaClinica>,
    @InjectModel(NotaMedica.name) private notaMedicaModel: Model<NotaMedica>,
    @InjectModel(NotaAclaratoria.name)
    private notaAclaratoriaModel: Model<NotaAclaratoria>,
    @InjectModel(ControlPrenatal.name)
    private controlPrenatalModel: Model<ControlPrenatal>,
    @InjectModel(Trabajador.name) private trabajadorModel: Model<Trabajador>,
    @InjectModel(HistoriaOtologica.name)
    private historiaOtologicaModel: Model<HistoriaOtologica>,
    @InjectModel(PrevioEspirometria.name)
    private previoEspirometriaModel: Model<PrevioEspirometria>,
    @InjectModel(Receta.name) private recetaModel: Model<Receta>,
    @InjectModel(ConstanciaAptitud.name)
    private constanciaAptitudModel: Model<ConstanciaAptitud>,
    @InjectModel(EntrevistaPsicologica.name)
    private entrevistaPsicologicaModel: Model<EntrevistaPsicologica>,
    @InjectModel(TrastornosEstadoAnimo.name)
    private trastornosEstadoAnimoModel: Model<TrastornosEstadoAnimo>,
    @InjectModel(CuestionarioProdromalBreve.name)
    private cuestionarioProdromalBreveModel: Model<CuestionarioProdromalBreve>,
    @InjectModel(TrastornoLimitePersonalidad.name)
    private trastornoLimitePersonalidadModel: Model<TrastornoLimitePersonalidad>,
    @InjectModel(Deteccion.name) private deteccionModel: Model<Deteccion>,
    @InjectModel(EventoSeguimientoCardiometabolico.name)
    private eventoSeguimientoCardiometabolicoModel: Model<EventoSeguimientoCardiometabolico>,
    @InjectModel(InformeLongitudinalCardiometabolico.name)
    private informeLongitudinalCardiometabolicoModel: Model<InformeLongitudinalCardiometabolico>,
    @InjectModel(InformeLongitudinalAudiometrico.name)
    private informeLongitudinalAudiometricoModel: Model<InformeLongitudinalAudiometrico>,
    @InjectModel(ResultadoClinico.name)
    private resultadoClinicoModel: Model<ResultadoClinico>,
    @InjectModel(CentroTrabajo.name)
    private centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(Empresa.name) private empresaModel: Model<Empresa>,
    private readonly consentimientosService: ConsentimientosService,
    private readonly filesService: FilesService,
    private readonly nom024Util: NOM024ComplianceUtil,
    private readonly catalogsService: CatalogsService,
    private readonly cie10CatalogLookupService: Cie10CatalogLookupService,
    @Inject(forwardRef(() => InformesService))
    private readonly informesService: InformesService,
    private readonly proveedoresSaludService: ProveedoresSaludService,
    @Inject(forwardRef(() => RegulatoryPolicyService))
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
    private readonly workerFusionService: WorkerFusionService,
    private readonly organizationalAccessService: OrganizationalAccessService,
    private readonly firmanteHelper: FirmanteHelper,
    private readonly cexCatalogResolver: CexCatalogResolver,
    private readonly fichaSnapshotService: FichaSnapshotService,
    @InjectConnection() private readonly connection: Connection,
  ) {
    this.models = {
      antidoping: this.antidopingModel,
      aptitud: this.aptitudModel,
      audiometria: this.audiometriaModel,
      certificado: this.certificadoModel,
      certificadoExpedito: this.certificadoExpeditoModel,
      documentoExterno: this.documentoExternoModel,
      examenVista: this.examenVistaModel,
      exploracionFisica: this.exploracionFisicaModel,
      historiaClinica: this.historiaClinicaModel,
      notaMedica: this.notaMedicaModel,
      notaAclaratoria: this.notaAclaratoriaModel,
      controlPrenatal: this.controlPrenatalModel,
      historiaOtologica: this.historiaOtologicaModel,
      previoEspirometria: this.previoEspirometriaModel,
      receta: this.recetaModel,
      constanciaAptitud: this.constanciaAptitudModel,
      entrevistaPsicologica: this.entrevistaPsicologicaModel,
      trastornosEstadoAnimo: this.trastornosEstadoAnimoModel,
      cuestionarioProdromalBreve: this.cuestionarioProdromalBreveModel,
      trastornoLimitePersonalidad: this.trastornoLimitePersonalidadModel,
      eventoSeguimientoCardiometabolico:
        this.eventoSeguimientoCardiometabolicoModel,
      informeLongitudinalCardiometabolico:
        this.informeLongitudinalCardiometabolicoModel,
      informeLongitudinalAudiometrico:
        this.informeLongitudinalAudiometricoModel,
    };

    this.dateFields = {
      antidoping: 'fechaAntidoping',
      aptitud: 'fechaAptitudPuesto',
      audiometria: 'fechaAudiometria',
      certificado: 'fechaCertificado',
      certificadoExpedito: 'fechaCertificadoExpedito',
      documentoExterno: 'fechaDocumento',
      examenVista: 'fechaExamenVista',
      exploracionFisica: 'fechaExploracionFisica',
      historiaClinica: 'fechaHistoriaClinica',
      notaMedica: 'fechaNotaMedica',
      notaAclaratoria: 'fechaNotaAclaratoria',
      controlPrenatal: 'fechaInicioControlPrenatal',
      historiaOtologica: 'fechaHistoriaOtologica',
      previoEspirometria: 'fechaPrevioEspirometria',
      receta: 'fechaReceta',
      constanciaAptitud: 'fechaConstanciaAptitud',
      entrevistaPsicologica: 'fechaEntrevistaPsicologica',
      trastornosEstadoAnimo: 'fechaTrastornosEstadoAnimo',
      cuestionarioProdromalBreve: 'fechaCuestionarioProdromalBreve',
      trastornoLimitePersonalidad: 'fechaTrastornoLimitePersonalidad',
      eventoSeguimientoCardiometabolico:
        'fechaEventoSeguimientoCardiometabolico',
      informeLongitudinalCardiometabolico:
        'fechaInformeLongitudinalCardiometabolico',
      informeLongitudinalAudiometrico:
        'fechaInformeLongitudinalAudiometrico',
    };

    this.documentTypeToStoreKey = {
      antidoping: 'antidopings',
      aptitud: 'aptitudes',
      audiometria: 'audiometrias',
      certificado: 'certificados',
      certificadoExpedito: 'certificadosExpedito',
      documentoExterno: 'documentosExternos',
      examenVista: 'examenesVista',
      exploracionFisica: 'exploracionesFisicas',
      historiaClinica: 'historiasClinicas',
      notaMedica: 'notasMedicas',
      notaAclaratoria: 'notasAclaratorias',
      controlPrenatal: 'controlPrenatal',
      historiaOtologica: 'historiaOtologica',
      previoEspirometria: 'previoEspirometria',
      receta: 'recetas',
      constanciaAptitud: 'constanciasAptitud',
      entrevistaPsicologica: 'entrevistasPsicologicas',
      trastornosEstadoAnimo: 'trastornosEstadoAnimo',
      cuestionarioProdromalBreve: 'cuestionarioProdromalBreve',
      trastornoLimitePersonalidad: 'trastornoLimitePersonalidad',
      eventoSeguimientoCardiometabolico: 'eventoSeguimientoCardiometabolico',
      informeLongitudinalCardiometabolico:
        'informeLongitudinalCardiometabolico',
      informeLongitudinalAudiometrico: 'informeLongitudinalAudiometrico',
    };
  }

  private requireActorUserId(actorUserId?: string): string {
    if (!actorUserId) {
      throw new UnauthorizedException(
        'Se requiere un usuario autenticado para acceder a este recurso',
      );
    }
    return actorUserId;
  }

  private resolveDocumentModel(documentType: string): Model<any> | undefined {
    if (documentType === 'deteccion') {
      return this.deteccionModel;
    }
    return this.models[documentType];
  }

  /**
   * Canónico del trabajador → OAS. Devuelve el id canónico autorizado.
   * No consulta historial de fusión: si A no existe, OAS(A) → 404.
   */
  private async assertActorCanAccessTrabajador(
    actorUserId: string,
    trabajadorId: string,
  ): Promise<string> {
    const userId = this.requireActorUserId(actorUserId);
    const canonicalId =
      await this.workerFusionService.getCanonicalTrabajadorId(trabajadorId);
    await this.organizationalAccessService.assertUserCanAccessTrabajadorId(
      userId,
      canonicalId,
    );
    return canonicalId;
  }

  /**
   * Stub {_id, idTrabajador} sin populate clínico → OAS del trabajador real.
   * Si el documento no existe, devuelve null para que el caller conserve
   * el contrato actual (GET 200+mensaje; mutación 400).
   */
  private async assertActorCanAccessDocument(
    actorUserId: string,
    documentType: string,
    id: string,
  ): Promise<{ _id?: unknown; idTrabajador?: unknown } | null> {
    const userId = this.requireActorUserId(actorUserId);
    const model = this.resolveDocumentModel(documentType);
    if (!model) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }

    const query = model.findById(id);
    if (typeof query.select === 'function') {
      query.select('_id idTrabajador');
    }
    let stub: { _id?: unknown; idTrabajador?: unknown } | null = null;
    if (typeof query.lean === 'function') {
      const leanQuery = query.lean();
      const raw =
        leanQuery && typeof leanQuery.exec === 'function'
          ? await leanQuery.exec()
          : await leanQuery;
      stub = Array.isArray(raw) ? raw[0] ?? null : raw;
    } else if (typeof query.exec === 'function') {
      stub = await query.exec();
    } else {
      stub = await query;
    }

    if (!stub) {
      return null;
    }

    const trabajadorId =
      stub.idTrabajador != null
        ? (stub.idTrabajador as { toString?: () => string }).toString?.() ??
          String(stub.idTrabajador)
        : '';
    if (!trabajadorId) {
      throw new BadRequestException(
        `Documento con ID ${id} no tiene trabajador asociado`,
      );
    }

    await this.assertActorCanAccessTrabajador(userId, trabajadorId);
    return stub;
  }

  /**
   * Validate CIE-10 codes for documents with diagnosis fields (MX providers only)
   * NOM-024 GIIS-B015: Extended validation with cross-checks (sex, age, special cases)
   */
  private documentHasCie10Codes(dto: any, documentType: string): boolean {
    if (dto?.codigoCIE10Principal?.trim()) return true;
    if (
      Array.isArray(dto?.codigosCIE10Complementarios) &&
      dto.codigosCIE10Complementarios.some(
        (codigo: string) => codigo && String(codigo).trim() !== '',
      )
    ) {
      return true;
    }
    if (documentType === 'notaMedica') {
      if (dto?.codigoCIEDiagnostico2?.trim()) return true;
      if (dto?.codigoCIEDiagnostico3?.trim()) return true;
    }
    return false;
  }

  private async validateCIE10ForDocument(
    documentType: string,
    dto: any,
    trabajadorId: string,
    regimeCtx?: DocumentRegimeContext | null,
  ): Promise<void> {
    // Only validate for NotaMedica and HistoriaClinica (documents that require CIE-10)
    if (documentType !== 'notaMedica' && documentType !== 'historiaClinica') {
      return;
    }

    const proveedorSaludId =
      regimeCtx?.proveedorSaludId ??
      (await this.getProveedorSaludIdFromTrabajador(trabajadorId));
    if (!proveedorSaludId) {
      // If we can't determine provider, allow (backward compatibility)
      return;
    }

    const policy =
      regimeCtx?.policy ??
      (await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId));

    const requirePrimeraVezDiag23 = policy.regime === 'SIRES_NOM024';

    // Validate CIE-10 principal required based on policy
    // IMPORTANTE: Esta validación solo aplica a notas médicas, NO a historias clínicas
    if (
      policy.validation.cie10Principal === 'required' &&
      documentType === 'notaMedica'
    ) {
      // SIRES: CIE-10 principal is mandatory only for notas médicas
      const cie10FieldName = 'codigoCIE10Principal';
      const cie10Value = dto[cie10FieldName];

      if (!cie10Value || cie10Value.trim() === '') {
        throw createRegulatoryError({
          errorCode: RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED,
          details: { fieldName: 'cie10Principal' },
          regime: policy.regime,
        });
      }
    }

    // Sin códigos que validar: evitar lookups de trabajador/catálogo
    if (!this.documentHasCie10Codes(dto, documentType)) {
      return;
    }

    // SIRES provider: validate CIE-10 codes with cross-checks (format, catalog, sex/age)
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Obtener trabajador (sexo, fechaNacimiento)
    const trabajador =
      regimeCtx?.trabajador ??
      (await this.trabajadorModel.findById(trabajadorId).lean());
    if (!trabajador) {
      throw new BadRequestException('Trabajador no encontrado');
    }

    const fechaNacimiento = trabajador.fechaNacimiento
      ? new Date(trabajador.fechaNacimiento)
      : null;
    const fechaNotaMedica = dto.fechaNotaMedica
      ? new Date(dto.fechaNotaMedica)
      : null;

    // 3. Mapear sexo a numérico GIIS (1/2/3)
    const sexoBiologico = mapSexoToGiisBiologico(trabajador.sexo);

    // Helper function to extract code from "CODE - DESCRIPTION" format
    const extractCodeFromFullText = (value: string): string => {
      if (!value) return '';
      // Si ya es solo código (no tiene " - "), retornar tal cual
      if (!value.includes(' - ')) return value.trim();
      // Extraer código antes de " - "
      return value.split(' - ')[0].trim();
    };

    // Helper: valida un código y devuelve issues (sin mutar arrays compartidos;
    // permite Promise.all conservando orden al fusionar resultados).
    const validateCIE10Code = async (
      codigo: string,
      tipo: 'principal' | 'secundario' | 'diagnostico2' | 'diagnostico3',
    ): Promise<{ errors: string[]; warnings: string[] }> => {
      const localErrors: string[] = [];
      const localWarnings: string[] = [];

      if (!codigo || codigo.trim() === '') {
        return { errors: localErrors, warnings: localWarnings };
      }

      // Extraer solo el código del formato "CODE - DESCRIPTION"
      const codigoNormalizado = extractCodeFromFullText(codigo).toUpperCase();

      if (
        documentType === 'notaMedica' &&
        !isCIE10Exact4Chars(codigoNormalizado)
      ) {
        localErrors.push(
          `Código CIE-10 ${tipo} inválido: debe tener exactamente 4 caracteres (CATALOG_KEY DIAGNOSTICO_SIS).`,
        );
        return { errors: localErrors, warnings: localWarnings };
      }

      // Validar existencia en catálogo
      const isValid =
        await this.catalogsService.validateCIE10(codigoNormalizado);
      if (!isValid) {
        localErrors.push(
          `Código CIE-10 ${tipo} inválido: ${codigoNormalizado}. No se encuentra en el catálogo CIE-10`,
        );
        return { errors: localErrors, warnings: localWarnings };
      }

      // Obtener entrada del catálogo para validaciones cruzadas
      const entry = (await this.catalogsService.getCatalogEntry(
        CatalogType.CIE10,
        codigoNormalizado,
      )) as CIE10Entry | null;

      if (!entry) {
        return { errors: localErrors, warnings: localWarnings };
      }

      // Validar diagnósticos exclusivos
      // Si código es R69X → emitir warning (no bloqueante)
      if (codigoNormalizado.startsWith('R69')) {
        localWarnings.push(
          `Advertencia: El código ${codigoNormalizado} (Morbilidad desconocida) se tolera máximo un 5% por carga. Se recomienda especificar más el diagnóstico si es posible.`,
        );
      }

      return { errors: localErrors, warnings: localWarnings };
    };

    const mergeCie10Results = (
      results: Array<{ errors: string[]; warnings: string[] }>,
    ): void => {
      for (const result of results) {
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      }
    };

    // Validate primary + complementary CIE-10 codes in parallel (independent lookups)
    // IMPORTANTE: La obligatoriedad solo aplica a notas médicas, no a historias clínicas
    // La validación de obligatoriedad ya se hizo arriba basándose en la política regulatoria
    const codigoPrincipalFull = dto.codigoCIE10Principal?.trim() || '';

    const validatePrincipalTask = async (): Promise<{
      errors: string[];
      warnings: string[];
    }> => {
      if (!codigoPrincipalFull) {
        return { errors: [], warnings: [] };
      }

      if (documentType === 'notaMedica') {
        const localErrors: string[] = [];
        const localWarnings: string[] = [];
        let tipoPersonal: number | null = null;
        const userId = dto.createdBy || dto.updatedBy;
        if (userId) {
          const prestador = await this.firmanteHelper.getPrestadorDataFromUser(
            String(userId),
          );
          tipoPersonal = prestador?.tipoPersonal ?? null;
        }

        const diag1Issues = await validateCodigoCIEDiagnostico1({
          codigoCIE10Principal: codigoPrincipalFull,
          relacionTemporal: dto.relacionTemporal,
          sexoBiologico,
          fechaNacimiento,
          fechaNotaMedica,
          tipoPersonal,
          lookup: this.cie10CatalogLookupService.findDiagnosisRule.bind(
            this.cie10CatalogLookupService,
          ),
          catalogExists: (key) => this.catalogsService.validateCIE10(key),
        });
        for (const issue of diag1Issues) {
          localErrors.push(issue.message);
        }

        const codigoNorm =
          extractCodeFromFullText(codigoPrincipalFull).toUpperCase();
        if (codigoNorm.startsWith('R69')) {
          localWarnings.push(
            `Advertencia: El código ${codigoNorm} (Morbilidad desconocida) se tolera máximo un 5% por carga. Se recomienda especificar más el diagnóstico si es posible.`,
          );
        }
        return { errors: localErrors, warnings: localWarnings };
      }

      return validateCIE10Code(codigoPrincipalFull, 'principal');
    };

    const validateComplementariosTask = async (): Promise<{
      errors: string[];
      warnings: string[];
    }> => {
      if (
        !dto.codigosCIE10Complementarios ||
        !Array.isArray(dto.codigosCIE10Complementarios)
      ) {
        return { errors: [], warnings: [] };
      }

      const codesToValidate = dto.codigosCIE10Complementarios.filter(
        (codigo: string) => codigo && codigo.trim() !== '',
      );
      if (codesToValidate.length === 0) {
        return { errors: [], warnings: [] };
      }

      const results = await Promise.all(
        codesToValidate.map((codigo: string) =>
          validateCIE10Code(codigo, 'secundario'),
        ),
      );

      const localErrors: string[] = [];
      const localWarnings: string[] = [];
      for (const result of results) {
        localErrors.push(...result.errors);
        localWarnings.push(...result.warnings);
      }
      return { errors: localErrors, warnings: localWarnings };
    };

    // Principal y complementarios son independientes → en paralelo;
    // al fusionar: primero principal, luego complementarios (mismo orden de mensajes).
    const [principalResult, complementariosResult] = await Promise.all([
      validatePrincipalTask(),
      validateComplementariosTask(),
    ]);
    mergeCie10Results([principalResult, complementariosResult]);
    // Si no hay código principal, la validación de obligatoriedad ya se hizo arriba

    // Validar Regla B4: No duplicar principal en complementarios
    // IMPORTANTE: Esta validación solo aplica a notas médicas
    // Early-exit: si B4 falla, no se continúan diag 2/3 ni confirmación.
    if (documentType === 'notaMedica') {
      const duplicateCheck = validateNoDuplicateCIE10PrincipalAndComplementary(
        dto.codigoCIE10Principal,
        dto.codigosCIE10Complementarios,
      );
      if (!duplicateCheck.isValid) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          ruleId: 'B4',
          message:
            'El diagnóstico principal no puede repetirse en los diagnósticos complementarios',
          details: [
            {
              field: 'codigosCIE10Complementarios',
              duplicatedCode: duplicateCheck.duplicated,
            },
          ],
        });
      }
    }

    // Validate diag 2/3 (codigoCIEDiagnostico2/3) — DIAGNOSTICO_SIS completo
    if (documentType === 'notaMedica') {
      let tipoPersonal: number | null = null;
      const userId = dto.createdBy || dto.updatedBy;
      if (userId) {
        const prestador = await this.firmanteHelper.getPrestadorDataFromUser(
          String(userId),
        );
        tipoPersonal = prestador?.tipoPersonal ?? null;
      }
      const cexTp = this.cexCatalogResolver.getCodes().tipoPersonal;
      const lookup = this.cie10CatalogLookupService.findDiagnosisRule.bind(
        this.cie10CatalogLookupService,
      );
      const catalogExists = (key: string) =>
        this.catalogsService.validateCIE10(key);

      // diag2 y diag3 son lookups independientes (usan valores del DTO, no el resultado del otro)
      const [diag2Issues, diag3Issues] = await Promise.all([
        validateCodigoCIEDiagnostico23({
          field: 'codigoCIEDiagnostico2',
          codigo: dto.codigoCIEDiagnostico2,
          primeraVez: dto.primeraVezDiagnostico2,
          codigoCIEDiagnostico1: codigoPrincipalFull,
          sexoBiologico,
          fechaNacimiento,
          fechaNotaMedica,
          tipoPersonal,
          tipoPersonalMedicoGeneral: cexTp.medicoGeneral,
          tipoPersonalMedicoEspecialista: cexTp.medicoEspecialista,
          lookup,
          catalogExists,
          requirePrimeraVez: requirePrimeraVezDiag23,
        }),
        validateCodigoCIEDiagnostico23({
          field: 'codigoCIEDiagnostico3',
          codigo: dto.codigoCIEDiagnostico3,
          primeraVez: dto.primeraVezDiagnostico3,
          primeraVezDiagnostico2: dto.primeraVezDiagnostico2,
          codigoCIEDiagnostico1: codigoPrincipalFull,
          codigoCIEDiagnostico2: dto.codigoCIEDiagnostico2,
          sexoBiologico,
          fechaNacimiento,
          fechaNotaMedica,
          tipoPersonal,
          tipoPersonalMedicoGeneral: cexTp.medicoGeneral,
          tipoPersonalMedicoEspecialista: cexTp.medicoEspecialista,
          lookup,
          catalogExists,
          requirePrimeraVez: requirePrimeraVezDiag23,
        }),
      ]);
      for (const issue of diag2Issues) {
        errors.push(issue.message);
      }
      for (const issue of diag3Issues) {
        errors.push(issue.message);
      }

      const confirmacionIssues = await validateConfirmacionDiagnosticaFields({
        confirmacionDiagnostica: dto.confirmacionDiagnostica,
        confirmacionDiagnostica2: dto.confirmacionDiagnostica2,
        confirmacionDiagnostica3: dto.confirmacionDiagnostica3,
        codigoCIE10Principal: codigoPrincipalFull,
        codigoCIEDiagnostico2: dto.codigoCIEDiagnostico2,
        codigoCIEDiagnostico3: dto.codigoCIEDiagnostico3,
        relacionTemporal: dto.relacionTemporal,
        primeraVezDiagnostico2: dto.primeraVezDiagnostico2,
        primeraVezDiagnostico3: dto.primeraVezDiagnostico3,
        tipoPersonal,
        fechaNacimiento: trabajador.fechaNacimiento,
        fechaNotaMedica: dto.fechaNotaMedica,
        lookup,
      });
      for (const issue of confirmacionIssues) {
        errors.push(issue.message);
      }

      // Sexo/edad solo complementarios (principal y diag2/3 ya validados arriba)
      if (trabajador.sexo && trabajador.fechaNacimiento) {
        const compOnly = [
          {
            field: 'codigosCIE10Complementarios',
            value: dto.codigosCIE10Complementarios || [],
          },
        ];
        const compSexAge = await validateCie10SexAgeAgainstCatalog({
          trabajadorSexo: trabajador.sexo,
          trabajadorFechaNacimiento: trabajador.fechaNacimiento,
          fechaNotaMedica: dto.fechaNotaMedica,
          cie10Fields: compOnly,
          lookup,
        });
        if (!compSexAge.ok && compSexAge.issues.length > 0) {
          for (const issue of compSexAge.issues) {
            errors.push(
              `Diagnóstico complementario ${issue.cie10}: ${issue.reason} (sexo/edad).`,
            );
          }
        }
      }
    }

    // Lanzar errores bloqueantes
    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }

    // Log warnings (no bloqueantes)
    if (warnings.length > 0) {
      console.warn('Validación CIE-10 - Advertencias:', warnings.join('; '));
    }
  }

  private supportsFichaSnapshot(documentType: string): boolean {
    return documentType !== 'documentoExterno' && !!this.models[documentType];
  }

  private async tryCapturarFichaSnapshot(args: {
    documentType: string;
    trabajadorId?: string | null;
    creadorId?: string | null;
    finalizadorId?: string | null;
  }): Promise<FichaSnapshot | null> {
    if (!this.supportsFichaSnapshot(args.documentType) || !args.trabajadorId) {
      return null;
    }
    try {
      return await this.fichaSnapshotService.capturar({
        trabajadorId: String(args.trabajadorId),
        creadorId: args.creadorId,
        finalizadorId: args.finalizadorId,
      });
    } catch (error) {
      console.warn(
        `[fichaSnapshot] No se pudo capturar (${args.documentType}):`,
        (error as Error)?.message || error,
      );
      return null;
    }
  }

  async createDocument(
    documentType: string,
    createDto: any,
    actorUserId: string,
    trabajadorIdFromUrl: string,
    consentCtx?: TreatmentConsentRequestContext | null,
  ): Promise<any> {
    const model = this.models[documentType];

    if (!model) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }

    assertTrabajadorIdsConsistent(trabajadorIdFromUrl, createDto?.idTrabajador);
    createDto.idTrabajador = trabajadorIdFromUrl;

    const canonicalFromUrl = await this.assertActorCanAccessTrabajador(
      actorUserId,
      trabajadorIdFromUrl,
    );
    createDto.idTrabajador = canonicalFromUrl;

    // NOM-024: Resolver a trabajador canónico (fusión de registros)
    // Reutiliza el canónico del TreatmentConsentGuard si ya se resolvió en el request.
    if (createDto.idTrabajador) {
      if (consentCtx?.canonicalTrabajadorId) {
        createDto.idTrabajador = consentCtx.canonicalTrabajadorId;
      } else {
        createDto.idTrabajador =
          await this.workerFusionService.getCanonicalTrabajadorId(
            createDto.idTrabajador,
          );
      }
    }

    const regimeCtx = createDto.idTrabajador
      ? this.regimeContextFromConsentRequest(
          createDto.idTrabajador,
          consentCtx,
        ) ?? (await this.resolveDocumentRegimeContext(createDto.idTrabajador))
      : null;

    // Validaciones independientes en paralelo (prioridad = orden previo secuencial)
    const createDateField = this.dateFields[documentType];
    const createValidationTasks: Array<() => Promise<void>> = [];

    if (createDto.idTrabajador) {
      createValidationTasks.push(
        () =>
          this.assertDocumentTypeEnabledForRegime(
            documentType,
            createDto.idTrabajador,
            regimeCtx,
          ),
        () =>
          this.validateCIE10ForDocument(
            documentType,
            createDto,
            createDto.idTrabajador,
            regimeCtx,
          ),
        () =>
          this.validateVitalSignsForNOM024(
            createDto,
            createDto.idTrabajador,
            regimeCtx,
            documentType,
          ),
      );

      if (createDateField && createDto[createDateField]) {
        createValidationTasks.push(() =>
          this.validateDocumentDateE1(
            createDto.idTrabajador,
            createDto[createDateField],
            documentType,
            regimeCtx,
          ),
        );
      }

      if (documentType === 'notaMedica') {
        createValidationTasks.push(() =>
          this.validateAndNormalizeEmbarazoForNotaMedica(
            createDto,
            createDto.idTrabajador,
            regimeCtx,
          ),
        );
        createValidationTasks.push(() =>
          this.validateDerechohabienciaAgainstAfiliacionCatalog(
            createDto.derechohabiencia,
          ),
        );
      }
    }

    if (documentType === 'notaAclaratoria') {
      createValidationTasks.push(() =>
        this.assertNotaAclaratoriaCreateAllowed(
          createDto,
          actorUserId,
          regimeCtx,
        ),
      );
    }

    await this.runValidationsInPriorityOrder(createValidationTasks);

    // Vincular consentimiento para tratamiento de información (SIRES)
    if (
      createDto.idTrabajador &&
      regimeCtx?.proveedorSaludId &&
      regimeCtx.policy?.features.dailyConsentEnabled
    ) {
      try {
        if (consentCtx?.consentimientoId) {
          createDto.consentimientoId = consentCtx.consentimientoId;
        } else if (
          consentCtx?.proveedorSaludId &&
          consentCtx.canonicalTrabajadorId
        ) {
          const consentimiento =
            await this.consentimientosService.findCurrentConsentimientoByResolvedIds(
              consentCtx.proveedorSaludId,
              consentCtx.canonicalTrabajadorId,
            );
          if (consentimiento?._id) {
            createDto.consentimientoId = consentimiento._id;
          }
        } else {
          const consentimiento =
            await this.consentimientosService.findCurrentConsentimientoForTrabajador(
              createDto.idTrabajador,
            );
          if (consentimiento?._id) {
            createDto.consentimientoId = consentimiento._id;
          }
        }
      } catch (error) {
        console.warn('Error al obtener consentimiento para documento:', error);
      }
    }

    // notaMedica: null/undefined CEX → sentinels GIIS (0 / 999) para persistencia e intercambio
    const createPayload =
      documentType === 'notaMedica'
        ? normalizeNotaMedicaCexSentinels(createDto)
        : { ...createDto };
    delete createPayload.fichaSnapshot;

    const fichaSnapshot = await this.tryCapturarFichaSnapshot({
      documentType,
      trabajadorId: createPayload.idTrabajador,
      creadorId: createPayload.createdBy,
    });
    if (fichaSnapshot) {
      createPayload.fichaSnapshot = fichaSnapshot;
    }

    const createdDocument = new model(createPayload);
    const savedDocument = await createdDocument.save();

    // ✅ Actualizar el updatedAt del trabajador
    if (createDto.idTrabajador) {
      await this.actualizarUpdatedAtTrabajador(createDto.idTrabajador);
    }

    // CLASS_2: no bloquear la respuesta HTTP
    this.enqueueSoftAudit(
      this.recordDocDraftCreated({
        documentType,
        documentId: savedDocument._id.toString(),
        trabajadorId: createDto.idTrabajador ?? null,
        actorId: createDto.createdBy,
        source: 'createDocument',
        proveedorSaludId: regimeCtx?.proveedorSaludId,
      }),
      'DOC_CREATE_DRAFT',
    );

    return savedDocument;
  }

  /**
   * Ejecuta validaciones en paralelo y relanza el primer fallo según el orden
   * de `tasks` (misma prioridad de mensajes que la ejecución secuencial previa).
   */
  private async runValidationsInPriorityOrder(
    tasks: Array<() => Promise<void>>,
  ): Promise<void> {
    if (tasks.length === 0) {
      return;
    }
    const results = await Promise.allSettled(tasks.map((task) => task()));
    for (const result of results) {
      if (result.status === 'rejected') {
        throw result.reason;
      }
    }
  }

  private async assertNotaAclaratoriaCreateAllowed(
    createDto: any,
    actorUserId: string,
    regimeCtx?: DocumentRegimeContext | null,
  ): Promise<void> {
    if (!regimeCtx?.trabajador) {
      throw new BadRequestException('Trabajador no encontrado');
    }
    if (!regimeCtx.proveedorSaludId || !regimeCtx.policy) {
      throw new BadRequestException(
        'No se pudo determinar el proveedor de salud del trabajador',
      );
    }

    const policy = regimeCtx.policy;

    if (!policy.features.notaAclaratoriaEnabled) {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.REGIMEN_FEATURE_DISABLED,
        details: { feature: 'notaAclaratoria' },
        regime: policy.regime,
      });
    }

    const documentoOrigen = await this.findDocumentSelect(
      createDto.documentoOrigenTipo,
      createDto.documentoOrigenId,
      'estado',
      actorUserId,
    );
    if (!documentoOrigen) {
      throw new BadRequestException('Documento origen no encontrado');
    }

    if (
      documentoOrigen.estado !== DocumentoEstado.FINALIZADO &&
      documentoOrigen.estado !== DocumentoEstado.ANULADO
    ) {
      throw new BadRequestException(
        'Solo se pueden crear notas aclaratorias para documentos finalizados o anulados',
      );
    }
  }

  private regimeContextFromConsentRequest(
    trabajadorId: string,
    consentCtx?: TreatmentConsentRequestContext | null,
  ): DocumentRegimeContext | null {
    if (!consentCtx?.proveedorSaludId || !consentCtx.policy) {
      return null;
    }
    return {
      trabajadorId,
      trabajador: consentCtx.trabajador ?? null,
      proveedorSaludId: consentCtx.proveedorSaludId,
      policy: consentCtx.policy,
    };
  }

  private async resolveDocumentRegimeContext(
    trabajadorId: string,
  ): Promise<DocumentRegimeContext> {
    const chain = await resolveTrabajadorProveedorChain(
      trabajadorId,
      this.trabajadorModel,
      this.centroTrabajoModel,
      this.empresaModel,
    );

    const policy = chain.proveedorSaludId
      ? await this.regulatoryPolicyService.getRegulatoryPolicy(
          chain.proveedorSaludId,
        )
      : null;

    return {
      trabajadorId,
      trabajador: chain.trabajador,
      proveedorSaludId: chain.proveedorSaludId,
      policy,
    };
  }

  private enqueueSoftAudit(promise: Promise<void>, label: string): void {
    void promise.catch((error) => {
      console.warn(`Audit ${label} failed (non-blocking):`, error);
    });
  }

  private async validateDocumentDateE1(
    trabajadorId: string,
    fechaDocumento: Date | string,
    documentType?: string,
    regimeCtx?: DocumentRegimeContext | null,
  ): Promise<void> {
    await validateDocumentDateE1ForRegime(
      {
        trabajadorModel: this.trabajadorModel,
        centroTrabajoModel: this.centroTrabajoModel,
        empresaModel: this.empresaModel,
        regulatoryPolicyService: this.regulatoryPolicyService,
      },
      {
        trabajadorId,
        fechaDocumento,
        documentType,
        ...(regimeCtx
          ? {
              proveedorSaludId: regimeCtx.proveedorSaludId,
              policy: regimeCtx.policy,
              fechaNacimiento: regimeCtx.trabajador?.fechaNacimiento ?? null,
            }
          : {}),
      },
    );
  }

  /**
   * Get ProveedorSalud ID from a trabajador ID
   */
  private async getProveedorSaludIdFromTrabajador(
    trabajadorId: string,
  ): Promise<string | null> {
    const chain = await resolveTrabajadorProveedorChain(
      trabajadorId,
      this.trabajadorModel,
      this.centroTrabajoModel,
      this.empresaModel,
    );
    return chain.proveedorSaludId;
  }

  /**
   * Valida que el tipo de documento esté habilitado según el régimen regulatorio
   */
  private async assertDocumentTypeEnabledForRegime(
    documentType: string,
    trabajadorId: string,
    regimeCtx?: DocumentRegimeContext | null,
  ): Promise<void> {
    if (documentType !== 'controlPrenatal') {
      return;
    }

    const proveedorSaludId =
      regimeCtx?.proveedorSaludId ??
      (await this.getProveedorSaludIdFromTrabajador(trabajadorId));
    if (!proveedorSaludId) {
      return;
    }

    const policy =
      regimeCtx?.policy ??
      (await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId));

    if (!policy.features.controlPrenatalEnabled) {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.REGIMEN_FEATURE_DISABLED,
        details: { feature: 'controlPrenatal', documentType: 'controlPrenatal' },
        regime: policy.regime,
      });
    }
  }

  /**
   * Get ProveedorSalud ID from a document's trabajador
   */
  private async getProveedorSaludIdFromDocument(
    document: any,
  ): Promise<string | null> {
    const trabajadorId = document.idTrabajador?.toString();
    if (!trabajadorId) {
      return null;
    }
    return this.getProveedorSaludIdFromTrabajador(trabajadorId);
  }

  private async resolveProveedorSaludIdOrFail(params: {
    trabajadorId?: string | null;
    actorId?: string | null;
    proveedorSaludId?: string | null;
  }): Promise<string> {
    const { trabajadorId, actorId, proveedorSaludId } = params;
    if (proveedorSaludId) return proveedorSaludId;
    if (trabajadorId) {
      const resolved =
        await this.getProveedorSaludIdFromTrabajador(trabajadorId);
      if (resolved) return resolved;
    }
    if (actorId) {
      const resolved =
        await this.usersService.getIdProveedorSaludByUserId(actorId);
      if (resolved) return resolved;
    }
    throw new BadRequestException(
      'No se pudo resolver proveedorSaludId para auditoría',
    );
  }

  private async recordDocDraftCreated(params: {
    documentType: string;
    documentId: string;
    trabajadorId?: string | null;
    actorId: string;
    source: 'createDocument' | 'updateOrCreateDocument';
    proveedorSaludId?: string | null;
  }): Promise<void> {
    const proveedorSaludId = await this.resolveProveedorSaludIdOrFail({
      trabajadorId: params.trabajadorId ?? null,
      actorId: params.actorId,
      proveedorSaludId: params.proveedorSaludId,
    });
    await this.auditService.record({
      proveedorSaludId,
      actorId: params.actorId,
      actionType: AuditActionType.DOC_CREATE_DRAFT,
      resourceType: params.documentType,
      resourceId: params.documentId,
      payload: {
        estadoNuevo: DocumentoEstado.BORRADOR,
        documentType: params.documentType,
        documentId: params.documentId,
        ...(params.trabajadorId ? { trabajadorId: params.trabajadorId } : {}),
        source: params.source,
      },
      eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
    });
  }

  private async recordDocDraftUpdated(params: {
    documentType: string;
    documentId: string;
    trabajadorId?: string | null;
    actorId: string;
    estadoActual: DocumentoEstado;
    changedKeys: string[];
    proveedorSaludId?: string | null;
  }): Promise<void> {
    const proveedorSaludId = await this.resolveProveedorSaludIdOrFail({
      trabajadorId: params.trabajadorId ?? null,
      actorId: params.actorId,
      proveedorSaludId: params.proveedorSaludId,
    });
    await this.auditService.record({
      proveedorSaludId,
      actorId: params.actorId,
      actionType: AuditActionType.DOC_UPDATE_DRAFT,
      resourceType: params.documentType,
      resourceId: params.documentId,
      payload: {
        estado: params.estadoActual,
        documentType: params.documentType,
        documentId: params.documentId,
        ...(params.trabajadorId ? { trabajadorId: params.trabajadorId } : {}),
        changedKeys: params.changedKeys,
      },
      eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
    });
  }

  private async recordDocAnulated(params: {
    documentType: string;
    documentId: string;
    trabajadorId?: string | null;
    actorId: string;
    estadoAnterior: DocumentoEstado;
    razonAnulacion?: string;
    fechaAnulacion?: Date | null;
  }): Promise<void> {
    const proveedorSaludId = await this.resolveProveedorSaludIdOrFail({
      trabajadorId: params.trabajadorId ?? null,
      actorId: params.actorId,
    });
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    if (policy.regime !== 'SIRES_NOM024') {
      return;
    }
    await this.auditService.record({
      proveedorSaludId,
      actorId: params.actorId,
      actionType: AuditActionType.DOC_ANULATE,
      resourceType: params.documentType,
      resourceId: params.documentId,
      payload: {
        estadoAnterior: params.estadoAnterior,
        estadoNuevo: DocumentoEstado.ANULADO,
        razonAnulacion: params.razonAnulacion ?? null,
        documentType: params.documentType,
        documentId: params.documentId,
        ...(params.trabajadorId ? { trabajadorId: params.trabajadorId } : {}),
        fechaAnulacion: params.fechaAnulacion
          ? params.fechaAnulacion.toISOString()
          : null,
      },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });
  }

  private async recordDocFinalized(params: {
    documentType: string;
    documentId: string;
    trabajadorId?: string | null;
    actorId: string;
    estadoAnterior: DocumentoEstado;
    fechaFinalizacion?: Date | null;
    motivo?: string;
    proveedorSaludId?: string | null;
    actorSnapshot?: { username: string; email: string; role: string } | null;
  }): Promise<void> {
    const proveedorSaludId = await this.resolveProveedorSaludIdOrFail({
      trabajadorId: params.trabajadorId ?? null,
      actorId: params.actorId,
      proveedorSaludId: params.proveedorSaludId,
    });
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    if (policy.regime !== 'SIRES_NOM024') {
      return;
    }
    await this.auditService.record({
      proveedorSaludId,
      actorId: params.actorId,
      actionType: AuditActionType.DOC_FINALIZE,
      resourceType: params.documentType,
      resourceId: params.documentId,
      payload: {
        estadoAnterior: params.estadoAnterior,
        estadoNuevo: DocumentoEstado.FINALIZADO,
        documentType: params.documentType,
        documentId: params.documentId,
        ...(params.trabajadorId ? { trabajadorId: params.trabajadorId } : {}),
        fechaFinalizacion: params.fechaFinalizacion
          ? params.fechaFinalizacion.toISOString()
          : null,
        ...(params.motivo ? { motivo: params.motivo } : {}),
      },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
      ...(params.actorSnapshot !== undefined && {
        actorSnapshot: params.actorSnapshot,
      }),
    });
  }

  /**
   * Verifica si un documento es inmutable según la política regulatoria
   * @param proveedorSaludId - ID del proveedor de salud
   * @param estado - Estado del documento (FINALIZADO, ANULADO, BORRADOR)
   * @returns Promise<boolean> - true si el documento es inmutable, false en caso contrario
   */
  private async isDocumentImmutable(
    proveedorSaludId: string,
    estado: DocumentoEstado,
    policy?: RegulatoryPolicy | null,
  ): Promise<boolean> {
    // Solo documentos FINALIZADOS o ANULADOS pueden ser inmutables
    if (
      estado !== DocumentoEstado.FINALIZADO &&
      estado !== DocumentoEstado.ANULADO
    ) {
      return false;
    }

    const resolvedPolicy =
      policy ??
      (await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId));

    // El documento es inmutable solo si la feature está habilitada
    return resolvedPolicy.features.documentImmutabilityEnabled;
  }

  /**
   * Normaliza y valida relacionTemporalEmbarazo / trimestreGestacional (CEX).
   */
  private async validateAndNormalizeEmbarazoForNotaMedica(
    dto: {
      relacionTemporalEmbarazo?: number;
      trimestreGestacional?: number;
      fechaNotaMedica?: Date | string;
    },
    trabajadorId: string,
    regimeCtx?: DocumentRegimeContext | null,
  ): Promise<void> {
    const trabajador =
      regimeCtx?.trabajador ??
      (await this.trabajadorModel.findById(trabajadorId).lean());
    if (!trabajador) {
      throw new BadRequestException('Trabajador no encontrado');
    }

    normalizarCamposEmbarazo(dto, trabajador);
    const validation = validarCamposEmbarazo(dto, trabajador);
    if (!validation.ok) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        ruleId: 'CEX_EMBARAZO',
        message: validation.message,
      });
    }
  }

  /**
   * Valida que cada código de derechohabiencia exista en catálogo AFILIACION.
   * No exige VIGENTE=1 (permite conservar valores históricos).
   * Si el catálogo no está cargado, no bloquea.
   */
  private async validateDerechohabienciaAgainstAfiliacionCatalog(
    derechohabiencia?: string | null,
  ): Promise<void> {
    if (derechohabiencia == null || String(derechohabiencia).trim() === '') {
      return;
    }
    if (!this.catalogsService.isCatalogLoaded(CatalogType.AFILIACION)) {
      return;
    }
    const codes = String(derechohabiencia)
      .split('&')
      .map((c) => c.trim())
      .filter(Boolean);
    for (const code of codes) {
      const result = this.catalogsService.validateGIISAfiliacion(code);
      if (!result.valid) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          ruleId: 'CEX_AFILIACION',
          message: `derechohabiencia: código "${code}" no encontrado en catálogo AFILIACION`,
          details: [{ field: 'derechohabiencia', code }],
        });
      }
    }
  }

  /**
   * Validate vital signs for NOM-024 compliance
   * - MX providers: Strict enforcement (throw errors)
   * - Non-MX providers: Warnings only (log but allow)
   *
   * Validates:
   * - Individual vital sign ranges (BP, HR, RR, Temp, SpO2)
   * - Blood pressure consistency (systolic > diastolic)
   * - Anthropometric consistency (weight/height/BMI)
   *
   * @param dto - DTO containing vital signs
   * @param trabajadorId - Trabajador ID to determine provider country
   */
  private async validateVitalSignsForNOM024(
    dto: any,
    trabajadorId: string,
    regimeCtx?: DocumentRegimeContext | null,
    documentType?: string,
  ): Promise<void> {
    // Nota Médica: contrato GIIS/CEX (no VITAL_SIGNS_RANGES genérico)
    if (documentType === 'notaMedica') {
      const cexError = validateNotaMedicaCexQuantities(dto, {
        includeSomatometriaGlucemia: true,
      });
      if (!cexError) return;

      const proveedorSaludId =
        regimeCtx?.proveedorSaludId ??
        (await this.getProveedorSaludIdFromTrabajador(trabajadorId));

      if (!proveedorSaludId) {
        console.warn(`NOM-024 NotaMedica CEX (provider unknown): ${cexError}`);
        return;
      }

      const requiresCompliance =
        await this.nom024Util.requiresNOM024Compliance(proveedorSaludId);

      if (requiresCompliance) {
        throw new BadRequestException(`NOM-024: ${cexError}`);
      }
      console.warn(`NOM-024 NotaMedica CEX (non-MX provider): ${cexError}`);
      return;
    }

    // Exploración Física y Certificado Expedito: el DTO es la fuente de verdad
    // de rangos. No revalidar con VITAL_SIGNS_RANGES (más estrecho).
    if (
      documentType === 'exploracionFisica' ||
      documentType === 'certificadoExpedito'
    ) {
      const bpValidation = validateBloodPressureConsistency(
        dto.tensionArterialSistolica,
        dto.tensionArterialDiastolica,
      );
      if (bpValidation.warnings.length > 0) {
        console.warn(
          `NOM-024 Vital Signs Warnings: ${bpValidation.warnings.join('; ')}`,
        );
      }
      if (bpValidation.isValid) {
        return;
      }

      const proveedorSaludIdEfCe =
        regimeCtx?.proveedorSaludId ??
        (await this.getProveedorSaludIdFromTrabajador(trabajadorId));

      if (!proveedorSaludIdEfCe) {
        console.warn(
          `NOM-024 Vital Signs Issues (provider unknown): ${bpValidation.errors.join('; ')}`,
        );
        return;
      }

      const requiresComplianceEfCe =
        await this.nom024Util.requiresNOM024Compliance(proveedorSaludIdEfCe);

      if (requiresComplianceEfCe) {
        throw new BadRequestException(
          `NOM-024: ${bpValidation.errors.join('. ')}`,
        );
      }
      console.warn(
        `NOM-024 Vital Signs Issues (non-MX provider): ${bpValidation.errors.join('; ')}`,
      );
      return;
    }

    // Extract vital signs from DTO
    const vitalSigns = extractVitalSignsFromDTO(dto);

    // Check if any vital signs are present
    const hasVitalSigns = Object.values(vitalSigns).some(
      (v) => v !== undefined && v !== null,
    );
    if (!hasVitalSigns) {
      return; // No vital signs to validate
    }

    // Validate vital signs
    const validation = validateVitalSigns(vitalSigns);

    // Log warnings for all providers
    if (validation.warnings.length > 0) {
      console.warn(
        `NOM-024 Vital Signs Warnings: ${validation.warnings.join('; ')}`,
      );
    }

    // Get provider country
    const proveedorSaludId =
      regimeCtx?.proveedorSaludId ??
      (await this.getProveedorSaludIdFromTrabajador(trabajadorId));

    if (!proveedorSaludId) {
      // If we can't determine provider, allow (backward compatibility)
      if (!validation.isValid) {
        console.warn(
          `NOM-024 Vital Signs Issues (provider unknown): ${validation.errors.join('; ')}`,
        );
      }
      return;
    }

    const requiresCompliance =
      await this.nom024Util.requiresNOM024Compliance(proveedorSaludId);

    if (requiresCompliance) {
      // MX provider: Strict enforcement - throw errors
      if (!validation.isValid) {
        throw new BadRequestException(
          `NOM-024: ${validation.errors.join('. ')}`,
        );
      }
    } else {
      // Non-MX provider: Log warnings only, do not block
      if (!validation.isValid) {
        console.warn(
          `NOM-024 Vital Signs Issues (non-MX provider): ${validation.errors.join('; ')}`,
        );
      }
    }
  }

  async updateOrCreateDocument(
    documentType: string,
    id: string,
    updateDto: any,
    actorUserId: string,
  ): Promise<any> {
    const model = this.models[documentType];
    const dateField = this.dateFields[documentType];

    if (!model || !dateField) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }

    const accessStub = await this.assertActorCanAccessDocument(
      actorUserId,
      documentType,
      id,
    );
    if (!accessStub) {
      throw new BadRequestException(`Documento con ID ${id} no encontrado`);
    }

    const persistedCanonical =
      await this.workerFusionService.getCanonicalTrabajadorId(
        String(
          (accessStub.idTrabajador as { toString?: () => string })?.toString?.() ??
            accessStub.idTrabajador,
        ),
      );

    if (updateDto?.idTrabajador) {
      const bodyCanonical =
        await this.workerFusionService.getCanonicalTrabajadorId(
          updateDto.idTrabajador,
        );
      if (bodyCanonical !== persistedCanonical) {
        throw new BadRequestException(
          'No se permite reasignar el documento a otro trabajador',
        );
      }
    }

    const newFecha = parseISO(updateDto[dateField]); // Convertimos a Date
    let trabajadorId = persistedCanonical;

    if (!newFecha) {
      throw new BadRequestException(
        `El campo ${dateField} es requerido para este documento`,
      );
    }

    updateDto.idTrabajador = trabajadorId;

    const regimeCtx = await this.resolveDocumentRegimeContext(trabajadorId);

    // assert + findById en paralelo (assert no depende del documento)
    const [, existingDocument] = await Promise.all([
      this.assertDocumentTypeEnabledForRegime(
        documentType,
        trabajadorId,
        regimeCtx,
      ),
      model.findById(id).exec(),
    ]);

    if (!existingDocument) {
      throw new BadRequestException(`Documento con ID ${id} no encontrado`);
    }

    // Check immutability based on regulatory policy
    const proveedorSaludId =
      regimeCtx.proveedorSaludId ??
      (await this.getProveedorSaludIdFromDocument(existingDocument));
    if (proveedorSaludId) {
      const policy =
        regimeCtx.policy ??
        (await this.regulatoryPolicyService.getRegulatoryPolicy(
          proveedorSaludId,
        ));
      const isImmutable = await this.isDocumentImmutable(
        proveedorSaludId,
        existingDocument.estado,
        policy,
      );
      if (isImmutable) {
        throw createRegulatoryError({
          errorCode: RegulatoryErrorCode.REGIMEN_DOCUMENT_IMMUTABLE,
          details: {
            documentState: existingDocument.estado,
            documentType: documentType,
          },
          regime: policy.regime,
        });
      }
    }

    const oldFecha = new Date(existingDocument[dateField]);
    const existingPlainForValidation =
      typeof existingDocument.toObject === 'function'
        ? existingDocument.toObject()
        : { ...existingDocument };

    // Validaciones independientes en paralelo (prioridad = orden previo secuencial)
    const updateValidationTasks: Array<() => Promise<void>> = [
      () =>
        this.validateVitalSignsForNOM024(
          updateDto,
          trabajadorId,
          regimeCtx,
          documentType,
        ),
    ];

    if (documentType === 'notaMedica') {
      const mergedDto = {
        ...existingPlainForValidation,
        ...updateDto,
      };
      updateValidationTasks.push(
        () =>
          this.validateCIE10ForDocument(
            documentType,
            mergedDto,
            trabajadorId,
            regimeCtx,
          ),
      );
    }

    if (updateDto[dateField]) {
      updateValidationTasks.push(() =>
        this.validateDocumentDateE1(
          trabajadorId,
          updateDto[dateField],
          documentType,
          regimeCtx,
        ),
      );
    }

    if (documentType === 'notaMedica') {
      updateValidationTasks.push(async () => {
        const codigoPrincipal =
          updateDto.codigoCIE10Principal !== undefined
            ? updateDto.codigoCIE10Principal
            : existingDocument.codigoCIE10Principal;
        const codigosComplementarios =
          updateDto.codigosCIE10Complementarios !== undefined
            ? updateDto.codigosCIE10Complementarios
            : existingDocument.codigosCIE10Complementarios;

        const duplicateCheck =
          validateNoDuplicateCIE10PrincipalAndComplementary(
            codigoPrincipal,
            codigosComplementarios,
          );
        if (!duplicateCheck.isValid) {
          throw new BadRequestException({
            code: 'VALIDATION_ERROR',
            ruleId: 'B4',
            message:
              'El diagnóstico principal no puede repetirse en los diagnósticos complementarios',
            details: [
              {
                field: 'codigosCIE10Complementarios',
                duplicatedCode: duplicateCheck.duplicated,
              },
            ],
          });
        }
      });

      updateValidationTasks.push(async () => {
        const mergedEmbarazoDto = {
          ...existingPlainForValidation,
          ...updateDto,
        };
        await this.validateAndNormalizeEmbarazoForNotaMedica(
          mergedEmbarazoDto,
          trabajadorId,
          regimeCtx,
        );
        updateDto.relacionTemporalEmbarazo =
          mergedEmbarazoDto.relacionTemporalEmbarazo;
        updateDto.trimestreGestacional =
          mergedEmbarazoDto.trimestreGestacional;
      });

      updateValidationTasks.push(async () => {
        const derechohabiencia =
          updateDto.derechohabiencia !== undefined
            ? updateDto.derechohabiencia
            : existingPlainForValidation.derechohabiencia;
        await this.validateDerechohabienciaAgainstAfiliacionCatalog(
          derechohabiencia,
        );
      });
    }

    await this.runValidationsInPriorityOrder(updateValidationTasks);

    let result;
    const dateChanged = newFecha.toISOString() !== oldFecha.toISOString();
    delete updateDto.fichaSnapshot;
    const snapshotTrabajadorId =
      (updateDto.idTrabajador ?? existingDocument.idTrabajador)?.toString?.() ??
      null;
    const fichaSnapshot = await this.tryCapturarFichaSnapshot({
      documentType,
      trabajadorId: snapshotTrabajadorId,
      creadorId:
        updateDto.createdBy ?? existingDocument.createdBy?.toString?.() ??
        existingDocument.createdBy,
      finalizadorId: existingDocument.finalizadoPor
        ? existingDocument.finalizadoPor.toString?.() ??
          existingDocument.finalizadoPor
        : undefined,
    });
    if (dateChanged) {
      const existingPlain =
        typeof existingDocument.toObject === 'function'
          ? existingDocument.toObject()
          : { ...existingDocument };
      const updateFields = { ...updateDto };
      delete updateFields._id;
      if (updateFields.createdBy == null) {
        delete updateFields.createdBy;
      }

      const newDocumentData = {
        ...existingPlain,
        ...updateFields,
        estado: DocumentoEstado.BORRADOR,
        updatedBy: updateDto.updatedBy ?? existingDocument.updatedBy,
      };
      delete newDocumentData._id;
      delete newDocumentData.__v;
      delete newDocumentData.createdAt;
      delete newDocumentData.updatedAt;
      delete newDocumentData.fechaFinalizacion;
      delete newDocumentData.finalizadoPor;
      delete newDocumentData.fechaAnulacion;
      delete newDocumentData.anuladoPor;
      delete newDocumentData.razonAnulacion;

      if (!newDocumentData.createdBy) {
        newDocumentData.createdBy = existingDocument.createdBy;
      }
      if (!newDocumentData.createdBy && updateDto.updatedBy) {
        newDocumentData.createdBy = updateDto.updatedBy;
      }
      if (fichaSnapshot) {
        newDocumentData.fichaSnapshot = fichaSnapshot;
      } else {
        delete newDocumentData.fichaSnapshot;
      }

      const newDocument = new model(newDocumentData);
      result = await newDocument.save();
      const resolvedTrabajadorId =
        (
          updateDto.idTrabajador ?? existingDocument.idTrabajador
        )?.toString?.() ?? null;
      this.enqueueSoftAudit(
        this.recordDocDraftCreated({
          documentType,
          documentId: result._id.toString(),
          trabajadorId: resolvedTrabajadorId,
          actorId: updateDto.updatedBy,
          source: 'updateOrCreateDocument',
          proveedorSaludId: regimeCtx.proveedorSaludId,
        }),
        'DOC_CREATE_DRAFT',
      );
    } else {
      // Limpieza especial para antidoping
      if (documentType === 'antidoping') {
        const allDrugs = [
          'marihuana',
          'cocaina',
          'anfetaminas',
          'metanfetaminas',
          'opiaceos',
          'benzodiacepinas',
          'fenciclidina',
          'metadona',
          'barbituricos',
          'antidepresivosTriciclicos',
        ];

        const unsetFields = Object.fromEntries(
          allDrugs
            .filter((campo) => !(campo in updateDto))
            .map((campo) => [campo, '']),
        );

        if (Object.keys(unsetFields).length > 0) {
          await model.updateOne({ _id: id }, { $unset: unsetFields });
        }
      }

      let updatePayload: any =
        documentType === 'notaMedica'
          ? normalizeNotaMedicaCexSentinels(updateDto)
          : { ...updateDto };
      if (updatePayload.createdBy == null) {
        delete updatePayload.createdBy;
      }
      if (fichaSnapshot) {
        updatePayload.fichaSnapshot = fichaSnapshot;
      }

      result = await model
        .findByIdAndUpdate(id, updatePayload, { new: true })
        .exec();
      const resolvedTrabajadorId =
        (
          updateDto.idTrabajador ?? existingDocument.idTrabajador
        )?.toString?.() ?? null;
      this.enqueueSoftAudit(
        this.recordDocDraftUpdated({
          documentType,
          documentId: result._id.toString(),
          trabajadorId: resolvedTrabajadorId,
          actorId: updateDto.updatedBy,
          estadoActual: (result as any).estado ?? existingDocument.estado,
          changedKeys: Object.keys(updateDto ?? {}),
          proveedorSaludId: regimeCtx.proveedorSaludId,
        }),
        'DOC_UPDATE_DRAFT',
      );
    }

    // ✅ Actualizar el updatedAt del trabajador
    await this.actualizarUpdatedAtTrabajador(trabajadorId);

    return result;
  }

  /**
   * Finalize a document (set estado to FINALIZADO)
   * Only allowed for documents in BORRADOR state
   * For MX providers, finalized documents become immutable
   */
  async finalizarDocumento(
    documentType: string,
    id: string,
    userId: string,
    proveedorSaludId?: string | null,
    opciones?: { motivo?: string },
    actorSnapshot?: { username: string; email: string; role: string } | null,
  ): Promise<any> {
    const model = this.models[documentType];

    if (!model) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }

    const accessStub = await this.assertActorCanAccessDocument(
      userId,
      documentType,
      id,
    );
    if (!accessStub) {
      throw new BadRequestException(`Documento con ID ${id} no encontrado`);
    }

    const document = await model.findById(id).exec();

    if (!document) {
      throw new BadRequestException(`Documento con ID ${id} no encontrado`);
    }

    // Check current state
    if (document.estado === DocumentoEstado.FINALIZADO) {
      throw new BadRequestException('El documento ya está finalizado');
    }

    if (document.estado === DocumentoEstado.ANULADO) {
      throw new BadRequestException(
        'No se puede finalizar un documento anulado',
      );
    }

    const idTrabajador = (document as any).idTrabajador?.toString?.() ?? null;
    if (idTrabajador) {
      await this.assertDocumentTypeEnabledForRegime(documentType, idTrabajador);
    }

    const estadoAnterior = document.estado;
    const fechaFinalizacion = new Date();

    // Audit (Clase 1: if this fails, finalization does not proceed)
    await this.recordDocFinalized({
      documentType,
      documentId: id,
      trabajadorId: idTrabajador,
      actorId: userId,
      estadoAnterior,
      fechaFinalizacion,
      motivo: opciones?.motivo,
      proveedorSaludId,
      actorSnapshot,
    });

    const creadorId = document.createdBy?.toString() || userId;
    const finalizadorId = userId;
    const pdfStatusAntes = document.pdfStatus as PdfStatus | null | undefined;
    const tieneRutaPdf = !!(document as any).rutaPDF;

    // Misma persona elaborador/finalizador → el PDF post-save (formato simple)
    // ya refleja el contenido final. Evita regeneración duplicada.
    // Personas distintas → hay que regenerar (footer Elab./Rev./Fin.).
    const reutilizarPdfPostSave =
      creadorId === finalizadorId &&
      tieneRutaPdf &&
      (pdfStatusAntes === PdfStatus.READY ||
        pdfStatusAntes === PdfStatus.GENERATING);

    // Update document state
    document.estado = DocumentoEstado.FINALIZADO;
    document.fechaFinalizacion = fechaFinalizacion;
    document.finalizadoPor = finalizadorId;

    if (documentType === 'notaMedica') {
      document.primeraVezAnio = await this.resolvePrimeraVezAnioAlFinalizar(
        document,
      );
    }

    const fichaSnapshot = await this.tryCapturarFichaSnapshot({
      documentType,
      trabajadorId: idTrabajador,
      creadorId,
      finalizadorId,
    });
    if (fichaSnapshot) {
      document.fichaSnapshot = fichaSnapshot;
    }

    if (!reutilizarPdfPostSave) {
      document.pdfStatus = PdfStatus.GENERATING;
    }
    // Si READY: se conserva. Si GENERATING: el job post-save del FE termina el PDF.

    const savedDocument = await document.save();

    if (!reutilizarPdfPostSave) {
      // Regenerar PDF en background: no bloquear la respuesta de finalización
      void this.informesService
        .regenerarInformeAlFinalizar(
          documentType,
          id,
          creadorId,
          finalizadorId,
        )
        .catch((error) => {
          console.error(
            'Error al regenerar PDF al finalizar documento:',
            error,
          );
        });
    }

    // updatedAt del trabajador no es parte del contrato de respuesta
    if (document.idTrabajador) {
      void this.actualizarUpdatedAtTrabajador(
        document.idTrabajador.toString(),
      ).catch((error) => {
        console.error(
          'Error al actualizar updatedAt del trabajador al finalizar:',
          error,
        );
      });
    }

    return savedDocument;
  }

  private async resolvePrimeraVezAnioAlFinalizar(
    document: { _id: unknown; idTrabajador?: unknown; fechaNotaMedica?: Date },
  ): Promise<0 | 1> {
    const fecha = document.fechaNotaMedica
      ? new Date(document.fechaNotaMedica)
      : null;
    if (!fecha || Number.isNaN(fecha.getTime()) || !document.idTrabajador) {
      return 0;
    }
    const { start, end } = calendarYearBounds(fecha.getFullYear());
    const hayOtra = await this.notaMedicaModel.exists({
      _id: { $ne: document._id },
      estado: DocumentoEstado.FINALIZADO,
      idTrabajador: document.idTrabajador,
      fechaNotaMedica: { $gte: start, $lte: end },
    });
    return valorPrimeraVezAnioSegunExistencia(!!hayOtra);
  }

  async uploadDocument(
    createDto: any,
    file: Express.Multer.File,
    trabajadorIdFromUrl: string,
    actorUserId: string,
  ): Promise<any> {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('El archivo es requerido');
    }

    if (file.buffer.length > MAX_EXTERNAL_DOCUMENT_BYTES) {
      throw new BadRequestException(
        'El archivo excede el tamaño máximo permitido',
      );
    }

    const canonicalId = await this.assertActorCanAccessTrabajador(
      actorUserId,
      trabajadorIdFromUrl,
    );

    const chain = await resolveTrabajadorProveedorChain(
      canonicalId,
      this.trabajadorModel,
      this.centroTrabajoModel,
      this.empresaModel,
    );

    const empresaNombre = chain.empresa?.nombreComercial;
    const centroNombre = chain.centroTrabajo?.nombreCentro;
    const trabajadorNombre = chain.trabajador?.nombre;

    if (
      !chain.trabajador ||
      !chain.centroTrabajo ||
      !chain.empresa ||
      !empresaNombre ||
      !centroNombre ||
      !trabajadorNombre
    ) {
      throw new BadRequestException(
        'No se pudo resolver la ubicación del expediente del trabajador',
      );
    }

    const fechaDocumento = createDto.fechaDocumento;
    const nombreDocumento = createDto.nombreDocumento;

    if (!fechaDocumento) {
      throw new BadRequestException(
        `El campo fechaDocumento es requerido para este documento`,
      );
    }

    if (!nombreDocumento) {
      throw new BadRequestException('El campo nombreDocumento es requerido');
    }

    const regimeCtx = await this.resolveDocumentRegimeContext(canonicalId);

    await this.validateDocumentDateE1(
      canonicalId,
      fechaDocumento,
      'documentoExterno',
      regimeCtx,
    );

    const rutaRelativa = buildClinicalDirectoryPath(
      empresaNombre,
      centroNombre,
      trabajadorNombre,
      String(canonicalId),
    );
    const writeBase = getWriteBase();
    const absoluteDir = resolveAndContain(writeBase, rutaRelativa);
    const filename = buildExternalDocumentFilename(
      nombreDocumento,
      fechaDocumento,
      file.originalname || '',
    );
    const absoluteFile = resolveAndContain(
      writeBase,
      path.join(rutaRelativa, filename),
    );

    await fs.mkdir(absoluteDir, { recursive: true });

    let createdByThisRequest = false;
    try {
      await fs.writeFile(absoluteFile, file.buffer, { flag: 'wx' });
      createdByThisRequest = true;
    } catch (error: any) {
      if (error?.code === 'EEXIST') {
        throw new ConflictException(
          'Ya existe un archivo con el mismo nombre en esta fecha',
        );
      }
      throw error;
    }

    createDto.rutaDocumento = rutaRelativa;
    createDto.idTrabajador = canonicalId;

    const model = this.models['documentoExterno'];
    try {
      const createdDocument = new model(createDto);
      const result = await createdDocument.save();

      try {
        await this.actualizarUpdatedAtTrabajador(canonicalId);
      } catch (updatedAtError) {
        console.warn(
          'No se pudo actualizar updatedAt del trabajador tras subir documento externo:',
          updatedAtError,
        );
      }

      return result;
    } catch (error) {
      if (createdByThisRequest) {
        try {
          await fs.unlink(absoluteFile);
        } catch (unlinkError) {
          console.warn(
            'No se pudo eliminar el archivo huérfano de documento externo:',
            unlinkError,
          );
        }
      }
      throw error;
    }
  }

  async findDocuments(
    documentType: string,
    trabajadorId: string,
    actorUserId: string,
  ): Promise<any[]> {
    const canonicalId = await this.assertActorCanAccessTrabajador(
      actorUserId,
      trabajadorId,
    );

    const model = this.models[documentType];
    if (!model) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }
    const query = model
      .find({ idTrabajador: canonicalId })
      .populate('createdBy', '_id username role')
      .populate('finalizadoPor', 'username')
      .populate('anuladoPor', 'username');

    // documentoExterno no tiene consentimientoId en su schema
    if (documentType !== 'documentoExterno') {
      query.populate({
        path: 'consentimientoId',
        select: '_id acceptedAt metodo acceptedByUserId version',
        populate: {
          path: 'acceptedByUserId',
          select: 'username nombre',
        },
      });
    } else {
      query.populate({
        path: 'idResultadoClinico',
        select: 'tipoEstudio fechaEstudio resultadoGlobal',
      });
    }

    const docs = await query.exec();

    return docs;
  }

  /**
   * Listado liviano para abrir expediente: proyección mínima + populate de badge.
   * Recibe el id canónico ya resuelto (evitar N lookups de fusión).
   */
  private async findDocumentsForList(
    documentType: string,
    canonicalId: string,
  ): Promise<any[]> {
    const model = this.models[documentType];
    if (!model) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }

    const query = model
      .find({ idTrabajador: canonicalId })
      .select(getDocumentoListSelect(documentType))
      .populate('finalizadoPor', 'username')
      .populate('anuladoPor', 'username')
      .lean();

    if (documentType === 'documentoExterno') {
      query.populate({
        path: 'idResultadoClinico',
        select: 'tipoEstudio fechaEstudio resultadoGlobal',
      });
    }

    const docs = await query.exec();

    // DocumentoItem lee resultadoClinico (alias del populate de idResultadoClinico)
    if (documentType === 'documentoExterno') {
      return docs.map((doc: any) => {
        if (
          doc.idResultadoClinico &&
          typeof doc.idResultadoClinico === 'object'
        ) {
          return { ...doc, resultadoClinico: doc.idResultadoClinico };
        }
        return doc;
      });
    }

    return docs;
  }

  private async resolveIncludeControlPrenatalForCounts(
    trabajadorId: string,
    regimeCtx?: DocumentRegimeContext | null,
  ): Promise<boolean> {
    const ctx =
      regimeCtx ?? (await this.resolveDocumentRegimeContext(trabajadorId));
    if (!ctx.proveedorSaludId || !ctx.policy) {
      return true;
    }
    return ctx.policy.features.controlPrenatalEnabled;
  }

  /**
   * Conteos + max fecha por tipo de documento en 1 round-trip ($unionWith).
   * Misma semántica que N aggregations/`countDocuments` por colección.
   */
  private async countAllDocumentStatsForWorker(
    configs: WorkerLinkedCollectionConfig[],
    workerId: Types.ObjectId,
  ): Promise<Array<{ modelName: string; count: number; latestDate: Date | null }>> {
    type ActiveConfig = {
      config: WorkerLinkedCollectionConfig;
      documentType: string;
      model: Model<any>;
      dateField?: string;
    };

    const activeConfigs: ActiveConfig[] = [];
    for (const config of configs) {
      const documentType =
        EXPEDIENTE_MODEL_NAME_TO_DOCUMENT_TYPE[config.modelName];
      const model = documentType ? this.models[documentType] : undefined;
      if (!model || !documentType) {
        continue;
      }
      activeConfigs.push({
        config,
        documentType,
        model,
        dateField: this.dateFields[documentType],
      });
    }

    if (activeConfigs.length === 0) {
      return configs.map((config) => ({
        modelName: config.modelName,
        count: 0,
        latestDate: null,
      }));
    }

    const matchFor = (fkField: WorkerLinkedCollectionConfig['fkField']) =>
      fkField === 'trabajadorId'
        ? { trabajadorId: workerId }
        : { idTrabajador: workerId };

    const projectFor = (item: ActiveConfig) => ({
      $project: {
        _id: 0,
        modelName: { $literal: item.config.modelName },
        date: item.dateField
          ? `$${item.dateField}`
          : { $literal: null },
      },
    });

    const [first, ...rest] = activeConfigs;
    const pipeline: PipelineStage[] = [
      { $match: matchFor(first.config.fkField) },
      projectFor(first),
    ];

    for (const item of rest) {
      pipeline.push({
        $unionWith: {
          coll: item.config.collectionName,
          pipeline: [
            { $match: matchFor(item.config.fkField) },
            projectFor(item),
          ],
        },
      });
    }

    pipeline.push({
      $group: {
        _id: '$modelName',
        count: { $sum: 1 },
        maxDate: { $max: '$date' },
      },
    });

    const rows = await first.model
      .aggregate<{ _id: string; count: number; maxDate: Date | null }>(pipeline)
      .exec();

    const byModelName = new Map(
      rows.map((row) => [row._id, row] as const),
    );

    // Incluir ceros para todos los configs (misma forma que N queries previas)
    return configs.map((config) => {
      const row = byModelName.get(config.modelName);
      return {
        modelName: config.modelName,
        count: row?.count ?? 0,
        latestDate: row?.maxDate ? new Date(row.maxDate) : null,
      };
    });
  }

  async countDocumentosByTrabajador(
    trabajadorId: string,
    actorUserId: string,
  ): Promise<{
    conteos: Record<string, number>;
    total: number;
    resultadosClinicosConteos: Record<string, number>;
    totalResultadosClinicos: number;
    fechaUltimaActividad: string | null;
  }> {
    if (!isValidObjectId(trabajadorId)) {
      throw new BadRequestException('El ID del trabajador no es válido');
    }

    const canonicalId = await this.assertActorCanAccessTrabajador(
      actorUserId,
      trabajadorId,
    );
    const workerId = new Types.ObjectId(canonicalId);

    const allDocumentConfigs = WORKER_LINKED_COLLECTIONS.filter((config) =>
      EXPEDIENTE_DOCUMENT_MODEL_NAMES.has(config.modelName),
    );

    // regimeCtx + docs ($unionWith) + RC ($facet) en paralelo → ~3 round-trips
    // en lugar de ~1 policy chain + N aggregations por tipo + RC.
    const [regimeCtx, documentStats, rcFacetRows] = await Promise.all([
      this.resolveDocumentRegimeContext(canonicalId),
      this.countAllDocumentStatsForWorker(allDocumentConfigs, workerId),
      this.resultadoClinicoModel
        .aggregate<{
          byTipo: Array<{ _id: string; count: number }>;
          latest: Array<{ maxDate: Date | null }>;
        }>([
          { $match: { idTrabajador: workerId } },
          {
            $facet: {
              byTipo: [
                { $group: { _id: '$tipoEstudio', count: { $sum: 1 } } },
              ],
              latest: [
                {
                  $group: {
                    _id: null,
                    maxDate: { $max: '$fechaEstudio' },
                  },
                },
              ],
            },
          },
        ])
        .exec(),
    ]);

    const includeControlPrenatal =
      !regimeCtx.proveedorSaludId || !regimeCtx.policy
        ? true
        : regimeCtx.policy.features.controlPrenatalEnabled;

    const conteos: Record<string, number> = {};
    let total = 0;
    const latestDates: Date[] = [];

    for (const stats of documentStats) {
      if (
        stats.modelName === 'ControlPrenatal' &&
        !includeControlPrenatal
      ) {
        continue;
      }

      conteos[stats.modelName] = stats.count;
      total += stats.count;

      if (stats.latestDate) {
        latestDates.push(stats.latestDate);
      }
    }

    const rcFacet = rcFacetRows[0];
    const resultadosClinicosConteos: Record<string, number> = {};
    let totalResultadosClinicos = 0;
    for (const group of rcFacet?.byTipo ?? []) {
      if (!group._id) continue;
      resultadosClinicosConteos[group._id] = group.count;
      totalResultadosClinicos += group.count;
    }

    const rcLatestDate = rcFacet?.latest?.[0]?.maxDate;
    if (rcLatestDate) {
      latestDates.push(new Date(rcLatestDate));
    }

    const fechaUltimaActividad =
      latestDates.length > 0
        ? new Date(
            Math.max(...latestDates.map((date) => date.getTime())),
          ).toISOString()
        : null;

    return {
      conteos,
      total,
      resultadosClinicosConteos,
      totalResultadosClinicos,
      fechaUltimaActividad,
    };
  }

  async findAllDocuments(
    trabajadorId: string,
    actorUserId: string,
  ): Promise<Record<string, any[]>> {
    const canonicalId = await this.assertActorCanAccessTrabajador(
      actorUserId,
      trabajadorId,
    );

    const documentTypes = Object.keys(this.models);
    const [entries, includeControlPrenatal] = await Promise.all([
      Promise.all(
        documentTypes.map(async (documentType) => {
          const docs = await this.findDocumentsForList(
            documentType,
            canonicalId,
          );
          const storeKey =
            this.documentTypeToStoreKey[documentType] ?? documentType;
          return [storeKey, docs] as const;
        }),
      ),
      this.resolveIncludeControlPrenatalForCounts(canonicalId),
    ]);

    const result = Object.fromEntries(entries);

    if (!includeControlPrenatal) {
      result.controlPrenatal = [];
    }

    return result;
  }

  /**
   * Actualiza el estado de generación del PDF de un documento clínico.
   * Escritura interna/controlada (informes + endpoint mark-generating).
   */
  async setPdfStatus(
    documentType: string,
    id: string,
    status: PdfStatus,
    actorUserId: string,
  ): Promise<void> {
    const accessStub = await this.assertActorCanAccessDocument(
      actorUserId,
      documentType,
      id,
    );
    if (!accessStub) {
      return;
    }
    const model = this.models[documentType];
    if (!model) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }
    await model.findByIdAndUpdate(id, { pdfStatus: status }).exec();
  }

  /**
   * Lectura mínima para poll de generación de PDF (sin populate).
   * Solo pdfStatus + rutaPDF — evita el documento filled de findDocument.
   */
  async getDocumentPdfStatus(
    documentType: string,
    id: string,
    actorUserId: string,
  ): Promise<{ _id?: unknown; pdfStatus?: PdfStatus | null; rutaPDF?: string | null } | null> {
    return this.findDocumentSelect(
      documentType,
      id,
      'pdfStatus rutaPDF',
      actorUserId,
    );
  }

  /**
   * Documento filled para UI (GET detalle/edición): populate de users + consentimiento/RC.
   * No usar en PDF/checks internos — preferir findDocumentLean / findDocumentSelect.
   */
  async findDocument(
    documentType: string,
    id: string,
    actorUserId: string,
  ): Promise<any> {
    const accessStub = await this.assertActorCanAccessDocument(
      actorUserId,
      documentType,
      id,
    );
    if (!accessStub) {
      return null;
    }
    const model = this.models[documentType];
    if (!model) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }
    const query = model
      .findById(id)
      .populate('createdBy', '_id username role')
      .populate('updatedBy', 'username')
      .populate('finalizadoPor', 'username')
      .populate('anuladoPor', 'username');

    if (documentType === 'documentoExterno') {
      query.populate({
        path: 'idResultadoClinico',
        select: 'tipoEstudio fechaEstudio resultadoGlobal',
      });
    }

    if (documentType !== 'documentoExterno') {
      query.populate({
        path: 'consentimientoId',
        select: '_id acceptedAt metodo acceptedByUserId version',
        populate: {
          path: 'acceptedByUserId',
          select: 'username nombre',
        },
      });
    }

    return query.exec();
  }

  /**
   * Documento completo lean sin populate de UI (users/consentimiento/RC).
   * Para generación de PDF y validaciones internas. Mismos campos del doc;
   * refs quedan como ObjectId (los callers de informe ya soportan `_id || ref`).
   */
  async findDocumentLean(
    documentType: string,
    id: string,
    actorUserId: string,
    options?: {
      populateRefs?: Array<{ path: string; select: string }>;
    },
  ): Promise<any> {
    const accessStub = await this.assertActorCanAccessDocument(
      actorUserId,
      documentType,
      id,
    );
    if (!accessStub) {
      return null;
    }
    const model = this.models[documentType];
    if (!model) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }

    let query = model.findById(id);
    for (const ref of options?.populateRefs ?? []) {
      query = query.populate(ref.path, ref.select);
    }
    return query.lean().exec();
  }

  /**
   * Lectura mínima de documento (sin populate) para rutas internas como regeneración de PDF.
   */
  async findDocumentSelect(
    documentType: string,
    id: string,
    select: string,
    actorUserId: string,
  ): Promise<any> {
    const accessStub = await this.assertActorCanAccessDocument(
      actorUserId,
      documentType,
      id,
    );
    if (!accessStub) {
      return null;
    }
    const model = this.models[documentType];
    if (!model) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }
    return model.findById(id).select(select).lean().exec();
  }

  /**
   * Listado lean con proyección (sin populate) para usos internos (PDF, etc.).
   * Opcionalmente reutiliza el id canónico ya resuelto.
   */
  async findDocumentsSelect(
    documentType: string,
    trabajadorId: string,
    select: string,
    actorUserId: string,
    options?: { canonicalTrabajadorId?: string },
  ): Promise<any[]> {
    const canonicalId = await this.assertActorCanAccessTrabajador(
      actorUserId,
      options?.canonicalTrabajadorId ?? trabajadorId,
    );

    const model = this.models[documentType];
    if (!model) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }

    return model
      .find({ idTrabajador: canonicalId })
      .select(select)
      .lean()
      .exec();
  }

  /**
   * Documentos vecinos del informe de aptitud: 1× canónico + N queries lean/select
   * (sin populate de users/consentimiento). Misma población que findDocuments
   * por tipo; la selección del “más cercano” sigue en el caller.
   */
  async findDocumentsForAptitudInformeVecinos(
    trabajadorId: string,
    actorUserId: string,
  ): Promise<Record<AptitudInformeVecinoType, any[]>> {
    const canonicalId = await this.assertActorCanAccessTrabajador(
      actorUserId,
      trabajadorId,
    );

    const entries = await Promise.all(
      APTITUD_INFORME_VECINO_TYPES.map(async (documentType) => {
        const docs = await this.findDocumentsSelect(
          documentType,
          trabajadorId,
          getAptitudInformeVecinoSelect(documentType),
          actorUserId,
          { canonicalTrabajadorId: canonicalId },
        );
        return [documentType, docs] as const;
      }),
    );

    return Object.fromEntries(entries) as Record<
      AptitudInformeVecinoType,
      any[]
    >;
  }

  async upsertDocumentoExterno(
    id: string | null,
    updateDto: any,
    actorUserId: string,
  ): Promise<any> {
    const model = this.models.documentoExterno;
    const dateField = 'fechaDocumento';

    if (!model) {
      throw new BadRequestException(
        'El modelo documentoExterno no está definido',
      );
    }

    if (id) {
      const accessStub = await this.assertActorCanAccessDocument(
        actorUserId,
        'documentoExterno',
        id,
      );
      if (accessStub) {
        const persistedCanonical =
          await this.workerFusionService.getCanonicalTrabajadorId(
            String(
              (accessStub.idTrabajador as { toString?: () => string })
                ?.toString?.() ?? accessStub.idTrabajador,
            ),
          );
        if (updateDto?.idTrabajador) {
          const bodyCanonical =
            await this.workerFusionService.getCanonicalTrabajadorId(
              updateDto.idTrabajador,
            );
          if (bodyCanonical !== persistedCanonical) {
            throw new BadRequestException(
              'No se permite reasignar el documento a otro trabajador',
            );
          }
        }
        updateDto.idTrabajador = persistedCanonical;
      }
    }

    if (!updateDto.idTrabajador) {
      throw new BadRequestException('El campo idTrabajador es requerido');
    }

    updateDto.idTrabajador = await this.assertActorCanAccessTrabajador(
      actorUserId,
      updateDto.idTrabajador,
    );

    const newFecha = updateDto[dateField];
    const trabajadorId = updateDto.idTrabajador;
    const newNombreDocumento = updateDto.nombreDocumento;

    if (!newFecha) {
      throw new BadRequestException(
        `El campo ${dateField} es requerido para este documento`,
      );
    }

    if (!trabajadorId) {
      throw new BadRequestException('El campo idTrabajador es requerido');
    }

    const regimeCtx = await this.resolveDocumentRegimeContext(trabajadorId);

    await this.validateDocumentDateE1(
      trabajadorId,
      newFecha,
      'documentoExterno',
      regimeCtx,
    );

    let result;

    const existingDocument = id ? await model.findById(id).exec() : null;

    if (existingDocument) {
      const oldFecha = existingDocument[dateField];
      const oldNombreDocumento = existingDocument.nombreDocumento;
      const oldExtension = existingDocument.extension;
      const rutaDocumento = existingDocument.rutaDocumento;

      // Detectar cambios en fecha o nombre del documento
      if (newFecha !== oldFecha || newNombreDocumento !== oldNombreDocumento) {
        try {
          // Construir el nombre del archivo anterior
          const formattedOldFecha = convertirFechaISOaDDMMYYYY(
            oldFecha,
          ).replace(/\//g, '-');
          const oldFileName = `${oldNombreDocumento} ${formattedOldFecha}${oldExtension}`;
          const oldFilePath = path.join(rutaDocumento, oldFileName);

          // Construir el nuevo nombre del archivo
          const formattedNewFecha = convertirFechaISOaDDMMYYYY(
            newFecha,
          ).replace(/\//g, '-');
          const newFileName = `${newNombreDocumento} ${formattedNewFecha}${oldExtension}`;
          const newFilePath = path.join(rutaDocumento, newFileName);

          // console.log(`[DEBUG] Renombrando archivo: ${oldFilePath} -> ${newFilePath}`);

          // Renombrar el archivo
          await this.filesService.renameFile(oldFilePath, newFilePath);

          // Actualizar los campos en el DTO
          updateDto.nombreDocumento = newNombreDocumento;
          updateDto.fechaDocumento = newFecha;
        } catch (error) {
          console.error(
            `[ERROR] Error al renombrar el archivo: ${error.message}`,
          );
        }
      }

      // Actualizar el documento existente
      result = await model
        .findByIdAndUpdate(id, updateDto, { new: true })
        .exec();
    } else {
      const newDocument = new model(updateDto);
      result = await newDocument.save();
    }

    // ✅ Actualizar el updatedAt del trabajador
    await this.actualizarUpdatedAtTrabajador(trabajadorId);

    return result;
  }

  /**
   * Elimina archivos PDF de notas aclaratorias buscando por patrón
   * El nombre del archivo incluye información del documento aclarado entre paréntesis,
   * por lo que necesitamos buscar por patrón en lugar de nombre exacto.
   * Formato del archivo: "Nota Aclaratoria {fecha} ({documentoQueAclara}).pdf"
   */
  private async deleteNotaAclaratoriaPDF(
    rutaPDF: string,
    fecha: string,
  ): Promise<void> {
    try {
      const rutaResuelta = path.resolve(rutaPDF);

      // Verificar si es un directorio o un archivo
      let directorio: string;
      try {
        const stats = await fs.stat(rutaResuelta);
        if (stats.isDirectory()) {
          directorio = rutaResuelta;
        } else {
          // Si es un archivo, usar el directorio padre
          directorio = path.dirname(rutaResuelta);
        }
      } catch {
        // El directorio/archivo no existe, no hay nada que eliminar
        return;
      }

      // Leer todos los archivos del directorio
      const archivos = await fs.readdir(directorio);

      // Crear patrón de búsqueda: "Nota Aclaratoria {fecha}*.pdf"
      // El nombre completo incluye el documento aclarado entre paréntesis,
      // pero todos empiezan con "Nota Aclaratoria {fecha}"
      const patronBase = `Nota Aclaratoria ${fecha}`;

      // Filtrar archivos que coincidan con el patrón
      const archivosAEliminar = archivos.filter(
        (archivo) =>
          archivo.startsWith(patronBase) &&
          archivo.toLowerCase().endsWith('.pdf'),
      );

      // Eliminar cada archivo que coincida
      for (const archivo of archivosAEliminar) {
        const rutaCompleta = path.join(directorio, archivo);
        try {
          await this.filesService.deleteFile(rutaCompleta);
        } catch (error) {
          // Continuar aunque falle la eliminación de un archivo específico
          console.error(
            `Error al eliminar archivo ${rutaCompleta}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      // Continuar aunque falle la búsqueda/eliminación de archivos
      console.error(
        `Error al eliminar PDFs de nota aclaratoria: ${error.message}`,
      );
    }
  }

  async removeDocument(
    documentType: string,
    id: string,
    actorUserId: string,
    razonAnulacion?: string,
  ): Promise<{ deleted: boolean; anulado?: boolean }> {
    if (!actorUserId) {
      throw new UnauthorizedException(
        'Se requiere un usuario autenticado para eliminar documentos',
      );
    }
    const accessStub = await this.assertActorCanAccessDocument(
      actorUserId,
      documentType,
      id,
    );
    if (!accessStub) {
      throw new BadRequestException(`Documento con ID ${id} no encontrado`);
    }
    const model = this.models[documentType];
    if (!model) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }

    const document = await model.findById(id).exec();
    if (!document) {
      throw new BadRequestException(`Documento con ID ${id} no encontrado`);
    }

    const trabajadorId = document.idTrabajador?.toString?.() ?? null;
    if (trabajadorId) {
      await this.assertDocumentTypeEnabledForRegime(documentType, trabajadorId);
    }

    // Si se proporciona razonAnulacion, significa que se está intentando anular (soft delete)
    // Esto solo aplica para documentos finalizados
    if (razonAnulacion && document.estado === DocumentoEstado.FINALIZADO) {
      if (!actorUserId) {
        throw new BadRequestException(
          'Se requiere userId para anular un documento finalizado',
        );
      }

      const fechaAnulacion = new Date();
      await this.recordDocAnulated({
        documentType,
        documentId: document._id.toString(),
        trabajadorId,
        actorId: actorUserId,
        estadoAnterior: DocumentoEstado.FINALIZADO,
        razonAnulacion,
        fechaAnulacion,
      });

      // Aplicar soft delete (anulación) independientemente de si es MX o no
      // para mantener consistencia cuando se usa el modal de anulación
      document.estado = DocumentoEstado.ANULADO;
      document.fechaAnulacion = fechaAnulacion;
      document.anuladoPor = actorUserId;
      document.razonAnulacion = razonAnulacion;

      await document.save();

      // Actualizar trabajador updatedAt
      if (document.idTrabajador) {
        await this.actualizarUpdatedAtTrabajador(
          document.idTrabajador.toString(),
        );
      }

      return { deleted: false, anulado: true };
    }

    // Si el documento ya está anulado y se intenta eliminar, hacer hard delete
    if (document.estado === DocumentoEstado.ANULADO) {
      // Hard delete para documentos anulados
      try {
        if (documentType === 'documentoExterno') {
          let fullPath = document.rutaDocumento;
          if (
            !fullPath.includes('.pdf') &&
            !fullPath.includes('.png') &&
            !fullPath.includes('.jpg') &&
            !fullPath.includes('.jpeg')
          ) {
            const fechaField = this.dateFields[documentType];
            const fecha = convertirFechaISOaDDMMYYYY(
              document[fechaField],
            ).replace(/\//g, '-');
            const fileName = `${document.nombreDocumento} ${fecha}${document.extension}`;
            fullPath = path.join(document.rutaDocumento, fileName);
          }
          await this.filesService.deleteFile(fullPath);
        } else if (documentType === 'notaAclaratoria') {
          // Caso especial para notas aclaratorias
          const fechaField = this.dateFields[documentType];
          const fecha = convertirFechaISOaDDMMYYYY(
            document[fechaField],
          ).replace(/\//g, '-');
          await this.deleteNotaAclaratoriaPDF(document.rutaPDF, fecha);
        } else {
          let fullPath = document.rutaPDF;
          if (!fullPath.includes('.pdf')) {
            const fechaField = this.dateFields[documentType];
            const fecha = convertirFechaISOaDDMMYYYY(
              document[fechaField],
            ).replace(/\//g, '-');
            const fileName = formatDocumentName(documentType, fecha);
            fullPath = path.join(document.rutaPDF, fileName);
          }
          await this.filesService.deleteFile(fullPath);
        }
      } catch {
        // Continuar con la eliminación aunque falle el borrado del archivo
      }

      await model.findByIdAndDelete(id).exec();
      return { deleted: true, anulado: false };
    }

    // Hard delete: borrador o documentos no finalizados sin razonAnulacion
    try {
      if (documentType === 'documentoExterno') {
        let fullPath = document.rutaDocumento;
        if (
          !fullPath.includes('.pdf') &&
          !fullPath.includes('.png') &&
          !fullPath.includes('.jpg') &&
          !fullPath.includes('.jpeg')
        ) {
          const fechaField = this.dateFields[documentType];
          const fecha = convertirFechaISOaDDMMYYYY(
            document[fechaField],
          ).replace(/\//g, '-');
          const fileName = `${document.nombreDocumento} ${fecha}${document.extension}`;
          fullPath = path.join(document.rutaDocumento, fileName);
        }
        await this.filesService.deleteFile(fullPath);
      } else if (documentType === 'notaAclaratoria') {
        // Caso especial para notas aclaratorias
        const fechaField = this.dateFields[documentType];
        const fecha = convertirFechaISOaDDMMYYYY(document[fechaField]).replace(
          /\//g,
          '-',
        );
        await this.deleteNotaAclaratoriaPDF(document.rutaPDF, fecha);
      } else {
        let fullPath = document.rutaPDF;
        if (!fullPath.includes('.pdf')) {
          const fechaField = this.dateFields[documentType];
          const fecha = convertirFechaISOaDDMMYYYY(
            document[fechaField],
          ).replace(/\//g, '-');
          const fileName = formatDocumentName(documentType, fecha);
          fullPath = path.join(document.rutaPDF, fileName);
        }
        await this.filesService.deleteFile(fullPath);
      }
    } catch {
      // console.error(`[ERROR] Error al eliminar el archivo PDF`);
    }

    const result = await model.findByIdAndDelete(id).exec();
    return { deleted: result !== null, anulado: false };
  }

  async getAlturaDisponible(
    trabajadorId: string,
    actorUserId: string,
  ): Promise<{ altura: number | null; fuente: string | null }> {
    const canonicalId = await this.assertActorCanAccessTrabajador(
      actorUserId,
      trabajadorId,
    );
    try {
      // 1. Buscar en exploración física (más reciente)
      const exploracionFisica = await this.exploracionFisicaModel
        .findOne({ idTrabajador: canonicalId })
        .sort({ fechaExploracionFisica: -1 })
        .select('altura')
        .exec();

      if (exploracionFisica?.altura) {
        return {
          altura: exploracionFisica.altura,
          fuente: 'exploracionFisica',
        };
      }

      // 2. Buscar en control prenatal (más reciente)
      const controlPrenatal = await this.controlPrenatalModel
        .findOne({ idTrabajador: canonicalId })
        .sort({ fechaInicioControlPrenatal: -1 })
        .select('altura')
        .exec();

      if (controlPrenatal?.altura) {
        return { altura: controlPrenatal.altura, fuente: 'controlPrenatal' };
      }

      return { altura: null, fuente: null };
    } catch (error) {
      console.error('Error al consultar altura disponible:', error);
      throw new BadRequestException('Error al consultar la altura disponible');
    }
  }

  async getMotivoExamenReciente(
    trabajadorId: string,
    actorUserId: string,
  ): Promise<{ motivoExamen: string | null }> {
    const canonicalId = await this.assertActorCanAccessTrabajador(
      actorUserId,
      trabajadorId,
    );
    try {
      const historiaClinica = await this.historiaClinicaModel
        .findOne({ idTrabajador: canonicalId })
        .sort({ fechaHistoriaClinica: -1 })
        .select('motivoExamen')
        .exec();

      if (historiaClinica?.motivoExamen) {
        return { motivoExamen: historiaClinica.motivoExamen };
      }

      return { motivoExamen: null };
    } catch (error) {
      console.error('Error al consultar motivoExamen reciente:', error);
      throw new BadRequestException(
        'Error al consultar el motivoExamen reciente',
      );
    }
  }

  private async actualizarUpdatedAtTrabajador(trabajadorId: string) {
    if (!trabajadorId) return;
    await this.trabajadorModel.findByIdAndUpdate(trabajadorId, {
      updatedAt: new Date(),
    });
  }

  // ==================== GIIS-B019 Detección Methods ====================

  /**
   * GIIS-B019: Validate Detección-specific business rules
   *
   * Note: Official DGIS catalogs (TIPO_PERSONAL, SERVICIOS_DET, AFILIACION, PAIS)
   * are NOT publicly available. Best-effort validation is applied.
   */
  private async validateDeteccionRules(
    deteccionDto: any,
    trabajadorId: string,
  ): Promise<void> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get provider info to determine MX vs non-MX
    const proveedorSaludId =
      await this.getProveedorSaludIdFromTrabajador(trabajadorId);
    const requiresCompliance = proveedorSaludId
      ? await this.nom024Util.requiresNOM024Compliance(proveedorSaludId)
      : false;

    // Get Trabajador for age/sex validation
    const trabajador = await this.trabajadorModel.findById(trabajadorId).lean();
    if (!trabajador) {
      errors.push('Trabajador no encontrado');
      throw new BadRequestException(errors.join('; '));
    }

    // Calculate age
    const fechaNacimiento = new Date(trabajador.fechaNacimiento);
    const fechaDeteccion = new Date(deteccionDto.fechaDeteccion);
    const edadEnDeteccion = Math.floor(
      (fechaDeteccion.getTime() - fechaNacimiento.getTime()) /
        (365.25 * 24 * 60 * 60 * 1000),
    );

    // Determine sex (convert string to number for GIIS)
    const sexoMasculino = trabajador.sexo === 'Masculino';
    const sexoFemenino = trabajador.sexo === 'Femenino';

    // === MX Provider: Strict Validation ===
    if (requiresCompliance) {
      // Core required fields for MX
      if (!deteccionDto.fechaDeteccion) {
        errors.push('NOM-024: Fecha de detección es obligatoria para MX');
      }
      if (!deteccionDto.curpPrestador) {
        errors.push('NOM-024: CURP del prestador es obligatorio para MX');
      }
      if (!deteccionDto.tipoPersonal) {
        errors.push('NOM-024: Tipo de personal es obligatorio para MX');
      }
      if (!deteccionDto.servicioAtencion) {
        errors.push('NOM-024: Servicio de atención es obligatorio para MX');
      }

      // CLUES validation for MX
      if (!deteccionDto.clues) {
        // Try to derive from ProveedorSalud
        warnings.push(
          'CLUES no proporcionado. Se intentará derivar del ProveedorSalud.',
        );
      }

      // Temporal validation: fechaDeteccion <= fechaActual
      if (fechaDeteccion > new Date()) {
        errors.push('La fecha de detección no puede ser futura');
      }

      // Validate fechaNacimiento <= fechaDeteccion
      if (fechaDeteccion < fechaNacimiento) {
        errors.push(
          'La fecha de detección no puede ser anterior a la fecha de nacimiento',
        );
      }
    }

    // === Vitals Range Validation (both MX and non-MX when provided) ===

    // Blood pressure consistency
    if (
      deteccionDto.tensionArterialSistolica !== undefined &&
      deteccionDto.tensionArterialDiastolica !== undefined
    ) {
      if (
        deteccionDto.tensionArterialSistolica <
        deteccionDto.tensionArterialDiastolica
      ) {
        const msg = 'Tensión arterial: sistólica debe ser >= diastólica';
        if (requiresCompliance) {
          errors.push(msg);
        } else {
          warnings.push(msg);
        }
      }
    }

    // Glucemia requires tipoMedicion if > 0
    if (
      deteccionDto.glucemia !== undefined &&
      deteccionDto.glucemia > 0 &&
      !deteccionDto.tipoMedicionGlucemia
    ) {
      const msg =
        'Si glucemia > 0, tipo de medición (ayuno/casual) es requerido';
      if (requiresCompliance) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
    }

    // === Age-Based Block Validation (MX strict, non-MX warning) ===

    // Mental health block: age >= 10
    const mentalHealthFields = ['depresion', 'ansiedad'];
    for (const field of mentalHealthFields) {
      if (
        deteccionDto[field] !== undefined &&
        deteccionDto[field] !== -1 &&
        edadEnDeteccion < 10
      ) {
        const msg = `Campo ${field} requiere edad >= 10 años (edad actual: ${edadEnDeteccion})`;
        if (requiresCompliance) {
          errors.push(msg);
        } else {
          warnings.push(msg);
        }
      }
    }

    // Geriatrics block: age >= 60
    const geriatricsFields = [
      'deterioroMemoria',
      'riesgoCaidas',
      'alteracionMarcha',
      'dependenciaABVD',
      'necesitaCuidador',
    ];
    for (const field of geriatricsFields) {
      if (
        deteccionDto[field] !== undefined &&
        deteccionDto[field] !== -1 &&
        edadEnDeteccion < 60
      ) {
        const msg = `Campo ${field} requiere edad >= 60 años (edad actual: ${edadEnDeteccion})`;
        if (requiresCompliance) {
          errors.push(msg);
        } else {
          warnings.push(msg);
        }
      }
    }

    // Chronic diseases block: age >= 20
    const chronicFields = [
      'riesgoDiabetes',
      'riesgoHipertension',
      'obesidad',
      'dislipidemia',
    ];
    for (const field of chronicFields) {
      if (
        deteccionDto[field] !== undefined &&
        deteccionDto[field] !== -1 &&
        edadEnDeteccion < 20
      ) {
        const msg = `Campo ${field} requiere edad >= 20 años (edad actual: ${edadEnDeteccion})`;
        if (requiresCompliance) {
          errors.push(msg);
        } else {
          warnings.push(msg);
        }
      }
    }

    // === Sex-Based Validation ===

    // Cancer cervicouterino: Mujeres 25-64
    if (
      deteccionDto.cancerCervicouterino !== undefined &&
      deteccionDto.cancerCervicouterino !== -1
    ) {
      if (!sexoFemenino) {
        const msg = 'Cáncer cervicouterino solo aplica a mujeres';
        if (requiresCompliance) errors.push(msg);
        else warnings.push(msg);
      }
      if (edadEnDeteccion < 25 || edadEnDeteccion > 64) {
        const msg = `Cáncer cervicouterino requiere edad 25-64 años (edad actual: ${edadEnDeteccion})`;
        if (requiresCompliance) errors.push(msg);
        else warnings.push(msg);
      }
    }

    // VPH: Mujeres 35-64
    if (deteccionDto.vph !== undefined && deteccionDto.vph !== -1) {
      if (!sexoFemenino) {
        const msg = 'VPH solo aplica a mujeres';
        if (requiresCompliance) errors.push(msg);
        else warnings.push(msg);
      }
      if (edadEnDeteccion < 35 || edadEnDeteccion > 64) {
        const msg = `VPH requiere edad 35-64 años (edad actual: ${edadEnDeteccion})`;
        if (requiresCompliance) errors.push(msg);
        else warnings.push(msg);
      }
    }

    // Hiperplasia prostática: Hombres >= 40
    if (
      deteccionDto.hiperplasiaProstatica !== undefined &&
      deteccionDto.hiperplasiaProstatica !== -1
    ) {
      if (!sexoMasculino) {
        const msg = 'Hiperplasia prostática solo aplica a hombres';
        if (requiresCompliance) errors.push(msg);
        else warnings.push(msg);
      }
      if (edadEnDeteccion < 40) {
        const msg = `Hiperplasia prostática requiere edad >= 40 años (edad actual: ${edadEnDeteccion})`;
        if (requiresCompliance) errors.push(msg);
        else warnings.push(msg);
      }
    }

    // Violencia mujer: Mujeres >= 15
    if (
      deteccionDto.violenciaMujer !== undefined &&
      deteccionDto.violenciaMujer !== -1
    ) {
      if (!sexoFemenino) {
        const msg = 'Violencia mujer solo aplica a mujeres';
        if (requiresCompliance) errors.push(msg);
        else warnings.push(msg);
      }
      if (edadEnDeteccion < 15) {
        const msg = `Violencia mujer requiere edad >= 15 años (edad actual: ${edadEnDeteccion})`;
        if (requiresCompliance) errors.push(msg);
        else warnings.push(msg);
      }
    }

    // === Trabajador Social Exclusion Rule ===
    // tipoPersonal == 30 disables clinical detections
    if (deteccionDto.tipoPersonal === 30) {
      const clinicalFields = [
        'depresion',
        'ansiedad',
        'consumoAlcohol',
        'consumoTabaco',
        'consumoDrogas',
        'resultadoVIH',
        'resultadoSifilis',
        'resultadoHepatitisB',
        'cancerMama',
        ...geriatricsFields,
      ];
      for (const field of clinicalFields) {
        if (deteccionDto[field] !== undefined && deteccionDto[field] !== -1) {
          const msg = `Campo ${field} no permitido para Trabajador Social (tipoPersonal=30)`;
          if (requiresCompliance) errors.push(msg);
          else warnings.push(msg);
        }
      }
    }

    // Log warnings
    if (warnings.length > 0) {
      console.warn(`GIIS-B019 Detección Warnings: ${warnings.join('; ')}`);
    }

    // Throw errors for MX providers
    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }
  }

  /**
   * Get CLUES from ProveedorSalud
   */
  private async getCluesFromProveedorSalud(
    trabajadorId: string,
  ): Promise<string | null> {
    const proveedorSaludId =
      await this.getProveedorSaludIdFromTrabajador(trabajadorId);
    if (!proveedorSaludId) return null;

    try {
      // Import ProveedorSalud model dynamically to avoid circular dependency
      const proveedorSalud = await this.empresaModel
        .findOne({ idProveedorSalud: proveedorSaludId })
        .populate('idProveedorSalud')
        .lean();

      return (proveedorSalud?.idProveedorSalud as any)?.clues || null;
    } catch {
      return null;
    }
  }

  /**
   * GIIS-B019: Create Detección record
   */
  async createDeteccion(
    createDto: any,
    actorUserId: string,
    trabajadorIdFromUrl: string,
  ): Promise<any> {
    assertTrabajadorIdsConsistent(trabajadorIdFromUrl, createDto?.idTrabajador);
    createDto.idTrabajador = await this.assertActorCanAccessTrabajador(
      actorUserId,
      trabajadorIdFromUrl,
    );

    await this.validateDeteccionRules(createDto, createDto.idTrabajador);

    // Try to derive CLUES if not provided
    if (!createDto.clues) {
      const derivedClues = await this.getCluesFromProveedorSalud(
        createDto.idTrabajador,
      );
      if (derivedClues) {
        createDto.clues = derivedClues;
      }
    }

    const createdDeteccion = new this.deteccionModel(createDto);
    const savedDeteccion = await createdDeteccion.save();

    if (createDto.idTrabajador) {
      await this.actualizarUpdatedAtTrabajador(createDto.idTrabajador);
    }

    return savedDeteccion;
  }

  /**
   * GIIS-B019: Update Detección record
   */
  async updateDeteccion(
    id: string,
    updateDto: any,
    actorUserId: string,
  ): Promise<any> {
    const accessStub = await this.assertActorCanAccessDocument(
      actorUserId,
      'deteccion',
      id,
    );
    if (!accessStub) {
      throw new BadRequestException(`Detección con ID ${id} no encontrada`);
    }

    const existingDeteccion = await this.deteccionModel.findById(id).exec();

    if (!existingDeteccion) {
      throw new BadRequestException(`Detección con ID ${id} no encontrada`);
    }

    const persistedCanonical =
      await this.workerFusionService.getCanonicalTrabajadorId(
        existingDeteccion.idTrabajador?.toString?.() ??
          String(existingDeteccion.idTrabajador),
      );
    if (updateDto?.idTrabajador) {
      const bodyCanonical =
        await this.workerFusionService.getCanonicalTrabajadorId(
          updateDto.idTrabajador,
        );
      if (bodyCanonical !== persistedCanonical) {
        throw new BadRequestException(
          'No se permite reasignar el documento a otro trabajador',
        );
      }
    }
    updateDto.idTrabajador = persistedCanonical;

    // Check immutability based on regulatory policy
    const proveedorSaludId =
      await this.getProveedorSaludIdFromDocument(existingDeteccion);
    if (proveedorSaludId) {
      const policy =
        await this.regulatoryPolicyService.getRegulatoryPolicy(
          proveedorSaludId,
        );
      const isImmutable = await this.isDocumentImmutable(
        proveedorSaludId,
        existingDeteccion.estado,
      );
      if (isImmutable) {
        throw createRegulatoryError({
          errorCode: RegulatoryErrorCode.REGIMEN_DOCUMENT_IMMUTABLE,
          details: {
            documentState: existingDeteccion.estado,
            documentType: 'deteccion',
          },
          regime: policy.regime,
        });
      }
    }

    const mergedDto = {
      ...existingDeteccion.toObject(),
      ...updateDto,
    };

    await this.validateDeteccionRules(
      mergedDto,
      mergedDto.idTrabajador.toString(),
    );

    const updatedDeteccion = await this.deteccionModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();

    if (updatedDeteccion && updatedDeteccion.idTrabajador) {
      await this.actualizarUpdatedAtTrabajador(
        (updateDto.idTrabajador || existingDeteccion.idTrabajador).toString(),
      );
    }

    return updatedDeteccion;
  }

  /**
   * GIIS-B019: Find Detección by ID
   */
  async findDeteccion(id: string, actorUserId: string): Promise<any> {
    const accessStub = await this.assertActorCanAccessDocument(
      actorUserId,
      'deteccion',
      id,
    );
    if (!accessStub) {
      return null;
    }
    return this.deteccionModel.findById(id).exec();
  }

  /**
   * GIIS-B019: Find all Detecciones for a trabajador
   */
  async findDeteccionesByTrabajador(
    trabajadorId: string,
    actorUserId: string,
  ): Promise<any[]> {
    const canonicalId = await this.assertActorCanAccessTrabajador(
      actorUserId,
      trabajadorId,
    );
    return this.deteccionModel
      .find({ idTrabajador: canonicalId })
      .sort({ fechaDeteccion: -1 })
      .exec();
  }

  /**
   * GIIS-B019: Delete Detección
   */
  async deleteDeteccion(
    id: string,
    userId?: string,
    razonAnulacion?: string,
  ): Promise<{ deleted: boolean; anulado?: boolean }> {
    const accessStub = await this.assertActorCanAccessDocument(
      userId ?? '',
      'deteccion',
      id,
    );
    if (!accessStub) {
      throw new BadRequestException(`Detección con ID ${id} no encontrada`);
    }

    const deteccion = await this.deteccionModel.findById(id).exec();
    if (!deteccion) {
      throw new BadRequestException(`Detección con ID ${id} no encontrada`);
    }

    // Obtener política regulatoria para verificar inmutabilidad
    const proveedorSaludId =
      await this.getProveedorSaludIdFromDocument(deteccion);
    let isImmutable = false;
    if (proveedorSaludId) {
      isImmutable = await this.isDocumentImmutable(
        proveedorSaludId,
        deteccion.estado,
      );
    }

    if (deteccion.estado === DocumentoEstado.FINALIZADO && isImmutable) {
      if (!userId || !razonAnulacion) {
        throw new BadRequestException(
          'Se requiere userId y razonAnulacion para anular una detección finalizada',
        );
      }
      const fechaAnulacion = new Date();
      const trabajadorId = deteccion.idTrabajador?.toString?.() ?? null;
      await this.recordDocAnulated({
        documentType: 'deteccion',
        documentId: deteccion._id.toString(),
        trabajadorId,
        actorId: userId,
        estadoAnterior: DocumentoEstado.FINALIZADO,
        razonAnulacion,
        fechaAnulacion,
      });
      deteccion.estado = DocumentoEstado.ANULADO;
      deteccion.fechaAnulacion = fechaAnulacion;
      deteccion.anuladoPor = userId as any;
      deteccion.razonAnulacion = razonAnulacion;
      await deteccion.save();
      if (deteccion.idTrabajador) {
        await this.actualizarUpdatedAtTrabajador(
          deteccion.idTrabajador.toString(),
        );
      }
      return { deleted: false, anulado: true };
    }

    await this.deteccionModel.findByIdAndDelete(id).exec();
    return { deleted: true, anulado: false };
  }

  /**
   * GIIS-B019: Finalize Detección
   */
  async finalizarDeteccion(id: string, userId: string): Promise<any> {
    const accessStub = await this.assertActorCanAccessDocument(
      userId,
      'deteccion',
      id,
    );
    if (!accessStub) {
      throw new BadRequestException(`Detección con ID ${id} no encontrada`);
    }

    const deteccion = await this.deteccionModel.findById(id).exec();

    if (!deteccion) {
      throw new BadRequestException(`Detección con ID ${id} no encontrada`);
    }

    if (deteccion.estado === DocumentoEstado.FINALIZADO) {
      throw new BadRequestException('La detección ya está finalizada');
    }

    if (deteccion.estado === DocumentoEstado.ANULADO) {
      throw new BadRequestException(
        'No se puede finalizar una detección anulada',
      );
    }

    // For MX: Re-validate required fields before finalization
    const proveedorSaludId =
      await this.getProveedorSaludIdFromDocument(deteccion);
    if (proveedorSaludId) {
      const requiresCompliance =
        await this.nom024Util.requiresNOM024Compliance(proveedorSaludId);
      if (requiresCompliance) {
        // Validate required fields for finalization
        const errors: string[] = [];
        if (!deteccion.curpPrestador) {
          errors.push('CURP del prestador es obligatorio para finalizar');
        }
        if (!deteccion.tipoPersonal) {
          errors.push('Tipo de personal es obligatorio para finalizar');
        }
        if (!deteccion.servicioAtencion) {
          errors.push('Servicio de atención es obligatorio para finalizar');
        }
        if (!deteccion.clues) {
          errors.push('CLUES es obligatorio para finalizar');
        }
        if (errors.length > 0) {
          throw new BadRequestException(
            `NOM-024: No se puede finalizar - ${errors.join('; ')}`,
          );
        }
      }
    }

    const trabajadorId = deteccion.idTrabajador?.toString?.() ?? null;
    const fechaFinalizacion = new Date();
    await this.recordDocFinalized({
      documentType: 'deteccion',
      documentId: id,
      trabajadorId,
      actorId: userId,
      estadoAnterior: deteccion.estado,
      fechaFinalizacion,
      proveedorSaludId,
    });

    deteccion.estado = DocumentoEstado.FINALIZADO;
    deteccion.fechaFinalizacion = fechaFinalizacion;
    deteccion.finalizadoPor = userId as any;

    const savedDeteccion = await deteccion.save();

    if (deteccion.idTrabajador) {
      await this.actualizarUpdatedAtTrabajador(
        deteccion.idTrabajador.toString(),
      );
    }

    // Populate finalizadoPor before returning
    await savedDeteccion.populate('finalizadoPor', 'username');

    return savedDeteccion;
  }
}

function formatDocumentName(documentType: string, fecha: string): string {
  // Separar palabras (asumiendo camelCase, guiones bajos, y preservando espacios existentes)
  const words = documentType
    .split(/(?=[A-Z])|_/g) // Separar por camelCase o guiones bajos
    .flatMap((word) => word.split(/\s+/)) // Dividir por espacios múltiples y limpiar
    .filter((word) => word.trim() !== ''); // Eliminar palabras vacías
  // Capitalizar la primera letra de cada palabra
  const capitalized = words.map(
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
  // Unir las palabras con un espacio y agregar la fecha
  return `${capitalized.join(' ')} ${fecha}.pdf`;
}
