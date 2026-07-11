// Servicios para gestionar la data que se almacena en la base de datos
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types, Connection } from 'mongoose';
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
import { FilesService } from '../files/files.service';
import { convertirFechaISOaDDMMYYYY } from 'src/utils/dates';
import path from 'path';
import { parseISO } from 'date-fns';
import * as fs from 'fs/promises';
import { Trabajador } from '../trabajadores/schemas/trabajador.schema';
import { DocumentoEstado } from './enums/documento-estado.enum';
import { NOM024ComplianceUtil } from '../../utils/nom024-compliance.util';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from '../empresas/schemas/empresa.schema';
import { CatalogsService } from '../catalogs/catalogs.service';
import {
  validateVitalSigns,
  extractVitalSignsFromDTO,
} from '../../utils/vital-signs-validator.util';
import { InformesService } from '../informes/informes.service';
import { mapSexoToGiisBiologico } from '../../utils/sexo-mapper.util';
import { calculateAge } from '../../utils/age-calculator.util';
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
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';
import { createRegulatoryError } from '../../utils/regulatory-error-helper';
import { RegulatoryErrorCode } from '../../utils/regulatory-error-codes';
import { ConsentimientosService } from '../consentimientos/consentimientos.service';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import { UsersService } from '../users/users.service';
import { WorkerFusionService } from '../trabajadores/worker-fusion.service';
import {
  EXPEDIENTE_DOCUMENT_MODEL_NAMES,
  EXPEDIENTE_MODEL_NAME_TO_DOCUMENT_TYPE,
  WORKER_LINKED_COLLECTIONS,
  type WorkerLinkedCollectionConfig,
} from '../trabajadores/constants/worker-linked-collections.constant';
import { ResultadoClinico } from '../resultados-clinicos/schemas/resultado-clinico.schema';

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
    private readonly firmanteHelper: FirmanteHelper,
    private readonly cexCatalogResolver: CexCatalogResolver,
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
    };
  }

  /**
   * Validate CIE-10 codes for documents with diagnosis fields (MX providers only)
   * NOM-024 GIIS-B015: Extended validation with cross-checks (sex, age, special cases)
   */
  private async validateCIE10ForDocument(
    documentType: string,
    dto: any,
    trabajadorId: string,
  ): Promise<void> {
    // Only validate for NotaMedica and HistoriaClinica (documents that require CIE-10)
    if (documentType !== 'notaMedica' && documentType !== 'historiaClinica') {
      return;
    }

    const proveedorSaludId =
      await this.getProveedorSaludIdFromTrabajador(trabajadorId);
    if (!proveedorSaludId) {
      // If we can't determine provider, allow (backward compatibility)
      return;
    }

    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);

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

    // SIRES provider: validate CIE-10 codes with cross-checks (format, catalog, sex/age)
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Obtener trabajador (sexo, fechaNacimiento)
    const trabajador = await this.trabajadorModel.findById(trabajadorId).lean();
    if (!trabajador) {
      throw new BadRequestException('Trabajador no encontrado');
    }

    // 2. Calcular edad (fechaNotaMedica - fechaNacimiento)
    let edad: number | null = null;
    if (trabajador.fechaNacimiento && dto.fechaNotaMedica) {
      try {
        edad = calculateAge(trabajador.fechaNacimiento, dto.fechaNotaMedica);
      } catch (error) {
        console.warn('Error calculating age:', error);
      }
    }

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

    // Helper function to validate a single CIE-10 code
    const validateCIE10Code = async (
      codigo: string,
      tipo: 'principal' | 'secundario' | 'diagnostico2' | 'diagnostico3',
    ): Promise<void> => {
      if (!codigo || codigo.trim() === '') {
        return;
      }

      // Extraer solo el código del formato "CODE - DESCRIPTION"
      const codigoNormalizado = extractCodeFromFullText(codigo).toUpperCase();

      if (
        documentType === 'notaMedica' &&
        !isCIE10Exact4Chars(codigoNormalizado)
      ) {
        errors.push(
          `Código CIE-10 ${tipo} inválido: debe tener exactamente 4 caracteres (CATALOG_KEY DIAGNOSTICO_SIS).`,
        );
        return;
      }

      // Validar existencia en catálogo
      const isValid =
        await this.catalogsService.validateCIE10(codigoNormalizado);
      if (!isValid) {
        errors.push(
          `Código CIE-10 ${tipo} inválido: ${codigoNormalizado}. No se encuentra en el catálogo CIE-10`,
        );
        return;
      }

      // Obtener entrada del catálogo para validaciones cruzadas
      const entry = (await this.catalogsService.getCatalogEntry(
        CatalogType.CIE10,
        codigoNormalizado,
      )) as CIE10Entry | null;

      if (!entry) {
        return;
      }

      // Validar diagnósticos exclusivos
      // Si código es R69X → emitir warning (no bloqueante)
      if (codigoNormalizado.startsWith('R69')) {
        warnings.push(
          `Advertencia: El código ${codigoNormalizado} (Morbilidad desconocida) se tolera máximo un 5% por carga. Se recomienda especificar más el diagnóstico si es posible.`,
        );
      }
    };

    // Validate primary CIE-10 code
    // IMPORTANTE: La obligatoriedad solo aplica a notas médicas, no a historias clínicas
    // La validación de obligatoriedad ya se hizo arriba basándose en la política regulatoria
    const codigoPrincipalFull = dto.codigoCIE10Principal?.trim() || '';
    if (codigoPrincipalFull) {
      if (documentType === 'notaMedica') {
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
          edad,
          tipoPersonal,
          lookup: this.cie10CatalogLookupService.findDiagnosisRule.bind(
            this.cie10CatalogLookupService,
          ),
          catalogExists: (key) => this.catalogsService.validateCIE10(key),
        });
        for (const issue of diag1Issues) {
          errors.push(issue.message);
        }

        const codigoNorm =
          extractCodeFromFullText(codigoPrincipalFull).toUpperCase();
        if (codigoNorm.startsWith('R69')) {
          warnings.push(
            `Advertencia: El código ${codigoNorm} (Morbilidad desconocida) se tolera máximo un 5% por carga. Se recomienda especificar más el diagnóstico si es posible.`,
          );
        }
      } else {
        await validateCIE10Code(codigoPrincipalFull, 'principal');
      }
    }
    // Si no hay código, la validación de obligatoriedad ya se hizo arriba (líneas 167-182)

    // Validate secondary CIE-10 codes if provided
    if (
      dto.codigosCIE10Complementarios &&
      Array.isArray(dto.codigosCIE10Complementarios)
    ) {
      for (const codigo of dto.codigosCIE10Complementarios) {
        if (codigo && codigo.trim() !== '') {
          await validateCIE10Code(codigo, 'secundario');
        }
      }
    }

    // Validar Regla B4: No duplicar principal en complementarios
    // IMPORTANTE: Esta validación solo aplica a notas médicas
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

      const diag2Issues = await validateCodigoCIEDiagnostico23({
        field: 'codigoCIEDiagnostico2',
        codigo: dto.codigoCIEDiagnostico2,
        primeraVez: dto.primeraVezDiagnostico2,
        codigoCIEDiagnostico1: codigoPrincipalFull,
        sexoBiologico,
        edad,
        tipoPersonal,
        tipoPersonalMedicoGeneral: cexTp.medicoGeneral,
        tipoPersonalMedicoEspecialista: cexTp.medicoEspecialista,
        lookup,
        catalogExists,
        requirePrimeraVez: requirePrimeraVezDiag23,
      });
      for (const issue of diag2Issues) {
        errors.push(issue.message);
      }

      const diag3Issues = await validateCodigoCIEDiagnostico23({
        field: 'codigoCIEDiagnostico3',
        codigo: dto.codigoCIEDiagnostico3,
        primeraVez: dto.primeraVezDiagnostico3,
        primeraVezDiagnostico2: dto.primeraVezDiagnostico2,
        codigoCIEDiagnostico1: codigoPrincipalFull,
        codigoCIEDiagnostico2: dto.codigoCIEDiagnostico2,
        sexoBiologico,
        edad,
        tipoPersonal,
        tipoPersonalMedicoGeneral: cexTp.medicoGeneral,
        tipoPersonalMedicoEspecialista: cexTp.medicoEspecialista,
        lookup,
        catalogExists,
        requirePrimeraVez: requirePrimeraVezDiag23,
      });
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

  async createDocument(documentType: string, createDto: any): Promise<any> {
    const model = this.models[documentType];

    if (!model) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }

    // NOM-024: Resolver a trabajador canónico (fusión de registros)
    if (createDto.idTrabajador) {
      createDto.idTrabajador =
        await this.workerFusionService.getCanonicalTrabajadorId(
          createDto.idTrabajador,
        );
    }

    if (createDto.idTrabajador) {
      await this.assertDocumentTypeEnabledForRegime(
        documentType,
        createDto.idTrabajador,
      );
    }

    // Validate CIE-10 codes for MX providers
    if (createDto.idTrabajador) {
      await this.validateCIE10ForDocument(
        documentType,
        createDto,
        createDto.idTrabajador,
      );

      // NOM-024: Validate vital signs (MX strict, non-MX warnings)
      await this.validateVitalSignsForNOM024(createDto, createDto.idTrabajador);
    }

    // Validación E1: fecha del documento según régimen (SIRES: no futura; SIN_REGIMEN notaMedica: solo coherencia nacimiento)
    const createDateField = this.dateFields[documentType];
    if (
      createDateField &&
      createDto[createDateField] &&
      createDto.idTrabajador
    ) {
      await this.validateDocumentDateE1(
        createDto.idTrabajador,
        createDto[createDateField],
        documentType,
      );
    }

    // Validación embarazo CEX para notaMedica
    if (documentType === 'notaMedica' && createDto.idTrabajador) {
      await this.validateAndNormalizeEmbarazoForNotaMedica(
        createDto,
        createDto.idTrabajador,
      );
    }

    // Validación específica para notas aclaratorias: solo permitir para SIRES_NOM024
    if (documentType === 'notaAclaratoria') {
      // Obtener trabajador
      const trabajador = await this.trabajadorModel
        .findById(createDto.idTrabajador)
        .lean();
      if (!trabajador) {
        throw new BadRequestException('Trabajador no encontrado');
      }

      // Obtener centro de trabajo
      const centroTrabajo = await this.centroTrabajoModel
        .findById(trabajador.idCentroTrabajo)
        .lean();
      if (!centroTrabajo) {
        throw new BadRequestException('Centro de trabajo no encontrado');
      }

      // Obtener empresa
      const empresa = await this.empresaModel
        .findById(centroTrabajo.idEmpresa)
        .lean();
      if (!empresa) {
        throw new BadRequestException('Empresa no encontrada');
      }

      // Obtener política regulatoria para validar feature de notas aclaratorias
      const policy = await this.regulatoryPolicyService.getRegulatoryPolicy(
        empresa.idProveedorSalud.toString(),
      );

      // Validar que la feature de notas aclaratorias esté habilitada
      if (!policy.features.notaAclaratoriaEnabled) {
        throw createRegulatoryError({
          errorCode: RegulatoryErrorCode.REGIMEN_FEATURE_DISABLED,
          details: { feature: 'notaAclaratoria' },
          regime: policy.regime,
        });
      }

      // Validar estado del documento origen
      const documentoOrigen = await this.findDocument(
        createDto.documentoOrigenTipo,
        createDto.documentoOrigenId,
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

    // Vincular consentimiento para tratamiento de información (SIRES)
    if (createDto.idTrabajador) {
      try {
        const proveedorSaludId = await this.getProveedorSaludIdFromTrabajador(
          createDto.idTrabajador,
        );
        if (proveedorSaludId) {
          const policy =
            await this.regulatoryPolicyService.getRegulatoryPolicy(
              proveedorSaludId,
            );
          if (policy.features.dailyConsentEnabled) {
            const consentimiento =
              await this.consentimientosService.findCurrentConsentimientoForTrabajador(
                createDto.idTrabajador,
              );

            if (consentimiento?._id) {
              createDto.consentimientoId = consentimiento._id;
            }
          }
        }
      } catch (error) {
        console.warn('Error al obtener consentimiento para documento:', error);
      }
    }

    // notaMedica: omitir campos vitales con null ("Se desconoce") para no guardarlos en BD
    const createPayload =
      documentType === 'notaMedica'
        ? (() => {
            const VITAL_SIGNS = [
              'tensionArterialSistolica',
              'tensionArterialDiastolica',
              'frecuenciaCardiaca',
              'frecuenciaRespiratoria',
              'temperatura',
              'saturacionOxigeno',
            ];
            const payload = { ...createDto };
            for (const field of VITAL_SIGNS) {
              if (payload[field] === null) delete payload[field];
            }
            return payload;
          })()
        : createDto;

    const createdDocument = new model(createPayload);
    const savedDocument = await createdDocument.save();

    // ✅ Actualizar el updatedAt del trabajador
    if (createDto.idTrabajador) {
      await this.actualizarUpdatedAtTrabajador(createDto.idTrabajador);
    }

    await this.recordDocDraftCreated({
      documentType,
      documentId: savedDocument._id.toString(),
      trabajadorId: createDto.idTrabajador ?? null,
      actorId: createDto.createdBy,
      source: 'createDocument',
    });

    return savedDocument;
  }

  private async validateDocumentDateE1(
    trabajadorId: string,
    fechaDocumento: Date | string,
    documentType?: string,
  ): Promise<void> {
    await validateDocumentDateE1ForRegime(
      {
        trabajadorModel: this.trabajadorModel,
        centroTrabajoModel: this.centroTrabajoModel,
        empresaModel: this.empresaModel,
        regulatoryPolicyService: this.regulatoryPolicyService,
      },
      { trabajadorId, fechaDocumento, documentType },
    );
  }

  /**
   * Get ProveedorSalud ID from a trabajador ID
   */
  private async getProveedorSaludIdFromTrabajador(
    trabajadorId: string,
  ): Promise<string | null> {
    try {
      const trabajador = await this.trabajadorModel
        .findById(trabajadorId)
        .lean();
      if (!trabajador || !trabajador.idCentroTrabajo) {
        return null;
      }

      const centroTrabajo = await this.centroTrabajoModel
        .findById(trabajador.idCentroTrabajo)
        .lean();
      if (!centroTrabajo || !centroTrabajo.idEmpresa) {
        return null;
      }

      const empresa = await this.empresaModel
        .findById(centroTrabajo.idEmpresa)
        .lean();
      if (!empresa || !empresa.idProveedorSalud) {
        return null;
      }

      return empresa.idProveedorSalud.toString();
    } catch {
      return null;
    }
  }

  /**
   * Valida que el tipo de documento esté habilitado según el régimen regulatorio
   */
  private async assertDocumentTypeEnabledForRegime(
    documentType: string,
    trabajadorId: string,
  ): Promise<void> {
    if (documentType !== 'controlPrenatal') {
      return;
    }

    const proveedorSaludId =
      await this.getProveedorSaludIdFromTrabajador(trabajadorId);
    if (!proveedorSaludId) {
      return;
    }

    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);

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
    try {
      const trabajadorId = document.idTrabajador?.toString();
      if (!trabajadorId) {
        return null;
      }

      const trabajador = await this.trabajadorModel
        .findById(trabajadorId)
        .lean();
      if (!trabajador || !trabajador.idCentroTrabajo) {
        return null;
      }

      const centroTrabajo = await this.centroTrabajoModel
        .findById(trabajador.idCentroTrabajo)
        .lean();
      if (!centroTrabajo || !centroTrabajo.idEmpresa) {
        return null;
      }

      const empresa = await this.empresaModel
        .findById(centroTrabajo.idEmpresa)
        .lean();
      if (!empresa || !empresa.idProveedorSalud) {
        return null;
      }

      return empresa.idProveedorSalud.toString();
    } catch {
      return null;
    }
  }

  private async resolveProveedorSaludIdOrFail(params: {
    trabajadorId?: string | null;
    actorId?: string | null;
  }): Promise<string> {
    const { trabajadorId, actorId } = params;
    if (trabajadorId) {
      const proveedorSaludId =
        await this.getProveedorSaludIdFromTrabajador(trabajadorId);
      if (proveedorSaludId) return proveedorSaludId;
    }
    if (actorId) {
      const proveedorSaludId =
        await this.usersService.getIdProveedorSaludByUserId(actorId);
      if (proveedorSaludId) return proveedorSaludId;
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
  }): Promise<void> {
    const proveedorSaludId = await this.resolveProveedorSaludIdOrFail({
      trabajadorId: params.trabajadorId ?? null,
      actorId: params.actorId,
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
  }): Promise<void> {
    const proveedorSaludId = await this.resolveProveedorSaludIdOrFail({
      trabajadorId: params.trabajadorId ?? null,
      actorId: params.actorId,
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

  /**
   * Verifica si un documento es inmutable según la política regulatoria
   * @param proveedorSaludId - ID del proveedor de salud
   * @param estado - Estado del documento (FINALIZADO, ANULADO, BORRADOR)
   * @returns Promise<boolean> - true si el documento es inmutable, false en caso contrario
   */
  private async isDocumentImmutable(
    proveedorSaludId: string,
    estado: DocumentoEstado,
  ): Promise<boolean> {
    // Solo documentos FINALIZADOS o ANULADOS pueden ser inmutables
    if (
      estado !== DocumentoEstado.FINALIZADO &&
      estado !== DocumentoEstado.ANULADO
    ) {
      return false;
    }

    // Obtener política regulatoria
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);

    // El documento es inmutable solo si la feature está habilitada
    return policy.features.documentImmutabilityEnabled;
  }

  /**
   * Determina si el trabajador pertenece a un proveedor de salud de México
   * @param trabajadorId ID del trabajador
   * @returns true si el país del proveedor es 'MX'
   */
  private async isProveedorMX(trabajadorId: string): Promise<boolean> {
    try {
      const trabajador = await this.trabajadorModel
        .findById(trabajadorId)
        .lean();
      if (!trabajador?.idCentroTrabajo) return false;

      const centroTrabajo = await this.centroTrabajoModel
        .findById(trabajador.idCentroTrabajo)
        .lean();
      if (!centroTrabajo?.idEmpresa) return false;

      const empresa: any = await this.empresaModel
        .findById(centroTrabajo.idEmpresa)
        .populate('idProveedorSalud')
        .lean();

      return empresa?.idProveedorSalud?.pais === 'MX';
    } catch {
      return false;
    }
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
  ): Promise<void> {
    const trabajador = await this.trabajadorModel.findById(trabajadorId).lean();
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
  ): Promise<void> {
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
      await this.getProveedorSaludIdFromTrabajador(trabajadorId);

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
  ): Promise<any> {
    const model = this.models[documentType];
    const dateField = this.dateFields[documentType];

    if (!model || !dateField) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }

    const newFecha = parseISO(updateDto[dateField]); // Convertimos a Date
    let trabajadorId = updateDto.idTrabajador;

    if (!newFecha) {
      throw new BadRequestException(
        `El campo ${dateField} es requerido para este documento`,
      );
    }

    if (!trabajadorId) {
      throw new BadRequestException('El campo idTrabajador es requerido');
    }

    // NOM-024: Resolver a trabajador canónico (fusión de registros)
    trabajadorId =
      await this.workerFusionService.getCanonicalTrabajadorId(trabajadorId);
    updateDto.idTrabajador = trabajadorId;

    await this.assertDocumentTypeEnabledForRegime(documentType, trabajadorId);

    const existingDocument = await model.findById(id).exec();

    if (!existingDocument) {
      throw new BadRequestException(`Documento con ID ${id} no encontrado`);
    }

    // Check immutability based on regulatory policy
    const proveedorSaludId =
      await this.getProveedorSaludIdFromDocument(existingDocument);
    if (proveedorSaludId) {
      const policy =
        await this.regulatoryPolicyService.getRegulatoryPolicy(
          proveedorSaludId,
        );
      const isImmutable = await this.isDocumentImmutable(
        proveedorSaludId,
        existingDocument.estado,
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

    // NOM-024: Validate vital signs before saving (MX strict, non-MX warnings)
    await this.validateVitalSignsForNOM024(updateDto, trabajadorId);

    // Validate CIE-10 for notaMedica update (merged dto: updateDto overrides existing)
    if (documentType === 'notaMedica' && trabajadorId) {
      const mergedDto = {
        ...existingDocument.toObject?.(),
        ...updateDto,
      };
      await this.validateCIE10ForDocument(
        documentType,
        mergedDto,
        trabajadorId,
      );
    }

    // Validación E1: fecha del documento según régimen
    if (updateDto[dateField] && trabajadorId) {
      await this.validateDocumentDateE1(
        trabajadorId,
        updateDto[dateField],
        documentType,
      );
    }

    // Validar Regla B4: No duplicar principal en complementarios (para notaMedica)
    if (documentType === 'notaMedica') {
      // Usar valores del updateDto si existen, sino del documento existente
      const codigoPrincipal =
        updateDto.codigoCIE10Principal !== undefined
          ? updateDto.codigoCIE10Principal
          : existingDocument.codigoCIE10Principal;
      const codigosComplementarios =
        updateDto.codigosCIE10Complementarios !== undefined
          ? updateDto.codigosCIE10Complementarios
          : existingDocument.codigosCIE10Complementarios;

      const duplicateCheck = validateNoDuplicateCIE10PrincipalAndComplementary(
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
    }

    // Validación embarazo CEX para notaMedica (update)
    if (documentType === 'notaMedica' && trabajadorId) {
      const mergedEmbarazoDto = {
        ...existingDocument.toObject?.(),
        ...updateDto,
      };
      await this.validateAndNormalizeEmbarazoForNotaMedica(
        mergedEmbarazoDto,
        trabajadorId,
      );
      updateDto.relacionTemporalEmbarazo =
        mergedEmbarazoDto.relacionTemporalEmbarazo;
      updateDto.trimestreGestacional = mergedEmbarazoDto.trimestreGestacional;
    }

    let result;
    const dateChanged = newFecha.toISOString() !== oldFecha.toISOString();
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

      const newDocument = new model(newDocumentData);
      result = await newDocument.save();
      const resolvedTrabajadorId =
        (
          updateDto.idTrabajador ?? existingDocument.idTrabajador
        )?.toString?.() ?? null;
      await this.recordDocDraftCreated({
        documentType,
        documentId: result._id.toString(),
        trabajadorId: resolvedTrabajadorId,
        actorId: updateDto.updatedBy,
        source: 'updateOrCreateDocument',
      });
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

      // notaMedica: $unset campos vitales con null ("Se desconoce")
      const VITAL_SIGNS_FIELDS = [
        'tensionArterialSistolica',
        'tensionArterialDiastolica',
        'frecuenciaCardiaca',
        'frecuenciaRespiratoria',
        'temperatura',
        'saturacionOxigeno',
      ];
      let updatePayload: any = { ...updateDto };
      if (updatePayload.createdBy == null) {
        delete updatePayload.createdBy;
      }
      if (documentType === 'notaMedica') {
        const unsetVitals: Record<string, 1> = {};
        for (const field of VITAL_SIGNS_FIELDS) {
          if (updateDto[field] === null) {
            delete updatePayload[field];
            unsetVitals[field] = 1;
          }
        }
        if (Object.keys(unsetVitals).length > 0) {
          updatePayload = { ...updatePayload, $unset: unsetVitals };
        }
      }

      result = await model
        .findByIdAndUpdate(id, updatePayload, { new: true })
        .exec();
      const resolvedTrabajadorId =
        (
          updateDto.idTrabajador ?? existingDocument.idTrabajador
        )?.toString?.() ?? null;
      await this.recordDocDraftUpdated({
        documentType,
        documentId: result._id.toString(),
        trabajadorId: resolvedTrabajadorId,
        actorId: updateDto.updatedBy,
        estadoActual: (result as any).estado ?? existingDocument.estado,
        changedKeys: Object.keys(updateDto ?? {}),
      });
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
  ): Promise<any> {
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

    const payload: Record<string, unknown> = {
      estadoAnterior,
      estadoNuevo: DocumentoEstado.FINALIZADO,
      documentType,
      documentId: id,
      ...(idTrabajador && { idTrabajador }),
      ...(opciones?.motivo && { motivo: opciones.motivo }),
    };

    // Audit (Clase 1: if this fails, finalization does not proceed)
    await this.auditService.record({
      proveedorSaludId: proveedorSaludId ?? null,
      actorId: userId,
      actionType: AuditActionType.DOC_FINALIZE,
      resourceType: documentType,
      resourceId: id,
      payload,
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });

    // Update document state
    document.estado = DocumentoEstado.FINALIZADO;
    document.fechaFinalizacion = new Date();
    document.finalizadoPor = userId;

    const savedDocument = await document.save();

    // NUEVO: Regenerar PDF con datos de elaborador y finalizador
    try {
      const creadorId = document.createdBy?.toString() || userId;
      await this.informesService.regenerarInformeAlFinalizar(
        documentType,
        id,
        creadorId,
        userId, // finalizador
      );
    } catch (error) {
      console.error('Error al regenerar PDF al finalizar documento:', error);
      // No lanzamos excepción para no bloquear la finalización del documento
      // El documento queda finalizado aunque falle la regeneración del PDF
    }

    // Update trabajador's updatedAt
    if (document.idTrabajador) {
      await this.actualizarUpdatedAtTrabajador(
        document.idTrabajador.toString(),
      );
    }

    return savedDocument;
  }

  async uploadDocument(createDto: any): Promise<any> {
    const model = this.models['documentoExterno'];

    // NOM-024: Resolver a trabajador canónico (fusión de registros)
    if (createDto.idTrabajador) {
      createDto.idTrabajador =
        await this.workerFusionService.getCanonicalTrabajadorId(
          createDto.idTrabajador,
        );
    }

    const fechaDocumento = createDto.fechaDocumento;
    const nombreDocumento = createDto.nombreDocumento;
    const trabajadorId = createDto.idTrabajador;

    if (!fechaDocumento) {
      throw new BadRequestException(
        `El campo fechaDocumento es requerido para este documento`,
      );
    }

    if (!nombreDocumento) {
      throw new BadRequestException('El campo nombreDocumento es requerido');
    }

    if (!trabajadorId) {
      throw new BadRequestException('El campo idTrabajador es requerido');
    }

    await this.validateDocumentDateE1(
      trabajadorId,
      fechaDocumento,
      'documentoExterno',
    );

    // ✅ SIEMPRE crear una nueva entidad para evitar archivos huérfanos
    // Esto permite que cada archivo tenga su propio registro y se pueda gestionar individualmente
    const createdDocument = new model(createDto);
    const result = await createdDocument.save();

    // ✅ Actualizar el updatedAt del trabajador
    await this.actualizarUpdatedAtTrabajador(trabajadorId);

    return result;
  }

  async findDocuments(
    documentType: string,
    trabajadorId: string,
  ): Promise<any[]> {
    // NOM-024: Resolver a trabajador canónico (fusión de registros)
    const canonicalId =
      await this.workerFusionService.getCanonicalTrabajadorId(trabajadorId);

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

  private async resolveIncludeControlPrenatalForCounts(
    trabajadorId: string,
  ): Promise<boolean> {
    const proveedorSaludId =
      await this.getProveedorSaludIdFromTrabajador(trabajadorId);
    if (!proveedorSaludId) {
      return true;
    }

    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    return policy.features.controlPrenatalEnabled;
  }

  private async countDocumentStatsForWorker(
    config: WorkerLinkedCollectionConfig,
    workerId: Types.ObjectId,
  ): Promise<{ modelName: string; count: number; latestDate: Date | null }> {
    const documentType =
      EXPEDIENTE_MODEL_NAME_TO_DOCUMENT_TYPE[config.modelName];
    const model = documentType ? this.models[documentType] : undefined;
    if (!model) {
      return { modelName: config.modelName, count: 0, latestDate: null };
    }

    const filter =
      config.fkField === 'trabajadorId'
        ? { trabajadorId: workerId }
        : { idTrabajador: workerId };

    const dateField = this.dateFields[documentType];
    if (dateField) {
      const [stats] = await model
        .aggregate<{ count: number; maxDate: Date | null }>([
          { $match: filter },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              maxDate: { $max: `$${dateField}` },
            },
          },
        ])
        .exec();

      return {
        modelName: config.modelName,
        count: stats?.count ?? 0,
        latestDate: stats?.maxDate ? new Date(stats.maxDate) : null,
      };
    }

    const count = await model.countDocuments(filter).exec();
    return { modelName: config.modelName, count, latestDate: null };
  }

  async countDocumentosByTrabajador(trabajadorId: string): Promise<{
    conteos: Record<string, number>;
    total: number;
    resultadosClinicosConteos: Record<string, number>;
    totalResultadosClinicos: number;
    vinculadosConteos: Record<string, number>;
    totalVinculados: number;
    fechaUltimaActividad: string | null;
  }> {
    if (!isValidObjectId(trabajadorId)) {
      throw new BadRequestException('El ID del trabajador no es válido');
    }

    const workerId = new Types.ObjectId(trabajadorId);

    const allDocumentConfigs = WORKER_LINKED_COLLECTIONS.filter((config) =>
      EXPEDIENTE_DOCUMENT_MODEL_NAMES.has(config.modelName),
    );

    const vinculadosConfigs = WORKER_LINKED_COLLECTIONS.filter(
      (config) =>
        !EXPEDIENTE_DOCUMENT_MODEL_NAMES.has(config.modelName) &&
        config.modelName !== 'ResultadoClinico',
    );

    const includeControlPrenatalPromise =
      this.resolveIncludeControlPrenatalForCounts(trabajadorId);

    const documentStatsPromise = Promise.all(
      allDocumentConfigs.map((config) =>
        this.countDocumentStatsForWorker(config, workerId),
      ),
    );

    const vinculadosConteos: Record<string, number> = {};
    const vinculadosCountPromise = Promise.all(
      vinculadosConfigs.map(async (config) => {
        let model: Model<any>;
        try {
          model = this.connection.model(config.modelName);
        } catch {
          return;
        }

        const filter =
          config.fkField === 'trabajadorId'
            ? { trabajadorId: workerId }
            : { idTrabajador: workerId };

        const count = await model.countDocuments(filter).exec();
        vinculadosConteos[config.modelName] = count;
      }),
    );

    const rcStatsPromise = this.resultadoClinicoModel
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
            latest: [{ $group: { _id: null, maxDate: { $max: '$fechaEstudio' } } }],
          },
        },
      ])
      .exec();

    const [includeControlPrenatal, documentStats, , rcFacetRows] =
      await Promise.all([
        includeControlPrenatalPromise,
        documentStatsPromise,
        vinculadosCountPromise,
        rcStatsPromise,
      ]);

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

    let totalVinculados = 0;
    for (const count of Object.values(vinculadosConteos)) {
      totalVinculados += count;
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
      vinculadosConteos,
      totalVinculados,
      fechaUltimaActividad,
    };
  }

  async findAllDocuments(trabajadorId: string): Promise<Record<string, any[]>> {
    const documentTypes = Object.keys(this.models);
    const entries = await Promise.all(
      documentTypes.map(async (documentType) => {
        const docs = await this.findDocuments(documentType, trabajadorId);
        const storeKey =
          this.documentTypeToStoreKey[documentType] ?? documentType;
        return [storeKey, docs] as const;
      }),
    );

    const result = Object.fromEntries(entries);

    const proveedorSaludId =
      await this.getProveedorSaludIdFromTrabajador(trabajadorId);
    if (proveedorSaludId) {
      const policy =
        await this.regulatoryPolicyService.getRegulatoryPolicy(
          proveedorSaludId,
        );
      if (!policy.features.controlPrenatalEnabled) {
        result.controlPrenatal = [];
      }
    }

    return result;
  }

  async findDocument(documentType: string, id: string): Promise<any> {
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

  async upsertDocumentoExterno(
    id: string | null,
    updateDto: any,
  ): Promise<any> {
    const model = this.models.documentoExterno;
    const dateField = 'fechaDocumento';

    if (!model) {
      throw new BadRequestException(
        'El modelo documentoExterno no está definido',
      );
    }

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

    await this.validateDocumentDateE1(
      trabajadorId,
      newFecha,
      'documentoExterno',
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

      // Aplicar soft delete (anulación) independientemente de si es MX o no
      // para mantener consistencia cuando se usa el modal de anulación
      document.estado = DocumentoEstado.ANULADO;
      document.fechaAnulacion = new Date();
      document.anuladoPor = actorUserId;
      document.razonAnulacion = razonAnulacion;

      await document.save();

      // Actualizar trabajador updatedAt
      if (document.idTrabajador) {
        await this.actualizarUpdatedAtTrabajador(
          document.idTrabajador.toString(),
        );
      }

      await this.recordDocAnulated({
        documentType,
        documentId: document._id.toString(),
        trabajadorId: document.idTrabajador?.toString?.() ?? null,
        actorId: actorUserId,
        estadoAnterior: DocumentoEstado.FINALIZADO,
        razonAnulacion,
        fechaAnulacion: document.fechaAnulacion ?? null,
      });

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
  ): Promise<{ altura: number | null; fuente: string | null }> {
    const canonicalId =
      await this.workerFusionService.getCanonicalTrabajadorId(trabajadorId);
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
  ): Promise<{ motivoExamen: string | null }> {
    const canonicalId =
      await this.workerFusionService.getCanonicalTrabajadorId(trabajadorId);
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
  async createDeteccion(createDto: any): Promise<any> {
    if (createDto.idTrabajador) {
      createDto.idTrabajador =
        await this.workerFusionService.getCanonicalTrabajadorId(
          createDto.idTrabajador,
        );
    }

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
  async updateDeteccion(id: string, updateDto: any): Promise<any> {
    const existingDeteccion = await this.deteccionModel.findById(id).exec();

    if (!existingDeteccion) {
      throw new BadRequestException(`Detección con ID ${id} no encontrada`);
    }

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
  async findDeteccion(id: string): Promise<any> {
    return this.deteccionModel.findById(id).exec();
  }

  /**
   * GIIS-B019: Find all Detecciones for a trabajador
   */
  async findDeteccionesByTrabajador(trabajadorId: string): Promise<any[]> {
    const canonicalId =
      await this.workerFusionService.getCanonicalTrabajadorId(trabajadorId);
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
      deteccion.estado = DocumentoEstado.ANULADO;
      deteccion.fechaAnulacion = new Date();
      deteccion.anuladoPor = userId as any;
      deteccion.razonAnulacion = razonAnulacion;
      await deteccion.save();
      if (deteccion.idTrabajador) {
        await this.actualizarUpdatedAtTrabajador(
          deteccion.idTrabajador.toString(),
        );
      }
      await this.recordDocAnulated({
        documentType: 'deteccion',
        documentId: deteccion._id.toString(),
        trabajadorId: deteccion.idTrabajador?.toString?.() ?? null,
        actorId: userId,
        estadoAnterior: DocumentoEstado.FINALIZADO,
        razonAnulacion,
        fechaAnulacion: deteccion.fechaAnulacion ?? null,
      });
      return { deleted: false, anulado: true };
    }

    await this.deteccionModel.findByIdAndDelete(id).exec();
    return { deleted: true, anulado: false };
  }

  /**
   * GIIS-B019: Finalize Detección
   */
  async finalizarDeteccion(id: string, userId: string): Promise<any> {
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

    deteccion.estado = DocumentoEstado.FINALIZADO;
    deteccion.fechaFinalizacion = new Date();
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
