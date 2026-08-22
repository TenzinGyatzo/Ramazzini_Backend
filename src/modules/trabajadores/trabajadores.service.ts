import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Trabajador } from './entities/trabajador.entity';
import { CreateTrabajadorDto } from './dto/create-trabajador.dto';
import { UpdateTrabajadorDto } from './dto/update-trabajador.dto';
import { normalizeTrabajadorData, applyTrabajadorPersonNames, collapsePersonNameWhitespace } from 'src/utils/normalization';
import moment from 'moment';
import * as xlsx from 'xlsx';
import { format } from 'date-fns';
import {
  calcularEdad,
  calcularAntiguedad,
  convertirFechaADDMMAAAA,
} from 'src/utils/dates';
import {
  validateCurpForSires,
  validateOptionalCurpSinRegimen,
} from 'src/utils/curp-sires-validation.util';
import { NOM024ComplianceUtil } from 'src/utils/nom024-compliance.util';
import { validateTrabajadorNames, validatePersonNameFields, assertValidPersonNameFields } from 'src/utils/name-validator.util';
import { RegulatoryPolicyService } from 'src/utils/regulatory-policy.service';
import type { RegulatoryPolicy } from 'src/utils/regulatory-policy.service';
import { validateWorkerIdentificationImmutable } from 'src/utils/worker-identification-immutability.util';
import { createRegulatoryError } from 'src/utils/regulatory-error-helper';
import { RegulatoryErrorCode } from 'src/utils/regulatory-error-codes';
import {
  AGE_MAX_YEARS,
  AGE_MIN_YEARS,
  validateFechaNacimiento,
} from '../expedientes/validators/date-validators';
import { CatalogsService } from '../catalogs/catalogs.service';
import { GeographyValidator } from '../catalogs/validators/geography.validator';
import {
  isEntidadResidenciaEspecial,
  LOCALIDADES_RESIDENCIA_ESPECIALES,
  MUNICIPIOS_RESIDENCIA_ESPECIALES,
  validateResidenciaGeoGiisCoherence,
} from 'src/utils/giis-residencia-geo.util';
import { validatePaisEntidadCoherence } from 'src/utils/geo-selector-rules.util';
import { Antidoping } from '../expedientes/schemas/antidoping.schema';
import { AptitudPuesto } from '../expedientes/schemas/aptitud-puesto.schema';
import { Audiometria } from '../expedientes/schemas/audiometria.schema';
import { Certificado } from '../expedientes/schemas/certificado.schema';
import { CertificadoExpedito } from '../expedientes/schemas/certificado-expedito.schema';
import { DocumentoExterno } from '../expedientes/schemas/documento-externo.schema';
import { ExamenVista } from '../expedientes/schemas/examen-vista.schema';
import { ExploracionFisica } from '../expedientes/schemas/exploracion-fisica.schema';
import { HistoriaClinica } from '../expedientes/schemas/historia-clinica.schema';
import { NotaMedica } from '../expedientes/schemas/nota-medica.schema';
import { NotaAclaratoria } from '../expedientes/schemas/nota-aclaratoria.schema';
import { ControlPrenatal } from '../expedientes/schemas/control-prenatal.schema';
import { FilesService } from '../files/files.service';
import { RiesgoTrabajo } from '../riesgos-trabajo/schemas/riesgo-trabajo.schema';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { User } from '../users/schemas/user.schema';
import { Empresa } from '../empresas/schemas/empresa.schema';
import { Receta } from '../expedientes/schemas/receta.schema';
import { ConstanciaAptitud } from '../expedientes/schemas/constancia-aptitud.schema';
import { EntrevistaPsicologica } from '../expedientes/schemas/entrevista-psicologica.schema';
import { TrastornosEstadoAnimo } from '../expedientes/schemas/trastornos-estado-animo.schema';
import { CuestionarioProdromalBreve } from '../expedientes/schemas/cuestionario-prodromal-breve.schema';
import { TrastornoLimitePersonalidad } from '../expedientes/schemas/trastorno-limite-personalidad.schema';
import { generateFolioFromWorkerData } from 'src/utils/folio-generator.util';
import { WorkerFusionService } from './worker-fusion.service';
import { normalizeSexoCurpInput } from 'src/utils/sexo-curp.util';
import { isTrabajadorSexoCurp } from './constants/trabajador-sexo-curp.constants';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import { ClinicalAttentionQueryService } from '../expedientes/services/clinical-attention-query.service';
import { EventoSeguimientoCardiometabolico } from '../expedientes/schemas/evento-seguimiento-cardiometabolico.schema';
import { InformeLongitudinalCardiometabolico } from '../expedientes/schemas/informe-longitudinal-cardiometabolico.schema';
import {
  ResultadoClinico,
  ResultadoGlobal,
  TipoEstudio,
} from '../resultados-clinicos/schemas/resultado-clinico.schema';
import type {
  CreateTrabajadorResult,
  TransferirTrabajadorResult,
} from './interfaces/duplicate-match.interface';

@Injectable()
export class TrabajadoresService {
  constructor(
    @InjectModel(Trabajador.name) private trabajadorModel: Model<Trabajador>,
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
    @InjectModel(Receta.name) private recetaModel: Model<Receta>,
    @InjectModel(ControlPrenatal.name)
    private controlPrenatalModel: Model<ControlPrenatal>,
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
    @InjectModel(EventoSeguimientoCardiometabolico.name)
    private eventoSeguimientoCardiometabolicoModel: Model<EventoSeguimientoCardiometabolico>,
    @InjectModel(InformeLongitudinalCardiometabolico.name)
    private informeLongitudinalCardiometabolicoModel: Model<InformeLongitudinalCardiometabolico>,
    @InjectModel(RiesgoTrabajo.name)
    private riesgoTrabajoModel: Model<RiesgoTrabajo>,
    @InjectModel(ResultadoClinico.name)
    private resultadoClinicoModel: Model<ResultadoClinico>,
    @InjectModel(CentroTrabajo.name)
    private centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Empresa.name) private empresaModel: Model<Empresa>,
    private filesService: FilesService,
    private nom024Util: NOM024ComplianceUtil,
    private catalogsService: CatalogsService,
    private geographyValidator: GeographyValidator,
    @Inject(forwardRef(() => RegulatoryPolicyService))
    private regulatoryPolicyService: RegulatoryPolicyService,
    private workerFusionService: WorkerFusionService,
    @Inject(forwardRef(() => AuditService))
    private auditService: AuditService,
    private clinicalAttentionQuery: ClinicalAttentionQueryService,
  ) {}

  /**
   * Get proveedorSaludId from idCentroTrabajo
   * CentroTrabajo -> Empresa -> ProveedorSalud
   */
  private async getProveedorSaludIdFromCentroTrabajo(
    idCentroTrabajo: string,
  ): Promise<string | null> {
    try {
      const centroTrabajo = await this.centroTrabajoModel
        .findById(idCentroTrabajo)
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
   * Validate geographic hierarchy (A3) - applies to all providers
   * This is the "last guardian" for direct payloads, imports, and regulatory integrity
   */
  private async validateGeographyHierarchy(
    dto: CreateTrabajadorDto | UpdateTrabajadorDto,
  ): Promise<void> {
    const errors: Array<{ field: string; reason: string }> = [];

    // Validate entidadNacimiento hierarchy if provided
    if (dto.entidadNacimiento) {
      const entidadNac = dto.entidadNacimiento.trim().toUpperCase();
      const isValid = await this.geographyValidator.validateEntidad(entidadNac);
      if (!isValid) {
        errors.push({
          field: 'entidadNacimiento',
          reason: `La entidad "${entidadNac}" no existe en el catálogo`,
        });
      }
    }

    // Validate residencia hierarchy if any field is provided
    if (
      dto.entidadResidencia ||
      dto.municipioResidencia ||
      dto.localidadResidencia
    ) {
      const validationResult = await this.geographyValidator.validateGeography({
        entidad: dto.entidadResidencia,
        municipio: dto.municipioResidencia,
        localidad: dto.localidadResidencia,
      });

      if (!validationResult.valid) {
        errors.push(
          ...validationResult.errors.map((e) => ({
            field:
              e.field === 'entidad'
                ? 'entidadResidencia'
                : e.field === 'municipio'
                  ? 'municipioResidencia'
                  : 'localidadResidencia',
            reason: e.reason,
          })),
        );
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        ruleId: 'A3',
        message: 'La información geográfica es inconsistente',
        details: errors,
      });
    }
  }

  /**
   * Validate NOM-024 person identification fields (MX providers only)
   */
  private async validateNOM024PersonFields(
    dto: CreateTrabajadorDto | UpdateTrabajadorDto,
    proveedorSaludId: string | null,
  ): Promise<void> {
    if (!proveedorSaludId) {
      // If we can't determine provider, allow (backward compatibility)
      return;
    }

    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);

    if (policy.validation.geoFields !== 'required') {
      // SIN_REGIMEN: fields are optional, no validation needed
      return;
    }

    // SIRES: validate required fields and catalog codes
    const errors: string[] = [];

    // 1. Validate entidadNacimiento (required for SIRES)
    if (!dto.entidadNacimiento || dto.entidadNacimiento.trim() === '') {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED,
        details: { fieldName: 'entidadNacimiento' },
        regime: policy.regime,
      });
    } else {
      const entidadNac = dto.entidadNacimiento.trim().toUpperCase();
      // Centinelas GIIS (00, 88, 99, NE) + estatales INEGI 01-32
      if (!isEntidadResidenciaEspecial(entidadNac)) {
        const isValid = await this.catalogsService.validateINEGI(
          'estado',
          entidadNac,
        );
        if (!isValid) {
          errors.push(
            `Entidad de nacimiento inválida: ${entidadNac}. Debe ser código INEGI/GIIS válido (01-32, 00, 88 o 99)`,
          );
        }
      }
    }

    // 2. Validate paisNacimiento (required for SIRES)
    if (dto.paisNacimiento == null || Number.isNaN(Number(dto.paisNacimiento))) {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED,
        details: { fieldName: 'paisNacimiento' },
        regime: policy.regime,
      });
    } else {
      const paisResult = this.catalogsService.validateGIISPais(
        dto.paisNacimiento,
      );
      if (paisResult.catalogLoaded && !paisResult.valid) {
        errors.push(
          `País de nacimiento inválido: ${dto.paisNacimiento}. Debe ser CATALOG_KEY válido de cat_pais (ej: 142=México, 248=NO ESPECIFICADO)`,
        );
      }
    }

    // 3. Validate entidadResidencia (required for SIRES)
    if (!dto.entidadResidencia || dto.entidadResidencia.trim() === '') {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED,
        details: { fieldName: 'entidadResidencia' },
        regime: policy.regime,
      });
    } else {
      const entidadRes = dto.entidadResidencia.trim().toUpperCase();
      if (!isEntidadResidenciaEspecial(entidadRes)) {
        const isValid = await this.catalogsService.validateINEGI(
          'estado',
          entidadRes,
        );
        if (!isValid) {
          errors.push(
            `Entidad de residencia inválida: ${entidadRes}. Debe ser código INEGI/GIIS válido (01-32, NE, 00, 88 o 99)`,
          );
        }
      }
    }

    // 4. Validate municipioResidencia (required for SIRES, allows GIIS/INEGI sentinels)
    if (!dto.municipioResidencia || dto.municipioResidencia.trim() === '') {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED,
        details: { fieldName: 'municipioResidencia' },
        regime: policy.regime,
      });
    } else {
      const municipioRes = dto.municipioResidencia.trim();
      const entidadRes = dto.entidadResidencia?.trim().toUpperCase() || '';

      if (
        !MUNICIPIOS_RESIDENCIA_ESPECIALES.includes(
          municipioRes as (typeof MUNICIPIOS_RESIDENCIA_ESPECIALES)[number],
        ) &&
        entidadRes &&
        !isEntidadResidenciaEspecial(entidadRes)
      ) {
        // Hierarchical validation: municipio must belong to estado
        const isValid = await this.catalogsService.validateINEGI(
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
    }

    // 5. Validate localidadResidencia (required for SIRES, allows "0000" as sentinel)
    if (!dto.localidadResidencia || dto.localidadResidencia.trim() === '') {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED,
        details: { fieldName: 'localidadResidencia' },
        regime: policy.regime,
      });
    } else {
      const localidadRes = dto.localidadResidencia.trim();
      const municipioRes = dto.municipioResidencia?.trim() || '';
      const entidadRes = dto.entidadResidencia?.trim().toUpperCase() || '';

      if (
        !LOCALIDADES_RESIDENCIA_ESPECIALES.includes(
          localidadRes as (typeof LOCALIDADES_RESIDENCIA_ESPECIALES)[number],
        ) &&
        municipioRes &&
        !MUNICIPIOS_RESIDENCIA_ESPECIALES.includes(
          municipioRes as (typeof MUNICIPIOS_RESIDENCIA_ESPECIALES)[number],
        ) &&
        entidadRes &&
        !isEntidadResidenciaEspecial(entidadRes)
      ) {
        // Hierarchical validation: localidad must belong to municipio (within estado)
        const parentKey = `${entidadRes}-${municipioRes}`;
        const isValid = await this.catalogsService.validateINEGI(
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
    }

    // 6. Validate paisResidencia (required for SIRES)
    if (dto.paisResidencia == null || Number.isNaN(Number(dto.paisResidencia))) {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED,
        details: { fieldName: 'paisResidencia' },
        regime: policy.regime,
      });
    } else {
      const paisResResult = this.catalogsService.validateGIISPais(
        dto.paisResidencia,
      );
      if (paisResResult.catalogLoaded && !paisResResult.valid) {
        errors.push(
          `País de residencia inválido: ${dto.paisResidencia}. Debe ser CATALOG_KEY válido de cat_pais (ej: 142=México, 248=NO ESPECIFICADO)`,
        );
      }
    }

    // 7. sexoCURP (requerido SIRES — sexo RENAPO para CURP, independiente de sexo biológico)
    if (dto.sexoCURP == null || !isTrabajadorSexoCurp(Number(dto.sexoCURP))) {
      throw createRegulatoryError({
        errorCode: RegulatoryErrorCode.REGIMEN_FIELD_REQUIRED,
        details: { fieldName: 'sexoCURP' },
        regime: policy.regime,
      });
    }

    errors.push(
      ...validatePaisEntidadCoherence(
        Number(dto.paisNacimiento),
        dto.entidadNacimiento.trim().toUpperCase(),
        'trabajador',
        'nacimiento',
      ),
    );

    errors.push(
      ...validatePaisEntidadCoherence(
        Number(dto.paisResidencia),
        dto.entidadResidencia?.trim().toUpperCase() ?? '',
        'trabajador',
        'residencia',
      ),
    );

    errors.push(
      ...validateResidenciaGeoGiisCoherence(
        {
          paisResidencia: dto.paisResidencia,
          entidadResidencia: dto.entidadResidencia?.trim().toUpperCase(),
          municipioResidencia: dto.municipioResidencia?.trim(),
          localidadResidencia: dto.localidadResidencia?.trim(),
        },
        'trabajador',
      ),
    );

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }
  }

  /**
   * Validate CURP according to regulatory policy
   */
  private async validateCURPForMX(
    curp: string | undefined,
    proveedorSaludId: string | null,
    trabajadorData?: {
      fechaNacimiento?: Date;
      sexo?: string;
      sexoCURP?: number;
      entidadNacimiento?: string;
      nombre?: string;
      primerApellido?: string;
      segundoApellido?: string;
    },
  ): Promise<void> {
    if (!proveedorSaludId) {
      // If we can't determine provider, allow (backward compatibility)
      return;
    }

    const pais = await this.nom024Util.getProveedorPais(proveedorSaludId);
    if (pais !== 'MX') {
      return;
    }

    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);

    const workerCurpPolicy = policy.validation.workerCurp;
    const isCurpRequired = workerCurpPolicy === 'required_strict';

    if (isCurpRequired) {
      validateCurpForSires(
        curp,
        true,
        {
          fechaNacimiento: trabajadorData?.fechaNacimiento,
          sexoCURP: normalizeSexoCurpInput(trabajadorData?.sexoCURP) ?? undefined,
          entidadNacimiento: trabajadorData?.entidadNacimiento,
          nombre: trabajadorData?.nombre,
          primerApellido: trabajadorData?.primerApellido,
          segundoApellido: trabajadorData?.segundoApellido,
        },
        {
          allowGenericCurp: true,
          subjectLabel: 'trabajador',
          regime: policy.regime,
        },
      );
    } else {
      validateOptionalCurpSinRegimen(curp);
    }
  }

  /**
   * Validate NOM-024 name format rules for Trabajador names
   * - MX providers: Strict enforcement (block saves with errors)
   * - Non-MX providers: Warnings only (log but allow saves)
   *
   * Rules enforced:
   * - Uppercase only (handled by normalization)
   * - Maximum 50 characters per field
   * - No abbreviations (DR., ING., LIC., SR., SRA., PROF., etc.)
   * - No trailing periods
   */
  private async validateNOM024NameFormat(
    nombre: string | undefined,
    primerApellido: string | undefined,
    segundoApellido: string | undefined,
    proveedorSaludId: string | null,
  ): Promise<void> {
    const validation = validateTrabajadorNames(
      nombre,
      primerApellido,
      segundoApellido,
    );

    // Log warnings for all providers
    if (validation.warnings.length > 0) {
      console.warn(
        `NOM-024 Name Format Warnings: ${validation.warnings.join('; ')}`,
      );
    }

    if (!proveedorSaludId) {
      // If we can't determine provider, allow (backward compatibility)
      // But still log errors as warnings
      if (!validation.isValid) {
        console.warn(
          `NOM-024 Name Format Issues (provider unknown): ${validation.errors.join('; ')}`,
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
          `NOM-024 Name Format Issues (non-MX provider): ${validation.errors.join('; ')}`,
        );
      }
    }
  }
  async create(createTrabajadorDto: CreateTrabajadorDto): Promise<CreateTrabajadorResult> {
    const normalizedDto = normalizeTrabajadorData(createTrabajadorDto);

    // Validar fechaNacimiento (A2)
    validateFechaNacimiento(normalizedDto.fechaNacimiento);

    // Validate geographic hierarchy (A3) - applies to all providers
    await this.validateGeographyHierarchy(normalizedDto);

    // Validar unicidad del número de empleado a nivel empresa si se proporciona
    if (normalizedDto.numeroEmpleado) {
      await this.validateNumeroEmpleadoUniqueness(
        normalizedDto.numeroEmpleado,
        normalizedDto.idCentroTrabajo,
      );
    }

    // Validate NOM-024 fields for MX providers
    const proveedorSaludId = await this.getProveedorSaludIdFromCentroTrabajo(
      normalizedDto.idCentroTrabajo,
    );
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    applyTrabajadorPersonNames(normalizedDto, policy?.regime);
    assertValidPersonNameFields(
      normalizedDto.nombre,
      normalizedDto.primerApellido,
      normalizedDto.segundoApellido,
      policy?.regime,
    );
    await this.validateNOM024PersonFields(normalizedDto, proveedorSaludId);
    await this.validateCURPForMX(normalizedDto.curp, proveedorSaludId, {
      fechaNacimiento: normalizedDto.fechaNacimiento,
      sexoCURP: normalizeSexoCurpInput(normalizedDto.sexoCURP) ?? undefined,
      entidadNacimiento: normalizedDto.entidadNacimiento,
      nombre: normalizedDto.nombre,
      primerApellido: normalizedDto.primerApellido,
      segundoApellido: normalizedDto.segundoApellido,
    });

    // NOM-024: Validate name format (MX strict, non-MX warnings)
    await this.validateNOM024NameFormat(
      normalizedDto.nombre,
      normalizedDto.primerApellido,
      normalizedDto.segundoApellido,
      proveedorSaludId,
    );

    // Normalize fields to uppercase if provided
    if (normalizedDto.curp) {
      normalizedDto.curp = normalizedDto.curp.trim().toUpperCase();
    }
    if (normalizedDto.entidadNacimiento) {
      normalizedDto.entidadNacimiento = normalizedDto.entidadNacimiento
        .trim()
        .toUpperCase();
    }
    if (normalizedDto.entidadResidencia) {
      normalizedDto.entidadResidencia = normalizedDto.entidadResidencia
        .trim()
        .toUpperCase();
    }

    // NOM-024: Generar folio alfanumérico 18 caracteres (solo nuevos, no retroactivo)
    const folio = generateFolioFromWorkerData({
      nombre: normalizedDto.nombre,
      primerApellido: normalizedDto.primerApellido,
      segundoApellido: normalizedDto.segundoApellido,
      fechaNacimiento: normalizedDto.fechaNacimiento,
      sexo: normalizedDto.sexo,
    });
    (normalizedDto as any).folio = folio;

    // NOM-024: Detectar posible duplicado (señalización manual — sin fusión automática)
    const posibleDuplicado = await this.workerFusionService.findDuplicateInEmpresa(
      { ...normalizedDto, folio } as any,
      normalizedDto.idCentroTrabajo,
    );

    try {
      const createdTrabajador = new this.trabajadorModel(normalizedDto);
      const savedTrabajador = await createdTrabajador.save();

      let posibleDuplicadoResult = posibleDuplicado;
      if (posibleDuplicado) {
        const idEmpresa = await this.workerFusionService.getIdEmpresaFromCentro(
          normalizedDto.idCentroTrabajo,
        );
        if (idEmpresa) {
          const alert = await this.workerFusionService.createDuplicateAlert(
            savedTrabajador._id.toString(),
            posibleDuplicado.trabajadorId,
            posibleDuplicado.criterio,
            idEmpresa,
            normalizedDto.createdBy,
          );
          if (alert?._id) {
            posibleDuplicadoResult = {
              ...posibleDuplicado,
              alertId: alert._id.toString(),
            };
          }
        }
      }

      return { trabajador: savedTrabajador, posibleDuplicado: posibleDuplicadoResult };
    } catch (error) {
      console.error('Error al guardar el trabajador:', error);
      throw error;
    }
  }

  async countByCenter(id: string): Promise<number> {
    return this.trabajadorModel.countDocuments({ idCentroTrabajo: id }).exec();
  }

  async findWorkersByCenter(id: string): Promise<any[]> {
    const trabajadores = await this.trabajadorModel.find({ idCentroTrabajo: id }).lean().exec();
    const ids = trabajadores.map((t) => t._id.toString());
    const alertCounts = await this.workerFusionService.getPendingAlertCountsByWorkerIds(ids);

    return trabajadores.map((t) => {
      const workerId = t._id.toString();
      const count = alertCounts.get(workerId) ?? 0;
      return {
        ...t,
        tieneDuplicadoPendiente: count > 0,
        alertasPendientesCount: count,
      };
    });
  }

  async findWorkersWithHistoriaDataByCenter(centroId: string): Promise<any[]> {
    const LISTADO_TRABAJADOR_FIELDS =
      '_id primerApellido segundoApellido nombre fechaNacimiento sexo escolaridad puesto fechaIngreso telefono contactoEmergenciaNombre contactoEmergenciaTelefono estadoCivil numeroEmpleado nss curp agentesRiesgoActuales estadoLaboral idCentroTrabajo createdBy updatedBy fechaTransferencia createdAt updatedAt folio';

    const trabajadores = await this.trabajadorModel
      .find({ idCentroTrabajo: centroId })
      .select(LISTADO_TRABAJADOR_FIELDS)
      .lean();

    trabajadores.sort((a, b) => {
      const fechaA = a.fechaTransferencia || (a as any).createdAt;
      const fechaB = b.fechaTransferencia || (b as any).createdAt;
      return new Date(fechaA).getTime() - new Date(fechaB).getTime();
    });

    const trabajadoresIds = trabajadores.map((t) => t._id);
    if (trabajadoresIds.length === 0) {
      return [];
    }

    const workerIdStrings = trabajadoresIds.map((id) => id.toString());
    const alertCounts =
      await this.workerFusionService.getPendingAlertCountsByWorkerIds(workerIdStrings);

    const canonicalIdMap =
      await this.workerFusionService.resolveCanonicalIdMap(workerIdStrings);
    const queryIds = [
      ...new Set([
        ...workerIdStrings,
        ...Array.from(canonicalIdMap.values()),
      ]),
    ].map((id) => new Types.ObjectId(id));

    const tiposRcLista = [
      TipoEstudio.ESPIROMETRIA,
      TipoEstudio.EKG,
      TipoEstudio.RAYOS_X,
      TipoEstudio.ANALISIS_LABORATORIO,
    ];

    const [
      historiasAgg,
      aptitudesAgg,
      exploracionesAgg,
      examenesAgg,
      consultasAgg,
      audiometriasAgg,
      resultadosAgg,
      eventoSeguimientoCardiometabolicoAgg,
      informeLongitudinalCardiometabolicoAgg,
    ] = await Promise.all([
      this.historiaClinicaModel
        .aggregate([
          { $match: { idTrabajador: { $in: queryIds } } },
          { $sort: { fechaHistoriaClinica: -1 } },
          {
            $group: {
              _id: '$idTrabajador',
              lumbalgias: { $first: '$lumbalgias' },
              diabeticosPP: { $first: '$diabeticosPP' },
              cardiopaticosPP: { $first: '$cardiopaticosPP' },
              alergicos: { $first: '$alergicos' },
              hipertensivosPP: { $first: '$hipertensivosPP' },
              respiratorios: { $first: '$respiratorios' },
              epilepticosPP: { $first: '$epilepticosPP' },
              accidentes: { $first: '$accidentes' },
              quirurgicos: { $first: '$quirurgicos' },
              otros: { $first: '$otros' },
              alcoholismoEspecificar: { $first: '$alcoholismoEspecificar' },
              tabaquismoEspecificar: { $first: '$tabaquismoEspecificar' },
              accidenteLaboral: { $first: '$accidenteLaboral' },
            },
          },
        ])
        .exec(),
      this.aptitudModel
        .aggregate([
          { $match: { idTrabajador: { $in: queryIds } } },
          { $sort: { fechaAptitudPuesto: -1 } },
          {
            $group: {
              _id: '$idTrabajador',
              aptitudPuesto: { $first: '$aptitudPuesto' },
              fechaAptitudPuesto: { $first: '$fechaAptitudPuesto' },
            },
          },
        ])
        .exec(),
      this.exploracionFisicaModel
        .aggregate([
          { $match: { idTrabajador: { $in: queryIds } } },
          { $sort: { fechaExploracionFisica: -1 } },
          {
            $group: {
              _id: '$idTrabajador',
              categoriaIMC: { $first: '$categoriaIMC' },
              categoriaCircunferenciaCintura: { $first: '$categoriaCircunferenciaCintura' },
              categoriaTensionArterial: { $first: '$categoriaTensionArterial' },
              resumenExploracionFisica: { $first: '$resumenExploracionFisica' },
            },
          },
        ])
        .exec(),
      this.examenVistaModel
        .aggregate([
          { $match: { idTrabajador: { $in: queryIds } } },
          { $sort: { fechaExamenVista: -1 } },
          {
            $group: {
              _id: '$idTrabajador',
              requiereLentesUsoGeneral: { $first: '$requiereLentesUsoGeneral' },
              interpretacionIshihara: { $first: '$interpretacionIshihara' },
              sinCorreccionLejanaInterpretacion: { $first: '$sinCorreccionLejanaInterpretacion' },
              ojoIzquierdoLejanaConCorreccion: { $first: '$ojoIzquierdoLejanaConCorreccion' },
              ojoDerechoLejanaConCorreccion: { $first: '$ojoDerechoLejanaConCorreccion' },
            },
          },
        ])
        .exec(),
      this.notaMedicaModel
        .aggregate([
          { $match: { idTrabajador: { $in: queryIds } } },
          { $sort: { fechaNotaMedica: -1 } },
          {
            $group: {
              _id: '$idTrabajador',
              fechaNotaMedica: { $first: '$fechaNotaMedica' },
            },
          },
        ])
        .exec(),
      this.audiometriaModel
        .aggregate([
          { $match: { idTrabajador: { $in: queryIds } } },
          { $sort: { fechaAudiometria: -1 } },
          {
            $group: {
              _id: '$idTrabajador',
              hipoacusiaBilateralCombinada: { $first: '$hipoacusiaBilateralCombinada' },
              perdidaAuditivaBilateralAMA: { $first: '$perdidaAuditivaBilateralAMA' },
              metodoAudiometria: { $first: '$metodoAudiometria' },
              diagnosticoAudiometria: { $first: '$diagnosticoAudiometria' },
            },
          },
        ])
        .exec(),
      this.resultadoClinicoModel
        .aggregate([
          {
            $match: {
              idTrabajador: { $in: queryIds },
              tipoEstudio: { $in: tiposRcLista },
            },
          },
          { $sort: { fechaEstudio: -1 } },
          {
            $group: {
              _id: { tid: '$idTrabajador', tipo: '$tipoEstudio' },
              resultadoGlobal: { $first: '$resultadoGlobal' },
              fechaEstudio: { $first: '$fechaEstudio' },
            },
          },
        ])
        .exec(),
      this.eventoSeguimientoCardiometabolicoModel
        .aggregate([
          { $match: { idTrabajador: { $in: queryIds } } },
          { $sort: { fechaEventoSeguimientoCardiometabolico: -1 } },
          {
            $group: {
              _id: '$idTrabajador',
              fechaEventoSeguimientoCardiometabolico: { $first: '$fechaEventoSeguimientoCardiometabolico' },
            },
          },
        ])
        .exec(),
      this.informeLongitudinalCardiometabolicoModel
        .aggregate([
          { $match: { idTrabajador: { $in: queryIds } } },
          { $sort: { fechaInformeLongitudinalCardiometabolico: -1 } },
          {
            $group: {
              _id: '$idTrabajador',
              fechaInformeLongitudinalCardiometabolico: { $first: '$fechaInformeLongitudinalCardiometabolico' },
            },
          },
        ])
        .exec(),
    ]);

    const historiasMap = new Map<string, any>(
      historiasAgg.map((h) => [h._id.toString(), h]),
    );
    const aptitudesMap = new Map<string, any>(
      aptitudesAgg.map((a) => [a._id.toString(), a]),
    );
    const exploracionesMap = new Map<string, any>(
      exploracionesAgg.map((e) => [e._id.toString(), e]),
    );
    const examenesVistaMap = new Map<string, any>(
      examenesAgg.map((e) => [e._id.toString(), e]),
    );
    const consultasMap = new Map<string, any>(
      consultasAgg.map((c) => [c._id.toString(), c]),
    );
    const audiometriasMap = new Map<string, any>(
      audiometriasAgg.map((a) => [a._id.toString(), a]),
    );
    const eventoSeguimientoCardiometabolicoMap = new Map<string, { fechaEventoSeguimientoCardiometabolico: Date }>(
      eventoSeguimientoCardiometabolicoAgg.map((e) => [e._id.toString(), e]),
    );
    const informeLongitudinalCardiometabolicoMap = new Map<string, { fechaInformeLongitudinalCardiometabolico: Date }>(
      informeLongitudinalCardiometabolicoAgg.map((e) => [e._id.toString(), e]),
    );

    const resultadosEspirometriaMap = new Map<string, { resultadoGlobal?: string; fechaEstudio: Date }>();
    const resultadosEkgMap = new Map<string, { resultadoGlobal?: string; fechaEstudio: Date }>();
    const resultadosRayosXMap = new Map<string, { resultadoGlobal?: string; fechaEstudio: Date }>();
    const resultadosAnalisisLabMap = new Map<string, { resultadoGlobal?: string; fechaEstudio: Date }>();

    for (const row of resultadosAgg) {
      const tid = row._id.tid.toString();
      const tipo = row._id.tipo as TipoEstudio;
      const entry = {
        resultadoGlobal: row.resultadoGlobal ?? undefined,
        fechaEstudio: new Date(row.fechaEstudio),
      };
      switch (tipo) {
        case TipoEstudio.ESPIROMETRIA:
          resultadosEspirometriaMap.set(tid, entry);
          break;
        case TipoEstudio.EKG:
          resultadosEkgMap.set(tid, entry);
          break;
        case TipoEstudio.RAYOS_X:
          resultadosRayosXMap.set(tid, entry);
          break;
        case TipoEstudio.ANALISIS_LABORATORIO:
          resultadosAnalisisLabMap.set(tid, entry);
          break;
        default:
          break;
      }
    }

    const etiquetaResultadoGlobal = (resultadoGlobal: string | undefined): string => {
      if (resultadoGlobal === ResultadoGlobal.NORMAL) return 'Normal';
      if (resultadoGlobal === ResultadoGlobal.ANORMAL) return 'Anormal';
      if (resultadoGlobal === ResultadoGlobal.NO_CONCLUYENTE) return 'No concluyente';
      return '-';
    };

    const resultado = trabajadores.map((trabajador) => {
      const id = trabajador._id.toString();
      const lookupId = canonicalIdMap.get(id) ?? id;

      const historia = historiasMap.get(lookupId);
      const aptitud = aptitudesMap.get(lookupId);
      const exploracion = exploracionesMap.get(lookupId);
      const examenVista = examenesVistaMap.get(lookupId);
      const consulta = consultasMap.get(lookupId);
      const audiometria = audiometriasMap.get(lookupId);
      const alertCount = alertCounts.get(id) ?? 0;

      return {
        ...trabajador,
        tieneDuplicadoPendiente: alertCount > 0,
        alertasPendientesCount: alertCount,
        historiaClinicaResumen: historia
          ? {
              lumbalgias: historia.lumbalgias ?? null,
              diabeticosPP: historia.diabeticosPP ?? null,
              cardiopaticosPP: historia.cardiopaticosPP ?? null,
              alergicos: historia.alergicos ?? null,
              hipertensivosPP: historia.hipertensivosPP ?? null,
              respiratorios: historia.respiratorios ?? null,
              epilepticosPP: historia.epilepticosPP ?? null,
              accidentes: historia.accidentes ?? null,
              quirurgicos: historia.quirurgicos ?? null,
              otros: historia.otros ?? null,
              alcoholismo: historia.alcoholismoEspecificar ?? null,
              tabaquismo: historia.tabaquismoEspecificar ?? null,
              accidenteLaboral: historia.accidenteLaboral ?? null,
            }
          : null,
        aptitudResumen: aptitud
          ? {
              aptitudPuesto: aptitud.aptitudPuesto ?? null,
              fechaAptitudPuesto:
                aptitud.fechaAptitudPuesto != null
                  ? format(new Date(aptitud.fechaAptitudPuesto), 'dd/MM/yyyy')
                  : null,
            }
          : null,
        exploracionFisicaResumen: exploracion
          ? {
              categoriaIMC: exploracion.categoriaIMC ?? null,
              categoriaCircunferenciaCintura:
                exploracion.categoriaCircunferenciaCintura ?? null,
              categoriaTensionArterial:
                exploracion.categoriaTensionArterial ?? null,
              resumenExploracionFisica:
                exploracion.resumenExploracionFisica ?? null,
            }
          : null,
        examenVistaResumen: examenVista
          ? {
              requiereLentesUsoGeneral:
                examenVista.requiereLentesUsoGeneral ?? null,
              interpretacionIshihara:
                examenVista.interpretacionIshihara ?? null,
              sinCorreccionLejanaInterpretacion:
                examenVista.sinCorreccionLejanaInterpretacion ?? null,
              ojoIzquierdoLejanaConCorreccion:
                examenVista.ojoIzquierdoLejanaConCorreccion ?? null,
              ojoDerechoLejanaConCorreccion:
                examenVista.ojoDerechoLejanaConCorreccion ?? null,
            }
          : null,
        consultaResumen: consulta
          ? {
              fechaNotaMedica:
                consulta.fechaNotaMedica != null
                  ? format(new Date(consulta.fechaNotaMedica), 'dd/MM/yyyy')
                  : null,
            }
          : null,
        audiometriaResumen: audiometria
          ? {
              hipoacusiaBilateralCombinada:
                audiometria.hipoacusiaBilateralCombinada ?? null,
              perdidaAuditivaBilateralAMA:
                audiometria.perdidaAuditivaBilateralAMA ?? null,
              metodoAudiometria: audiometria.metodoAudiometria ?? null,
              diagnosticoAudiometria:
                audiometria.diagnosticoAudiometria ?? null,
            }
          : null,
        resultadosClinicosResumen: {
          espirometria: resultadosEspirometriaMap.has(lookupId)
            ? { etiqueta: etiquetaResultadoGlobal(resultadosEspirometriaMap.get(lookupId)?.resultadoGlobal) }
            : null,
          ekg: resultadosEkgMap.has(lookupId)
            ? { etiqueta: etiquetaResultadoGlobal(resultadosEkgMap.get(lookupId)?.resultadoGlobal) }
            : null,
          rayosX: resultadosRayosXMap.has(lookupId)
            ? { etiqueta: etiquetaResultadoGlobal(resultadosRayosXMap.get(lookupId)?.resultadoGlobal) }
            : null,
          analisisLaboratorio: resultadosAnalisisLabMap.has(lookupId)
            ? { etiqueta: etiquetaResultadoGlobal(resultadosAnalisisLabMap.get(lookupId)?.resultadoGlobal) }
            : null,
        },
      };
    });

    return resultado;
  }

  async findRiesgosTrabajoPorEmpresa(empresaId: string): Promise<any[]> {
    // Paso 1: Obtener los centros de trabajo de la empresa
    const centros = await this.centroTrabajoModel
      .find({ idEmpresa: empresaId }, '_id')
      .lean();

    const centroIds = centros.map((c) => c._id);

    if (centroIds.length === 0) return [];

    // Paso 2: Obtener los trabajadores de esos centros
    const trabajadores = await this.trabajadorModel
      .find(
        { idCentroTrabajo: { $in: centroIds } },
        '_id primerApellido segundoApellido nombre sexo puesto fechaNacimiento fechaIngreso idCentroTrabajo numeroEmpleado nss curp',
      )
      .lean();

    const trabajadoresIds = trabajadores.map((t) => t._id);

    if (trabajadoresIds.length === 0) return [];

    // Paso 3: Obtener los riesgos de esos trabajadores
    const riesgos = await this.riesgoTrabajoModel
      .find({ idTrabajador: { $in: trabajadoresIds } })
      .lean();

    const trabajadoresMap = new Map<string, any>();
    for (const trabajador of trabajadores) {
      trabajadoresMap.set(trabajador._id.toString(), trabajador);
    }

    const riesgosEnriquecidos = riesgos.map((riesgo) => {
      const trabajador = trabajadoresMap.get(riesgo.idTrabajador.toString());

      return {
        ...riesgo,
        primerApellidoTrabajador: trabajador?.primerApellido ?? '',
        segundoApellidoTrabajador: trabajador?.segundoApellido ?? '',
        nombreTrabajador: trabajador?.nombre ?? 'Desconocido',
        sexoTrabajador: trabajador?.sexo ?? '',
        puestoTrabajador: trabajador?.puesto ?? '',
        fechaNacimiento: trabajador?.fechaNacimiento ?? null,
        fechaIngreso: trabajador?.fechaIngreso ?? null,
        idCentroTrabajo: trabajador?.idCentroTrabajo ?? null,
        numeroEmpleado: trabajador?.numeroEmpleado ?? null,
        nss: trabajador?.nss ?? null,
        curp: trabajador?.curp ?? null,
      };
    });

    return riesgosEnriquecidos;
  }

  async findSexosYFechasNacimientoActivos(centroId: string): Promise<any[]> {
    const resultados = await this.trabajadorModel
      .find(
        {
          idCentroTrabajo: centroId,
          estadoLaboral: 'Activo',
          sexo: { $exists: true },
          fechaNacimiento: { $exists: true },
        },
        'sexo fechaNacimiento',
      )
      .lean();

    return resultados.map((trabajador) => ({
      // id: trabajador._id,
      sexo: trabajador.sexo,
      fechaNacimiento: trabajador.fechaNacimiento,
    }));
  }

  // trabajadores.service.ts
  async getDashboardData(centroId: string, inicio?: string, fin?: string) {
    // 0. Creaar el filtro de rango dde fechas para cada tipo
    const rangoFecha = (campo: string) => {
      if (!inicio || !fin) return {};
      return {
        [campo]: {
          $gte: new Date(inicio),
          $lte: new Date(fin),
        },
      };
    };

    // Helpers para audiometría
    function isNum(v: any): v is number {
      return typeof v === 'number' && Number.isFinite(v);
    }

    function getCaidaMaximaDb(a: any): number | null {
      const keys = [
        'oidoDerecho125',
        'oidoDerecho250',
        'oidoDerecho500',
        'oidoDerecho1000',
        'oidoDerecho2000',
        'oidoDerecho3000',
        'oidoDerecho4000',
        'oidoDerecho6000',
        'oidoDerecho8000',
        'oidoIzquierdo125',
        'oidoIzquierdo250',
        'oidoIzquierdo500',
        'oidoIzquierdo1000',
        'oidoIzquierdo2000',
        'oidoIzquierdo3000',
        'oidoIzquierdo4000',
        'oidoIzquierdo6000',
        'oidoIzquierdo8000',
      ];
      const valores = keys.map((k) => a?.[k]).filter(isNum) as number[];
      if (!valores.length) return null;
      return Math.max(...valores);
    }

    // 1. Obtener todos los trabajadores del centro
    const trabajadores = await this.trabajadorModel
      .find({ idCentroTrabajo: centroId })
      .select('_id estadoLaboral sexo fechaNacimiento agentesRiesgoActuales') // solo lo necesario
      .lean();

    // 2. Separar trabajadores activos e inactivos
    const trabajadoresActivos = trabajadores.filter(
      (t) => t.estadoLaboral === 'Activo',
    );

    // 3. Obtener arrays de IDs
    const idsActivos = trabajadoresActivos.map((t) => t._id);
    const idsTodos = trabajadores.map((t) => t._id); // algunos gráficos usan ambos

    // 4. Prepara base del objeto de retorno
    const dashboardData = {
      grupoEtario: [
        // agrupado por centro
        trabajadoresActivos.map((t) => ({
          sexo: t.sexo,
          fechaNacimiento: t.fechaNacimiento,
        })),
      ],
      agentesRiesgo: [
        trabajadoresActivos.map((t) => ({
          agentesRiesgoActuales: t.agentesRiesgoActuales,
        })),
      ],
      imc: [],
      circunferenciaCintura: [],
      tensionArterial: [],
      alcoholYTabaco: [],
      enfermedadesCronicas: [],
      antecedentes: [],
      agudezaVisual: [],
      daltonismo: [],
      aptitudes: [],
      consultas: [],
      hbc: [],
      ekg: [],
      espirometria: [],
      rayosX: [],
      analisisLaboratorio: [],
      pab: [],
      trastornosEstadoAnimo: [],
      cuestionarioProdromalBreve: [],
      trastornoLimitePersonalidad: [],
      trabajadoresEvaluados: [],
    };

    // 5–18. Consultas independientes en paralelo (último registro por trabajador se resuelve en memoria)
    const teaSelect = [
      'idTrabajador',
      'fechaTrastornosEstadoAnimo',
      'p1ExaltadoComportamientoNoHabitualOMetidoProblemas',
      'p1IrritableGritosPeleas',
      'p1MasSeguridadQueLoHabitual',
      'p1DormiaMenosSinNecesitarMasSueno',
      'p1HablabaMasOMasRapido',
      'p1PensamientosAgolpados',
      'p1DistraccionDificultadConcentracion',
      'p1MasEnergiaQueLoHabitual',
      'p1MasActivoOMasCosasQueLoHabitual',
      'p1MasSocialExtrovertido',
      'p1MasApetitoSexual',
      'p1CosasExageradasRiesgosas',
      'p1GastoDineroProblemas',
      'p2SituacionesMismoPeriodo',
      'p3NivelProblemaCausado',
      'p4FamiliarDirectoBipolar',
      'p5DiagnosticoProfesionalBipolar',
    ].join(' ');

    const cpbFields = [
      'idTrabajador',
      'fechaCuestionarioProdromalBreve',
      ...Array.from({ length: 21 }, (_, i) => {
        const n = i + 1;
        return [`p${n}`, `p${n}GradoAcuerdoStatement`];
      }).flat(),
    ].join(' ');

    const tlpSelect = [
      'idTrabajador',
      'fechaTrastornoLimitePersonalidad',
      'relacionesCercanasDiscusionesRupturas',
      'autolesionIntentoSuicidio',
      'impulsividadOtrosDosProblemas',
      'extremadamenteMalHumor',
      'enojadoFrecuenteActuaEnojadoSarcastico',
      'desconfianzaOtrasPersonas',
      'sensacionIrrealidadEntornoIrreal',
      'vacioCronico',
      'faltaIdentidadQuienEs',
      'esfuerzosEvitarAbandono',
    ].join(' ');

    const [
      exploraciones,
      historias,
      examenesVista,
      aptitudes,
      consultas,
      audiometrias,
      resultadosClinicos,
      trastornosEstadoAnimoDocs,
      cuestionarioProdromalDocs,
      trastornoLimiteDocs,
    ] = await Promise.all([
      this.exploracionFisicaModel
        .find({
          idTrabajador: { $in: idsActivos },
          ...rangoFecha('fechaExploracionFisica'),
        })
        .select(
          'idTrabajador categoriaIMC categoriaCircunferenciaCintura categoriaTensionArterial fechaExploracionFisica',
        )
        .lean(),
      this.historiaClinicaModel
        .find({
          idTrabajador: { $in: idsActivos },
          ...rangoFecha('fechaHistoriaClinica'),
        })
        .select(
          'idTrabajador alcoholismo tabaquismo diabeticosPP hipertensivosPP cardiopaticosPP epilepticosPP respiratorios alergicos lumbalgias accidentes quirurgicos otros fechaHistoriaClinica',
        )
        .lean(),
      this.examenVistaModel
        .find({
          idTrabajador: { $in: idsActivos },
          ...rangoFecha('fechaExamenVista'),
        })
        .select(
          'idTrabajador requiereLentesUsoGeneral ojoIzquierdoLejanaSinCorreccion ojoDerechoLejanaSinCorreccion sinCorreccionLejanaInterpretacion ojoIzquierdoLejanaConCorreccion ojoDerechoLejanaConCorreccion conCorreccionLejanaInterpretacion interpretacionIshihara fechaExamenVista',
        )
        .lean(),
      this.aptitudModel
        .find({
          idTrabajador: { $in: idsTodos },
          ...rangoFecha('fechaAptitudPuesto'),
        })
        .select('idTrabajador aptitudPuesto fechaAptitudPuesto')
        .lean(),
      this.notaMedicaModel
        .find({
          idTrabajador: { $in: idsTodos },
          ...rangoFecha('fechaNotaMedica'),
        })
        .select('idTrabajador fechaNotaMedica')
        .lean(),
      this.audiometriaModel
        .find({
          idTrabajador: { $in: idsActivos },
          ...rangoFecha('fechaAudiometria'),
        })
        .select([
          'idTrabajador',
          'fechaAudiometria',
          'metodoAudiometria',
          'hipoacusiaBilateralCombinada',
          'perdidaAuditivaBilateralAMA',
          'oidoDerecho125',
          'oidoDerecho250',
          'oidoDerecho500',
          'oidoDerecho1000',
          'oidoDerecho2000',
          'oidoDerecho3000',
          'oidoDerecho4000',
          'oidoDerecho6000',
          'oidoDerecho8000',
          'oidoIzquierdo125',
          'oidoIzquierdo250',
          'oidoIzquierdo500',
          'oidoIzquierdo1000',
          'oidoIzquierdo2000',
          'oidoIzquierdo3000',
          'oidoIzquierdo4000',
          'oidoIzquierdo6000',
          'oidoIzquierdo8000',
        ])
        .lean(),
      this.resultadoClinicoModel
        .find({
          idTrabajador: { $in: idsActivos },
          tipoEstudio: {
            $in: [
              TipoEstudio.EKG,
              TipoEstudio.ESPIROMETRIA,
              TipoEstudio.RAYOS_X,
              TipoEstudio.ANALISIS_LABORATORIO,
            ],
          },
          ...rangoFecha('fechaEstudio'),
        })
        .select(
          'idTrabajador tipoEstudio resultadoGlobal tipoAlteracion tipoAlteracionPrincipal tipoAlteracionEspirometria tipoAlteracionEKG tipoAlteracionRayosX tipoAlteracionAnalisisLaboratorio fechaEstudio',
        )
        .lean(),
      this.trastornosEstadoAnimoModel
        .find({
          idTrabajador: { $in: idsActivos },
          ...rangoFecha('fechaTrastornosEstadoAnimo'),
        })
        .select(teaSelect)
        .lean(),
      this.cuestionarioProdromalBreveModel
        .find({
          idTrabajador: { $in: idsActivos },
          ...rangoFecha('fechaCuestionarioProdromalBreve'),
        })
        .select(cpbFields)
        .lean(),
      this.trastornoLimitePersonalidadModel
        .find({
          idTrabajador: { $in: idsActivos },
          ...rangoFecha('fechaTrastornoLimitePersonalidad'),
        })
        .select(tlpSelect)
        .lean(),
    ]);

    const exploracionesMap = new Map<string, any>();
    for (const exploracion of exploraciones) {
      const id = exploracion.idTrabajador.toString();
      const actual = exploracionesMap.get(id);
      if (
        !actual ||
        new Date(exploracion.fechaExploracionFisica) >
          new Date(actual.fechaExploracionFisica)
      ) {
        exploracionesMap.set(id, exploracion);
      }
    }

    dashboardData.imc.push(
      Array.from(exploracionesMap.values()).map((exploracion) => ({
        categoriaIMC: exploracion.categoriaIMC ?? null,
      })),
    );

    // 6. CIRCUNFERENCIA DE CINTURA – Usar la misma exploración más reciente
    dashboardData.circunferenciaCintura.push(
      Array.from(exploracionesMap.values()).map((exploracion) => ({
        categoriaCircunferenciaCintura:
          exploracion.categoriaCircunferenciaCintura ?? null,
      })),
    );

    // 7. TENSIÓN ARTERIAL – Usar la misma exploración más reciente
    dashboardData.tensionArterial.push(
      Array.from(exploracionesMap.values()).map((exploracion) => ({
        categoriaTensionArterial: exploracion.categoriaTensionArterial ?? null,
      })),
    );

    // 8. HISTORIAS CLÍNICAS – última por trabajador activo (datos ya cargados en paralelo)
    const historiasMap = new Map<string, any>();
    for (const historia of historias) {
      const id = historia.idTrabajador.toString();
      const actual = historiasMap.get(id);
      if (
        !actual ||
        new Date(historia.fechaHistoriaClinica) >
          new Date(actual.fechaHistoriaClinica)
      ) {
        historiasMap.set(id, historia);
      }
    }

    // 9. ALCOHOL Y TABACO
    dashboardData.alcoholYTabaco.push(
      Array.from(historiasMap.values()).map((historia) => ({
        alcoholismo: historia.alcoholismo ?? null,
        tabaquismo: historia.tabaquismo ?? null,
      })),
    );

    // 10. ENFERMEDADES CRÓNICAS
    dashboardData.enfermedadesCronicas.push(
      Array.from(historiasMap.values()).map((historia) => ({
        diabeticosPP: historia.diabeticosPP ?? null,
        hipertensivosPP: historia.hipertensivosPP ?? null,
        cardiopaticosPP: historia.cardiopaticosPP ?? null,
        epilepticosPP: historia.epilepticosPP ?? null,
        respiratorios: historia.respiratorios ?? null,
        alergicos: historia.alergicos ?? null,
      })),
    );

    // 11. ANTECEDENTES TRAUMÁTICOS O LOCALIZADOS
    dashboardData.antecedentes.push(
      Array.from(historiasMap.values()).map((historia) => ({
        lumbalgias: historia.lumbalgias ?? null,
        accidentes: historia.accidentes ?? null,
        quirurgicos: historia.quirurgicos ?? null,
        otros: historia.otros ?? null,
      })),
    );

    // 12. EXÁMENES DE VISTA – último por trabajador activo
    const examenesMap = new Map<string, any>();
    for (const examen of examenesVista) {
      const id = examen.idTrabajador.toString();
      const actual = examenesMap.get(id);
      if (
        !actual ||
        new Date(examen.fechaExamenVista) > new Date(actual.fechaExamenVista)
      ) {
        examenesMap.set(id, examen);
      }
    }

    // 13. AGUDEZA VISUAL
    dashboardData.agudezaVisual.push(
      Array.from(examenesMap.values()).map((examen) => ({
        requiereLentesUsoGeneral: examen.requiereLentesUsoGeneral ?? null,
        ojoIzquierdoLejanaSinCorreccion:
          examen.ojoIzquierdoLejanaSinCorreccion ?? null,
        ojoDerechoLejanaSinCorreccion:
          examen.ojoDerechoLejanaSinCorreccion ?? null,
        sinCorreccionLejanaInterpretacion:
          examen.sinCorreccionLejanaInterpretacion ?? null,
        ojoIzquierdoLejanaConCorreccion:
          examen.ojoIzquierdoLejanaConCorreccion ?? null,
        ojoDerechoLejanaConCorreccion:
          examen.ojoDerechoLejanaConCorreccion ?? null,
        conCorreccionLejanaInterpretacion:
          examen.conCorreccionLejanaInterpretacion ?? null,
      })),
    );

    // 14. DALTONISMO
    dashboardData.daltonismo.push(
      Array.from(examenesMap.values()).map((examen) => ({
        interpretacionIshihara: examen.interpretacionIshihara ?? null,
      })),
    );

    // 15. APTITUD PUESTO – última por trabajador
    const aptitudesMap = new Map<string, any>();
    for (const aptitud of aptitudes) {
      const id = aptitud.idTrabajador.toString();
      const actual = aptitudesMap.get(id);
      if (
        !actual ||
        new Date(aptitud.fechaAptitudPuesto) >
          new Date(actual.fechaAptitudPuesto)
      ) {
        aptitudesMap.set(id, aptitud);
      }
    }

    dashboardData.aptitudes.push(
      Array.from(aptitudesMap.values()).map((aptitud) => ({
        aptitudPuesto: aptitud.aptitudPuesto ?? null,
      })),
    );

    // 16. CONSULTAS – todas las notas médicas del período
    dashboardData.consultas.push(
      consultas.map((consulta) => ({
        fechaNotaMedica: consulta.fechaNotaMedica ?? null,
      })),
    );

    // 17. AUDIOMETRÍA – última por trabajador activo
    const audiometriasMap = new Map<string, any>();
    for (const audiometria of audiometrias) {
      const id = audiometria.idTrabajador.toString();
      const actual = audiometriasMap.get(id);
      if (
        !actual ||
        new Date(audiometria.fechaAudiometria) >
          new Date(actual.fechaAudiometria)
      ) {
        audiometriasMap.set(id, audiometria);
      }
    }

    // Agregar datos de HBC al dashboardData
    dashboardData.hbc.push(
      Array.from(audiometriasMap.values()).map((audiometria) => ({
        hipoacusiaBilateralCombinada:
          audiometria.hipoacusiaBilateralCombinada ?? null,
        metodoAudiometria: audiometria.metodoAudiometria ?? null,
        perdidaAuditivaBilateralAMA:
          audiometria.perdidaAuditivaBilateralAMA ?? null,
      })),
    );

    // NUEVO: construir bloque audiometría resumida
    (dashboardData as any).audiometriaResumen = Array.from(
      audiometriasMap.values(),
    ).map((a) => ({
      metodoAudiometria: a.metodoAudiometria ?? null,
      hipoacusiaBilateralCombinada: isNum(a.hipoacusiaBilateralCombinada)
        ? a.hipoacusiaBilateralCombinada
        : null,
      perdidaAuditivaBilateralAMA: isNum(a.perdidaAuditivaBilateralAMA)
        ? a.perdidaAuditivaBilateralAMA
        : null,
      caidaMaxDb: getCaidaMaximaDb(a),
    }));

    // 18. RESULTADOS CLÍNICOS – más reciente por trabajador activo
    const resultadosEkgMap = new Map<string, any>();
    const resultadosEspirometriaMap = new Map<string, any>();
    const resultadosRayosXMap = new Map<string, any>();
    const resultadosAnalisisLaboratorioMap = new Map<string, any>();

    for (const resultado of resultadosClinicos) {
      const id = resultado.idTrabajador.toString();
      let targetMap: Map<string, any>;
      switch (resultado.tipoEstudio) {
        case TipoEstudio.EKG:
          targetMap = resultadosEkgMap;
          break;
        case TipoEstudio.ESPIROMETRIA:
          targetMap = resultadosEspirometriaMap;
          break;
        case TipoEstudio.RAYOS_X:
          targetMap = resultadosRayosXMap;
          break;
        case TipoEstudio.ANALISIS_LABORATORIO:
          targetMap = resultadosAnalisisLaboratorioMap;
          break;
        default:
          continue;
      }
      const actual = targetMap.get(id);

      if (
        !actual ||
        new Date(resultado.fechaEstudio) > new Date(actual.fechaEstudio)
      ) {
        targetMap.set(id, resultado);
      }
    }

    dashboardData.ekg.push(
      Array.from(resultadosEkgMap.values()).map((resultado) => ({
        resultadoGlobal: resultado.resultadoGlobal ?? null,
        tipoAlteracion:
          resultado.tipoAlteracionPrincipal ?? resultado.tipoAlteracion ?? null,
        tipoAlteracionEKG: resultado.tipoAlteracionEKG ?? null,
      })),
    );

    dashboardData.espirometria.push(
      Array.from(resultadosEspirometriaMap.values()).map((resultado) => ({
        resultadoGlobal: resultado.resultadoGlobal ?? null,
        tipoAlteracion: resultado.tipoAlteracion ?? null,
        tipoAlteracionEspirometria:
          resultado.tipoAlteracionEspirometria ?? null,
      })),
    );

    dashboardData.rayosX.push(
      Array.from(resultadosRayosXMap.values()).map((resultado) => ({
        resultadoGlobal: resultado.resultadoGlobal ?? null,
        tipoAlteracionRayosX: resultado.tipoAlteracionRayosX ?? null,
      })),
    );

    dashboardData.analisisLaboratorio.push(
      Array.from(resultadosAnalisisLaboratorioMap.values()).map((resultado) => ({
        resultadoGlobal: resultado.resultadoGlobal ?? null,
        tipoAlteracionAnalisisLaboratorio: resultado.tipoAlteracionAnalisisLaboratorio ?? null,
      })),
    );

    const trastornosEstadoAnimoMap = new Map<string, any>();
    for (const doc of trastornosEstadoAnimoDocs) {
      const id = doc.idTrabajador.toString();
      const actual = trastornosEstadoAnimoMap.get(id);
      if (
        !actual ||
        new Date(doc.fechaTrastornosEstadoAnimo) > new Date(actual.fechaTrastornosEstadoAnimo)
      ) {
        trastornosEstadoAnimoMap.set(id, doc);
      }
    }

    dashboardData.trastornosEstadoAnimo.push(
      Array.from(trastornosEstadoAnimoMap.values()).map((d) => ({
        p1ExaltadoComportamientoNoHabitualOMetidoProblemas:
          d.p1ExaltadoComportamientoNoHabitualOMetidoProblemas ?? null,
        p1IrritableGritosPeleas: d.p1IrritableGritosPeleas ?? null,
        p1MasSeguridadQueLoHabitual: d.p1MasSeguridadQueLoHabitual ?? null,
        p1DormiaMenosSinNecesitarMasSueno: d.p1DormiaMenosSinNecesitarMasSueno ?? null,
        p1HablabaMasOMasRapido: d.p1HablabaMasOMasRapido ?? null,
        p1PensamientosAgolpados: d.p1PensamientosAgolpados ?? null,
        p1DistraccionDificultadConcentracion: d.p1DistraccionDificultadConcentracion ?? null,
        p1MasEnergiaQueLoHabitual: d.p1MasEnergiaQueLoHabitual ?? null,
        p1MasActivoOMasCosasQueLoHabitual: d.p1MasActivoOMasCosasQueLoHabitual ?? null,
        p1MasSocialExtrovertido: d.p1MasSocialExtrovertido ?? null,
        p1MasApetitoSexual: d.p1MasApetitoSexual ?? null,
        p1CosasExageradasRiesgosas: d.p1CosasExageradasRiesgosas ?? null,
        p1GastoDineroProblemas: d.p1GastoDineroProblemas ?? null,
        p2SituacionesMismoPeriodo: d.p2SituacionesMismoPeriodo ?? null,
        p3NivelProblemaCausado: d.p3NivelProblemaCausado ?? null,
        p4FamiliarDirectoBipolar: d.p4FamiliarDirectoBipolar ?? null,
        p5DiagnosticoProfesionalBipolar: d.p5DiagnosticoProfesionalBipolar ?? null,
        fechaTrastornosEstadoAnimo: d.fechaTrastornosEstadoAnimo,
      })),
    );

    const cuestionarioProdromalMap = new Map<string, any>();
    for (const doc of cuestionarioProdromalDocs) {
      const id = doc.idTrabajador.toString();
      const actual = cuestionarioProdromalMap.get(id);
      if (
        !actual ||
        new Date(doc.fechaCuestionarioProdromalBreve) > new Date(actual.fechaCuestionarioProdromalBreve)
      ) {
        cuestionarioProdromalMap.set(id, doc);
      }
    }

    dashboardData.cuestionarioProdromalBreve.push(
      Array.from(cuestionarioProdromalMap.values()).map((d) => {
        const row: Record<string, unknown> = {
          fechaCuestionarioProdromalBreve: d.fechaCuestionarioProdromalBreve,
        };
        for (let n = 1; n <= 21; n++) {
          const key = `p${n}`;
          row[key] = d[key] ?? null;
          row[`p${n}GradoAcuerdoStatement`] = d[`p${n}GradoAcuerdoStatement`] ?? null;
        }
        return row;
      }),
    );

    const trastornoLimiteMap = new Map<string, any>();
    for (const doc of trastornoLimiteDocs) {
      const id = doc.idTrabajador.toString();
      const actual = trastornoLimiteMap.get(id);
      if (
        !actual ||
        new Date(doc.fechaTrastornoLimitePersonalidad) > new Date(actual.fechaTrastornoLimitePersonalidad)
      ) {
        trastornoLimiteMap.set(id, doc);
      }
    }

    dashboardData.trastornoLimitePersonalidad.push(
      Array.from(trastornoLimiteMap.values()).map((d) => ({
        relacionesCercanasDiscusionesRupturas: d.relacionesCercanasDiscusionesRupturas ?? null,
        autolesionIntentoSuicidio: d.autolesionIntentoSuicidio ?? null,
        impulsividadOtrosDosProblemas: d.impulsividadOtrosDosProblemas ?? null,
        extremadamenteMalHumor: d.extremadamenteMalHumor ?? null,
        enojadoFrecuenteActuaEnojadoSarcastico: d.enojadoFrecuenteActuaEnojadoSarcastico ?? null,
        desconfianzaOtrasPersonas: d.desconfianzaOtrasPersonas ?? null,
        sensacionIrrealidadEntornoIrreal: d.sensacionIrrealidadEntornoIrreal ?? null,
        vacioCronico: d.vacioCronico ?? null,
        faltaIdentidadQuienEs: d.faltaIdentidadQuienEs ?? null,
        esfuerzosEvitarAbandono: d.esfuerzosEvitarAbandono ?? null,
        fechaTrastornoLimitePersonalidad: d.fechaTrastornoLimitePersonalidad,
      })),
    );

    const trabajadoresEvaluadosSet = new Set([
      ...exploracionesMap.keys(),
      ...historiasMap.keys(),
      ...examenesMap.keys(),
      ...aptitudesMap.keys(),
      ...audiometriasMap.keys(),
      ...resultadosEkgMap.keys(),
      ...resultadosEspirometriaMap.keys(),
      ...resultadosRayosXMap.keys(),
      ...resultadosAnalisisLaboratorioMap.keys(),
      ...trastornosEstadoAnimoMap.keys(),
      ...cuestionarioProdromalMap.keys(),
      ...trastornoLimiteMap.keys(),
    ]);

    dashboardData.trabajadoresEvaluados = Array.from(trabajadoresEvaluadosSet);

    // Si hay filtro de fechas, obtener solo trabajadores con evaluaciones en el período
    let trabajadoresFiltrados = trabajadoresActivos;

    if (inicio && fin) {
      // Obtener IDs de trabajadores que tienen evaluaciones en el período
      const trabajadoresConEvaluaciones = new Set([
        ...exploracionesMap.keys(),
        ...historiasMap.keys(),
        ...examenesMap.keys(),
        ...aptitudesMap.keys(),
        ...audiometriasMap.keys(),
        ...resultadosEkgMap.keys(),
        ...resultadosEspirometriaMap.keys(),
        ...resultadosRayosXMap.keys(),
        ...resultadosAnalisisLaboratorioMap.keys(),
        ...trastornosEstadoAnimoMap.keys(),
        ...cuestionarioProdromalMap.keys(),
        ...trastornoLimiteMap.keys(),
      ]);

      // Filtrar trabajadores activos que tienen evaluaciones en el período
      trabajadoresFiltrados = trabajadoresActivos.filter((t) =>
        trabajadoresConEvaluaciones.has(t._id.toString()),
      );
    }

    // Para agentes de riesgo, mostrar trabajadores filtrados por período
    dashboardData.agentesRiesgo = [
      trabajadoresFiltrados.map((t) => ({
        agentesRiesgoActuales: t.agentesRiesgoActuales,
      })),
    ];

    // Para grupos etarios y distribución por sexo, mostrar trabajadores filtrados por período
    dashboardData.grupoEtario = [
      trabajadoresFiltrados.map((t) => ({
        sexo: t.sexo,
        fechaNacimiento: t.fechaNacimiento,
      })),
    ];

    return dashboardData;
  }

  async findOne(
    id: string,
    options?: { includeRiesgos?: boolean },
  ): Promise<any> {
    const redirectTo = await this.workerFusionService.getFusionRedirect(id);
    if (redirectTo) {
      return { redirectTo, fused: true };
    }

    const resolvedId = await this.workerFusionService.getCanonicalTrabajadorId(id);
    const trabajador = await this.trabajadorModel.findById(resolvedId).lean();
    if (!trabajador) {
      throw new Error('Trabajador no encontrado');
    }

    const base = {
      ...trabajador,
      requestedId: id !== resolvedId ? id : undefined,
      canonicalId: resolvedId,
    };

    // PDF / informes no usan riesgos; evita query extra en rutas calientes
    if (options?.includeRiesgos === false) {
      return base;
    }

    const tieneDocumentoClinicoFinalizado =
      await this.clinicalAttentionQuery.hasFinalizedClinicalDocumentForTrabajador(
        resolvedId,
      );

    const riesgos = await this.riesgoTrabajoModel
      .find({ idTrabajador: resolvedId })
      .sort({ fechaRiesgo: -1 })
      .lean();

    return {
      ...base,
      riesgosTrabajo: riesgos,
      tieneDocumentoClinicoFinalizado,
    };
  }

  /**
   * Resuelve empresaId desde un trabajador con lecturas mínimas (sin riesgos ni documento completo).
   * Misma semántica de fusión/canónico que findOne.
   */
  async resolveEmpresaIdForInforme(trabajadorId: string): Promise<{
    empresaId: string;
    canonicalTrabajadorId: string;
  }> {
    const redirectTo =
      await this.workerFusionService.getFusionRedirect(trabajadorId);
    if (redirectTo) {
      // Misma falla observable que findOne + acceso a idCentroTrabajo
      const fused = { redirectTo, fused: true } as any;
      fused.idCentroTrabajo.toString();
    }

    const resolvedId =
      await this.workerFusionService.getCanonicalTrabajadorId(trabajadorId);
    const trabajador = await this.trabajadorModel
      .findById(resolvedId)
      .select('_id idCentroTrabajo')
      .lean();
    if (!trabajador) {
      throw new Error('Trabajador no encontrado');
    }

    const centro = await this.centroTrabajoModel
      .findById(trabajador.idCentroTrabajo)
      .select('idEmpresa')
      .lean();

    return {
      empresaId: (centro as any).idEmpresa.toString(),
      canonicalTrabajadorId: resolvedId,
    };
  }

  async update(
    id: string,
    updateTrabajadorDto: UpdateTrabajadorDto,
  ): Promise<Trabajador> {
    const normalizedDto = normalizeTrabajadorData(updateTrabajadorDto);

    // Obtener el trabajador actual
    const trabajadorActual = await this.trabajadorModel.findById(id).exec();
    if (!trabajadorActual) {
      throw new BadRequestException('Trabajador no encontrado');
    }

    // Validar fechaNacimiento si se está actualizando (A2)
    if (normalizedDto.fechaNacimiento) {
      validateFechaNacimiento(normalizedDto.fechaNacimiento);
    }

    // Validate geographic hierarchy (A3) - applies to all providers
    // Merge current worker data with update DTO for validation
    const mergedDtoForGeography = {
      ...trabajadorActual.toObject(),
      ...normalizedDto,
    } as CreateTrabajadorDto;
    await this.validateGeographyHierarchy(mergedDtoForGeography);

    // Validar unicidad del número de empleado a nivel empresa si se proporciona
    if (normalizedDto.numeroEmpleado) {
      // Solo validar si el número está cambiando
      if (trabajadorActual.numeroEmpleado !== normalizedDto.numeroEmpleado) {
        await this.validateNumeroEmpleadoUniqueness(
          normalizedDto.numeroEmpleado,
          trabajadorActual.idCentroTrabajo.toString(),
        );
      }
    }

    // Validate NOM-024 fields for MX providers (use idCentroTrabajo from current worker if not updated)
    const idCentroTrabajo =
      normalizedDto.idCentroTrabajo ||
      trabajadorActual.idCentroTrabajo.toString();
    const proveedorSaludId =
      await this.getProveedorSaludIdFromCentroTrabajo(idCentroTrabajo);

    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    const hasFinalizedClinicalDocument = policy.features
      .workerIdentificationImmutable
      ? await this.clinicalAttentionQuery.hasFinalizedClinicalDocumentForTrabajador(
          id,
        )
      : false;
    validateWorkerIdentificationImmutable(
      normalizedDto,
      trabajadorActual,
      policy,
      { hasFinalizedClinicalDocument },
    );
    applyTrabajadorPersonNames(normalizedDto, policy?.regime);

    // Merge current worker data with update DTO for validation
    const mergedDto = {
      ...trabajadorActual.toObject(),
      ...normalizedDto,
    } as CreateTrabajadorDto;

    assertValidPersonNameFields(
      mergedDto.nombre,
      mergedDto.primerApellido,
      mergedDto.segundoApellido,
      policy?.regime,
    );

    await this.validateNOM024PersonFields(mergedDto, proveedorSaludId);

    // Use updated CURP if provided, otherwise use current CURP for validation
    const curpToValidate =
      normalizedDto.curp !== undefined
        ? normalizedDto.curp
        : trabajadorActual.curp;
    await this.validateCURPForMX(curpToValidate, proveedorSaludId, {
      fechaNacimiento: mergedDto.fechaNacimiento,
      sexoCURP: normalizeSexoCurpInput(mergedDto.sexoCURP) ?? undefined,
      entidadNacimiento: mergedDto.entidadNacimiento,
      nombre: mergedDto.nombre,
      primerApellido: mergedDto.primerApellido,
      segundoApellido: mergedDto.segundoApellido,
    });

    // NOM-024: Validate name format (MX strict, non-MX warnings)
    // Use merged values for validation
    await this.validateNOM024NameFormat(
      mergedDto.nombre,
      mergedDto.primerApellido,
      mergedDto.segundoApellido,
      proveedorSaludId,
    );

    // Normalize fields to uppercase if provided
    if (normalizedDto.curp) {
      normalizedDto.curp = normalizedDto.curp.trim().toUpperCase();
    }
    if (normalizedDto.entidadNacimiento) {
      normalizedDto.entidadNacimiento = normalizedDto.entidadNacimiento
        .trim()
        .toUpperCase();
    }
    if (normalizedDto.entidadResidencia) {
      normalizedDto.entidadResidencia = normalizedDto.entidadResidencia
        .trim()
        .toUpperCase();
    }

    const pais = await this.nom024Util.getProveedorPais(proveedorSaludId);
    const shouldClearCurp =
      pais !== 'MX' &&
      'curp' in updateTrabajadorDto &&
      (normalizedDto.curp === null || normalizedDto.curp === '');

    if (shouldClearCurp) {
      delete normalizedDto.curp;
      return await this.trabajadorModel
        .findByIdAndUpdate(
          id,
          { $set: normalizedDto, $unset: { curp: '' } },
          { new: true, runValidators: true },
        )
        .exec();
    }

    return await this.trabajadorModel
      .findByIdAndUpdate(id, normalizedDto, { new: true })
      .exec();
  }

  async transferirTrabajador(
    trabajadorId: string,
    nuevoCentroId: string,
    userId: string,
  ): Promise<TransferirTrabajadorResult> {
    // Validar que el trabajador existe
    const trabajador = await this.trabajadorModel
      .findById(trabajadorId)
      .populate('idCentroTrabajo')
      .exec();
    if (!trabajador) {
      throw new BadRequestException('Trabajador no encontrado');
    }

    // Validar que el nuevo centro de trabajo existe y obtener empresa
    const nuevoCentro = await this.centroTrabajoModel
      .findById(nuevoCentroId)
      .populate('idEmpresa')
      .exec();
    if (!nuevoCentro) {
      throw new BadRequestException('Centro de trabajo destino no encontrado');
    }

    // Validar que no se está transfiriendo al mismo centro
    if (trabajador.idCentroTrabajo.toString() === nuevoCentroId) {
      throw new BadRequestException(
        'El trabajador ya pertenece a este centro de trabajo',
      );
    }

    // Obtener usuario y validar permisos
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    // Obtener centro actual del trabajador con empresa
    const centroActual = await this.centroTrabajoModel
      .findById(trabajador.idCentroTrabajo)
      .populate('idEmpresa')
      .exec();
    if (!centroActual) {
      throw new BadRequestException('Centro de trabajo actual no encontrado');
    }

    // Validar que ambos centros pertenezcan al mismo proveedor de salud
    const empresaActual = await this.empresaModel
      .findById((centroActual.idEmpresa as any)._id || centroActual.idEmpresa)
      .exec();
    const empresaDestino = await this.empresaModel
      .findById((nuevoCentro.idEmpresa as any)._id || nuevoCentro.idEmpresa)
      .exec();

    if (!empresaActual || !empresaDestino) {
      throw new BadRequestException(
        'No se pudo validar la información de las empresas',
      );
    }

    if (
      empresaActual.idProveedorSalud.toString() !==
      empresaDestino.idProveedorSalud.toString()
    ) {
      throw new BadRequestException(
        'No se puede transferir trabajadores entre centros de trabajo de diferentes proveedores de salud',
      );
    }

    // Validar permisos del usuario
    if (user.role === 'Principal') {
      // Usuario Principal puede transferir a cualquier centro del mismo proveedor
    } else if (user.permisos?.accesoCompletoEmpresasCentros) {
      // Usuario con acceso completo puede transferir a cualquier centro del mismo proveedor
    } else {
      // Usuario con permisos limitados: verificar que el nuevo centro esté en sus asignaciones
      const centrosAsignados = user.centrosTrabajoAsignados || [];
      if (!centrosAsignados.includes(nuevoCentroId)) {
        throw new ForbiddenException(
          'No tiene permiso para transferir a este centro de trabajo',
        );
      }
    }

    // Validar unicidad del número de empleado a nivel empresa destino (ignorando al propio trabajador)
    if (trabajador.numeroEmpleado) {
      await this.validateNumeroEmpleadoUniqueness(
        trabajador.numeroEmpleado,
        nuevoCentroId,
        trabajadorId,
      );
    }

    const empresaActualId = (empresaActual as any)._id.toString();
    const empresaDestinoId = (empresaDestino as any)._id.toString();
    const crossEmpresa = empresaActualId !== empresaDestinoId;

    // Actualizar el centro de trabajo del trabajador y establecer fecha de transferencia
    const trabajadorActualizado = await this.trabajadorModel
      .findByIdAndUpdate(
        trabajadorId,
        {
          idCentroTrabajo: nuevoCentroId,
          updatedBy: userId,
          fechaTransferencia: new Date(),
        },
        { new: true },
      )
      .exec();

    let alertasInvalidadas: Array<{
      _id: string;
      trabajadorId: string;
      candidatoId: string;
    }> = [];
    let posibleDuplicado = null;

    if (crossEmpresa) {
      alertasInvalidadas =
        await this.workerFusionService.descartarAlertasPendientesPorTransferencia(
          trabajadorId,
          userId,
        );
      posibleDuplicado =
        await this.workerFusionService.evaluarDuplicadoTrasTransferencia(
          trabajadorId,
          nuevoCentroId,
          userId,
        );
    }

    const nombreCompleto = [
      trabajador.nombre,
      trabajador.primerApellido,
      trabajador.segundoApellido,
    ]
      .filter(Boolean)
      .join(' ');

    await this.auditService.record({
      proveedorSaludId: empresaActual.idProveedorSalud.toString(),
      actorId: userId,
      actionType: AuditActionType.WORKER_TRANSFER,
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
      resourceType: 'Trabajador',
      resourceId: trabajadorId,
      payload: {
        trabajador: nombreCompleto,
        de: {
          empresaId: empresaActualId,
          empresa:
            (empresaActual as any).nombreComercial ||
            (empresaActual as any).razonSocial,
          centroId: (centroActual as any)._id?.toString?.(),
          centro: (centroActual as any).nombreCentro,
        },
        a: {
          empresaId: empresaDestinoId,
          empresa:
            (empresaDestino as any).nombreComercial ||
            (empresaDestino as any).razonSocial,
          centroId: (nuevoCentro as any)._id?.toString?.(),
          centro: (nuevoCentro as any).nombreCentro,
        },
        crossEmpresa,
        alertasInvalidadas: alertasInvalidadas.map((a) => a._id),
        posibleDuplicadoDetectado: posibleDuplicado ?? null,
      },
    });

    return { trabajador: trabajadorActualizado, posibleDuplicado };
  }

  async getCentrosDisponiblesParaTransferencia(
    userId: string,
    excluirCentroId?: string,
    idProveedorSalud?: string,
  ): Promise<any> {
    // Obtener usuario
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    // Obtener empresas disponibles según permisos
    let empresasDisponibles = [];

    if (
      user.role === 'Principal' ||
      user.permisos?.accesoCompletoEmpresasCentros
    ) {
      // Para Principal o acceso completo, preferir el proveedor del usuario; si no hay, no filtrar por proveedor
      const filtro: any = {};
      if (user.idProveedorSalud) {
        filtro.idProveedorSalud = user.idProveedorSalud;
      } else if (idProveedorSalud) {
        filtro.idProveedorSalud = idProveedorSalud;
      }
      empresasDisponibles = await this.empresaModel
        .find(filtro)
        .sort({ nombreComercial: 1 })
        .exec();
    } else {
      // Otros usuarios solo ven empresas asignadas
      const filtro: any = { _id: { $in: user.empresasAsignadas || [] } };
      if (idProveedorSalud) filtro.idProveedorSalud = idProveedorSalud;
      empresasDisponibles = await this.empresaModel
        .find(filtro)
        .sort({ nombreComercial: 1 })
        .exec();
    }

    // Resolver centros en una sola consulta y agrupar por empresa para evitar N+1
    const empresasIds = empresasDisponibles.map((e: any) => e._id);
    const esAccesoCompleto =
      user.role === 'Principal' || user.permisos?.accesoCompletoEmpresasCentros;
    const filtroCentros: any = { idEmpresa: { $in: empresasIds } };
    if (!esAccesoCompleto) {
      const centrosAsignados = user.centrosTrabajoAsignados || [];
      filtroCentros._id = { $in: centrosAsignados };
    }

    let centros = await this.centroTrabajoModel.find(filtroCentros).exec();
    if (excluirCentroId) {
      centros = centros.filter((c) => c._id.toString() !== excluirCentroId);
    }

    const centrosPorEmpresa = new Map<string, any[]>();
    for (const c of centros) {
      const key = c.idEmpresa?.toString?.() || '';
      if (!key) continue;
      const arr = centrosPorEmpresa.get(key) || [];
      arr.push(c);
      centrosPorEmpresa.set(key, arr);
    }

    const resultado = [] as any[];
    for (const empresa of empresasDisponibles) {
      const key = (empresa as any)._id?.toString?.();
      const centrosEmpresa = centrosPorEmpresa.get(key) || [];
      if (centrosEmpresa.length === 0) continue;
      resultado.push({
        _id: empresa._id,
        nombreComercial: (empresa as any).nombreComercial,
        razonSocial: (empresa as any).razonSocial,
        centros: centrosEmpresa.map((centro: any) => ({
          _id: centro._id,
          nombreCentro: centro.nombreCentro,
          direccionCentro: centro.direccionCentro,
          codigoPostal: centro.codigoPostal,
          estado: centro.estado,
          municipio: centro.municipio,
          idEmpresa: centro.idEmpresa,
        })),
      });
    }

    return { empresas: resultado };
  }

  async getOpcionesTransferenciaPaginado(
    userId: string,
    q: string,
    page: number,
    limit: number,
    excluirCentroId?: string,
    idProveedorSalud?: string,
  ): Promise<{ empresas: any[]; total: number; page: number; limit: number }> {
    // Obtener usuario
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    // Filtro base por proveedor y permisos
    const filtroEmpresas: any = {};
    if (
      user.role === 'Principal' ||
      user.permisos?.accesoCompletoEmpresasCentros
    ) {
      if (user.idProveedorSalud)
        filtroEmpresas.idProveedorSalud = user.idProveedorSalud;
      else if (idProveedorSalud)
        filtroEmpresas.idProveedorSalud = idProveedorSalud;
    } else {
      filtroEmpresas._id = { $in: user.empresasAsignadas || [] };
      if (idProveedorSalud) filtroEmpresas.idProveedorSalud = idProveedorSalud;
    }

    // Búsqueda por q en nombre/razón/RFC
    const term = (q || '').trim();
    if (term) {
      const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filtroEmpresas.$or = [
        { nombreComercial: re },
        { razonSocial: re },
        { RFC: re },
        { rfc: re },
      ];
    }

    // Contar total de empresas que cumplen filtro
    const total = await this.empresaModel.countDocuments(filtroEmpresas).exec();

    // Paginar empresas
    const empresas = await this.empresaModel
      .find(filtroEmpresas)
      .sort({ nombreComercial: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();

    // Obtener centros en un solo query para todas las empresas de la página (evita N+1)
    const empresaIds = empresas.map((e) => e._id);
    let filtroCentros: any = { idEmpresa: { $in: empresaIds } };
    // Permisos por usuario
    if (
      !(
        user.role === 'Principal' ||
        user.permisos?.accesoCompletoEmpresasCentros
      )
    ) {
      const centrosAsignados = (user as any).centrosTrabajoAsignados || [];
      filtroCentros = { ...filtroCentros, _id: { $in: centrosAsignados } };
    }
    if (excluirCentroId) {
      filtroCentros = {
        ...filtroCentros,
        _id: { ...(filtroCentros._id || {}), $ne: excluirCentroId },
      };
    }

    const centros = await this.centroTrabajoModel
      .find(filtroCentros, {
        nombreCentro: 1,
        direccionCentro: 1,
        codigoPostal: 1,
        estado: 1,
        municipio: 1,
        idEmpresa: 1,
      })
      .lean()
      .exec();

    const centrosPorEmpresa = new Map<string, any[]>();
    for (const c of centros) {
      const key = (c.idEmpresa as any).toString();
      if (!centrosPorEmpresa.has(key)) centrosPorEmpresa.set(key, []);
      centrosPorEmpresa.get(key)!.push(c);
    }

    const empresasConCentros = empresas
      .map((empresa) => {
        const lista = centrosPorEmpresa.get(empresa._id.toString()) || [];
        if (!lista.length) return null;
        return {
          _id: empresa._id,
          nombreComercial: empresa.nombreComercial,
          razonSocial: empresa.razonSocial,
          RFC: (empresa as any).RFC,
          rfc: (empresa as any).rfc,
          centros: lista.map((centro) => ({
            _id: centro._id,
            nombreCentro: centro.nombreCentro,
            direccionCentro: centro.direccionCentro,
            codigoPostal: centro.codigoPostal,
            estado: centro.estado,
            municipio: centro.municipio,
            idEmpresa: centro.idEmpresa,
          })),
        };
      })
      .filter(Boolean) as any[];

    return { empresas: empresasConCentros, total, page, limit };
  }

  async contarTrabajadoresPorCentros(
    userId: string,
    centroIds: string[],
  ): Promise<Record<string, number>> {
    // Validación básica
    const idsLimpios = centroIds
      .filter(Boolean)
      .map((id) => id.toString())
      .filter((id) => id.length === 24);

    if (!idsLimpios.length) return {};

    // Nota: permisos finos por centro se podrían validar aquí si es necesario
    const pipeline = [
      { $match: { idCentroTrabajo: { $in: idsLimpios as any } } },
      { $group: { _id: '$idCentroTrabajo', count: { $sum: 1 } } },
    ];

    const resultados = await (this.trabajadorModel as any)
      .aggregate(pipeline)
      .exec();
    const mapa: Record<string, number> = {};
    for (const r of resultados) {
      mapa[r._id.toString()] = r.count;
    }
    // Asegurar que todos los ids aparezcan aunque sea con 0
    for (const id of idsLimpios) {
      if (mapa[id] == null) mapa[id] = 0;
    }
    return mapa;
  }

  private processWorkerData(worker) {
    const result = {
      primerApellido: worker.primerApellido
        ? String(worker.primerApellido).trim()
        : '',
      segundoApellido: worker.segundoApellido
        ? String(worker.segundoApellido).trim()
        : '',
      nombre: worker.nombre ? String(worker.nombre).trim() : '',
      fechaNacimiento: this.parseDate(worker.fechaNacimiento),
      sexo: worker.sexo ? String(worker.sexo).trim() : '',
      sexoCURP: normalizeSexoCurpInput(worker.sexoCURP) ?? undefined,
      escolaridad: worker.escolaridad ? String(worker.escolaridad).trim() : '',
      puesto: worker.puesto ? String(worker.puesto).trim() : '',
      fechaIngreso: this.parseDate(worker.fechaIngreso),
      telefono: worker.telefono ? String(worker.telefono).trim() : '',
      estadoCivil: worker.estadoCivil ? String(worker.estadoCivil).trim() : '',
      numeroEmpleado: worker.numeroEmpleado
        ? String(worker.numeroEmpleado).trim()
        : '',
      nss: worker.nss ? String(worker.nss).trim() : '',
      curp: worker.curp ? String(worker.curp).trim() : '',
      entidadNacimiento: worker.entidadNacimiento
        ? String(worker.entidadNacimiento).trim()
        : '',
      paisNacimiento:
        worker.paisNacimiento != null && worker.paisNacimiento !== ''
          ? Number(worker.paisNacimiento)
          : undefined,
      entidadResidencia: worker.entidadResidencia
        ? String(worker.entidadResidencia).trim()
        : '',
      municipioResidencia: worker.municipioResidencia
        ? String(worker.municipioResidencia).trim()
        : '',
      localidadResidencia: worker.localidadResidencia
        ? String(worker.localidadResidencia).trim()
        : '',
      paisResidencia:
        worker.paisResidencia != null && worker.paisResidencia !== ''
          ? Number(worker.paisResidencia)
          : undefined,
      agentesRiesgoActuales: worker.agentesRiesgoActuales || [],
      estadoLaboral: 'Activo', // ✅ VALOR FIJO: Todos los trabajadores importados tienen estado "Activo"
      idCentroTrabajo: worker.idCentroTrabajo,
      createdBy: worker.createdBy,
      updatedBy: worker.updatedBy,
      // Incluir valores originales para normalizaciones - solo cuando hay cambios reales
      sexoOriginal:
        worker.originalValues?.sexo &&
        worker.originalValues.sexo !==
          (worker.sexo ? String(worker.sexo).trim() : '')
          ? worker.originalValues.sexo
          : undefined,
      escolaridadOriginal:
        worker.originalValues?.escolaridad &&
        worker.originalValues.escolaridad !==
          (worker.escolaridad ? String(worker.escolaridad).trim() : '')
          ? worker.originalValues.escolaridad
          : undefined,
      estadoCivilOriginal:
        worker.originalValues?.estadoCivil &&
        worker.originalValues.estadoCivil !==
          (worker.estadoCivil ? String(worker.estadoCivil).trim() : '')
          ? worker.originalValues.estadoCivil
          : undefined,
      // ✅ ELIMINADO: No se capturan valores originales del estado laboral
      telefonoOriginal:
        worker.originalValues?.telefono &&
        worker.originalValues.telefono !==
          (worker.telefono ? String(worker.telefono).trim() : '')
          ? worker.originalValues.telefono
          : undefined,
      numeroEmpleadoOriginal:
        worker.originalValues?.numeroEmpleado &&
        worker.originalValues.numeroEmpleado !==
          (worker.numeroEmpleado ? String(worker.numeroEmpleado).trim() : '')
          ? worker.originalValues.numeroEmpleado
          : undefined,
      nssOriginal:
        worker.originalValues?.nss &&
        worker.originalValues.nss !==
          (worker.nss ? String(worker.nss).trim() : '')
          ? worker.originalValues.nss
          : undefined,
      curpOriginal:
        worker.originalValues?.curp &&
        worker.originalValues.curp !==
          (worker.curp ? String(worker.curp).trim() : '')
          ? worker.originalValues.curp
          : undefined,
    };

    return result;
  }

  /**
   * Método auxiliar para parsear fechas de diferentes formatos
   * Maneja: string, Date, número de Excel, null, undefined
   */
  private parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;

    // Si ya es un objeto Date válido, retornarlo
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      return dateValue;
    }

    // Si es un número (fecha serial de Excel)
    if (typeof dateValue === 'number') {
      // Las fechas de Excel son días desde el 1 de enero de 1900
      // Convertir a milisegundos y crear Date
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(
        excelEpoch.getTime() + (dateValue - 1) * 24 * 60 * 60 * 1000,
      );
      return isNaN(date.getTime()) ? null : date;
    }

    // Si es string, intentar diferentes formatos
    if (typeof dateValue === 'string') {
      const trimmedValue = dateValue.trim();
      if (!trimmedValue) return null;

      // Intentar formato DD/MM/YYYY
      let momentDate = moment(trimmedValue, 'DD/MM/YYYY', true);
      if (momentDate.isValid()) {
        return momentDate.toDate();
      }

      // Intentar formato MM/DD/YYYY
      momentDate = moment(trimmedValue, 'MM/DD/YYYY', true);
      if (momentDate.isValid()) {
        return momentDate.toDate();
      }

      // Intentar formato YYYY-MM-DD
      momentDate = moment(trimmedValue, 'YYYY-MM-DD', true);
      if (momentDate.isValid()) {
        return momentDate.toDate();
      }

      // Intentar formato ISO
      momentDate = moment(trimmedValue);
      if (momentDate.isValid()) {
        return momentDate.toDate();
      }

      // Solo loguear si realmente no se pudo parsear
      console.warn(`[FECHA] No se pudo parsear la fecha: ${trimmedValue}`);
      return null;
    }

    // Para cualquier otro tipo, solo loguear si es un valor inesperado
    if (dateValue !== null && dateValue !== undefined) {
      console.warn(
        `[FECHA] Tipo de fecha no soportado: ${typeof dateValue}, valor: ${dateValue}`,
      );
    }
    return null;
  }

  /**
   * Método para parsear fechas de Excel en múltiples formatos
   */
  private parseExcelDate(dateValue: any): Date | null {
    if (!dateValue) return null;

    // Si ya es un objeto Date válido, retornarlo
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      return dateValue;
    }

    // Si es un número (fecha serial de Excel)
    if (typeof dateValue === 'number') {
      // Manejar fechas seriales de Excel (días desde 1900-01-01)
      // Excel tiene un bug: considera 1900 como año bisiesto
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(
        excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000,
      );
      return isNaN(date.getTime()) ? null : date;
    }

    // Si es string, intentar múltiples formatos
    if (typeof dateValue === 'string') {
      const trimmedValue = dateValue.trim();
      if (!trimmedValue) return null;

      // Lista de formatos comunes en Excel
      const formats = [
        'DD/MM/YYYY',
        'MM/DD/YYYY',
        'YYYY-MM-DD',
        'DD-MM-YYYY',
        'MM-DD-YYYY',
        'YYYY/MM/DD',
        'DD.MM.YYYY',
        'MM.DD.YYYY',
        'YYYY.MM.DD',
        'DD/MM/YY',
        'MM/DD/YY',
        'YY-MM-DD',
        'DD-MM-YY',
        'MM-DD-YY',
        'YY/MM/DD',
      ];

      for (const format of formats) {
        const momentDate = moment(trimmedValue, format, true);
        if (momentDate.isValid()) {
          return momentDate.toDate();
        }
      }

      // Intentar parseo automático de moment
      const momentDate = moment(trimmedValue);
      if (momentDate.isValid()) {
        return momentDate.toDate();
      }

      // Intentar parsear como fecha ISO
      const isoDate = new Date(trimmedValue);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }

      // Solo loguear si realmente no se pudo parsear
      console.warn(
        `[FECHA] No se pudo parsear la fecha de Excel: ${trimmedValue}`,
      );
      return null;
    }

    // Para cualquier otro tipo, solo loguear si es un valor inesperado
    if (dateValue !== null && dateValue !== undefined) {
      console.warn(
        `[FECHA] Tipo de fecha de Excel no soportado: ${typeof dateValue}, valor: ${dateValue}`,
      );
    }
    return null;
  }

  /**
   * ✅ SOLUCIÓN: Método para normalizar números de teléfono
   * Acepta formatos como: 6681702850, 668 170 28 50, (668) 1702850, etc.
   * Retorna solo los dígitos o null si el formato no es válido
   */
  private normalizePhoneNumber(phone: string): string | null {
    if (!phone || phone.trim() === '') return null;

    // Remover todos los caracteres no numéricos excepto espacios, paréntesis y guiones
    const cleaned = phone.replace(/[^\d\s\(\)\-]/g, '');

    // Verificar que solo contenga caracteres válidos
    if (!/^[\d\s\(\)\-]+$/.test(phone)) {
      return null;
    }

    // Remover espacios, paréntesis y guiones, dejando solo dígitos
    const digitsOnly = cleaned.replace(/[\s\(\)\-]/g, '');

    // Verificar que solo contenga dígitos
    if (!/^\d+$/.test(digitsOnly)) {
      return null;
    }

    return digitsOnly;
  }

  /**
   * Método para normalizar enumeraciones con variaciones de mayúsculas/minúsculas
   * y mapeos inteligentes para valores similares
   */
  private normalizeEnumValue(
    value: string,
    validValues: string[],
  ): string | null {
    if (!value) return null;

    const trimmedValue = String(value).trim();
    if (!trimmedValue) return null;

    // 1. Búsqueda exacta (case-insensitive)
    const exactMatch = validValues.find(
      (valid) => valid.toLowerCase() === trimmedValue.toLowerCase(),
    );
    if (exactMatch) return exactMatch;

    // 2. Búsqueda con normalización de acentos y caracteres especiales
    const normalizedInput = this.normalizeString(trimmedValue);
    const normalizedMatch = validValues.find(
      (valid) => this.normalizeString(valid) === normalizedInput,
    );
    if (normalizedMatch) return normalizedMatch;

    // 3. Búsqueda parcial (para casos como "Soltero" vs "Soltero/a")
    const partialMatch = validValues.find((valid) => {
      const normalizedValid = this.normalizeString(valid);
      const normalizedInputLower = normalizedInput.toLowerCase();

      // Buscar coincidencias parciales
      return (
        normalizedValid.toLowerCase().includes(normalizedInputLower) ||
        normalizedInputLower.includes(normalizedValid.toLowerCase())
      );
    });
    if (partialMatch) return partialMatch;

    // 4. Mapeos específicos para casos comunes
    const specificMappings = this.getSpecificMappings(
      trimmedValue,
      validValues,
    );
    if (specificMappings) return specificMappings;

    // 5. Búsqueda fuzzy (para errores tipográficos menores)
    const fuzzyMatch = this.findFuzzyMatch(trimmedValue, validValues);
    if (fuzzyMatch) return fuzzyMatch;

    return null;
  }

  /**
   * Normaliza strings eliminando acentos y caracteres especiales
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^a-z0-9\s]/g, '') // Solo letras, números y espacios
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();
  }

  /**
   * Mapeos específicos para casos comunes de enumeraciones
   */
  private getSpecificMappings(
    input: string,
    validValues: string[],
  ): string | null {
    const inputLower = input.toLowerCase();

    // Mapeos para sexo
    if (validValues.includes('Masculino') || validValues.includes('Femenino')) {
      const sexoMappings: Record<string, string> = {
        m: 'Masculino',
        masculino: 'Masculino',
        hombre: 'Masculino',
        varon: 'Masculino',
        f: 'Femenino',
        femenino: 'Femenino',
        mujer: 'Femenino',
        hembra: 'Femenino',
        intersexual: 'Intersexual',
        'no binario': 'Intersexual',
        'no-binario': 'Intersexual',
        nobinario: 'Intersexual',
        '3': 'Intersexual',
      };

      if (sexoMappings[inputLower]) return sexoMappings[inputLower];
    }

    // Mapeos para estado civil
    if (validValues.includes('Soltero/a') || validValues.includes('Casado/a')) {
      const estadoCivilMappings: Record<string, string> = {
        soltero: 'Soltero/a',
        soltera: 'Soltero/a',
        'soltero/a': 'Soltero/a',
        casado: 'Casado/a',
        casada: 'Casado/a',
        'casado/a': 'Casado/a',
        'union libre': 'Unión libre',
        union: 'Unión libre',
        separado: 'Separado/a',
        separada: 'Separado/a',
        'separado/a': 'Separado/a',
        divorciado: 'Divorciado/a',
        divorciada: 'Divorciado/a',
        'divorciado/a': 'Divorciado/a',
        viudo: 'Viudo/a',
        viuda: 'Viudo/a',
        'viudo/a': 'Viudo/a',
      };

      if (estadoCivilMappings[inputLower])
        return estadoCivilMappings[inputLower];
    }

    // Mapeos para escolaridad
    if (
      validValues.includes('Primaria') ||
      validValues.includes('Secundaria')
    ) {
      const escolaridadMappings: Record<string, string> = {
        primaria: 'Primaria',
        secundaria: 'Secundaria',
        preparatoria: 'Preparatoria',
        bachillerato: 'Preparatoria',
        licenciatura: 'Licenciatura',
        universidad: 'Licenciatura',
        maestria: 'Maestría',
        doctorado: 'Doctorado',
        nula: 'Nula',
        'sin estudios': 'Nula',
      };

      if (escolaridadMappings[inputLower])
        return escolaridadMappings[inputLower];
    }

    // Mapeos para estado laboral
    if (validValues.includes('Activo') || validValues.includes('Inactivo')) {
      const estadoLaboralMappings: Record<string, string> = {
        activo: 'Activo',
        trabajando: 'Activo',
        empleado: 'Activo',
        inactivo: 'Inactivo',
        desempleado: 'Inactivo',
        cesado: 'Inactivo',
        renuncio: 'Inactivo',
      };

      if (estadoLaboralMappings[inputLower])
        return estadoLaboralMappings[inputLower];
    }

    return null;
  }

  /**
   * Búsqueda fuzzy para encontrar coincidencias con errores tipográficos menores
   */
  private findFuzzyMatch(input: string, validValues: string[]): string | null {
    const inputLower = input.toLowerCase();

    // Calcular similitud con cada valor válido
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const valid of validValues) {
      const validLower = valid.toLowerCase();

      // Calcular similitud usando distancia de Levenshtein simplificada
      const score = this.calculateSimilarity(inputLower, validLower);

      if (score > bestScore && score > 0.7) {
        // Umbral de 70% de similitud
        bestScore = score;
        bestMatch = valid;
      }
    }

    return bestMatch;
  }

  /**
   * Calcula similitud entre dos strings (0.0 a 1.0)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    // Calcular distancia de Levenshtein simplificada
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calcula la distancia de Levenshtein entre dos strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Normaliza columnas del Excel a nombres de campo del modelo.
   */
  private mapExcelGeoFields(worker: Record<string, unknown>): void {
    const aliasMap: Record<string, string[]> = {
      curp: ['curp', 'CURP'],
      sexoCURP: ['sexoCURP', 'Sexo CURP', 'sexo curp'],
      entidadNacimiento: [
        'entidadNacimiento',
        'Entidad Nacimiento',
        'entidad nacimiento',
      ],
      paisNacimiento: [
        'paisNacimiento',
        'País de nacimiento',
        'Pais de nacimiento',
        'pais de nacimiento',
      ],
      entidadResidencia: [
        'entidadResidencia',
        'Entidad Residencia',
        'entidad residencia',
      ],
      municipioResidencia: [
        'municipioResidencia',
        'Municipio Residencia',
        'municipio residencia',
      ],
      localidadResidencia: [
        'localidadResidencia',
        'Localidad Residencia',
        'localidad residencia',
      ],
      paisResidencia: [
        'paisResidencia',
        'País de residencia',
        'Pais de residencia',
        'pais de residencia',
      ],
    };

    for (const [target, aliases] of Object.entries(aliasMap)) {
      for (const alias of aliases) {
        if (worker[alias] != null && String(worker[alias]).trim() !== '') {
          worker[target] = worker[alias];
          break;
        }
      }
    }

    for (const field of ['paisNacimiento', 'paisResidencia'] as const) {
      if (worker[field] != null && String(worker[field]).trim() !== '') {
        const parsed = Number(worker[field]);
        if (!Number.isNaN(parsed)) {
          worker[field] = parsed;
        }
      }
    }
  }

  /**
   * Método para limpiar y normalizar datos antes de la validación
   * Maneja casos especiales como espacios en blanco, valores nulos, etc.
   */
  private cleanWorkerData(worker: any): any {
    this.mapExcelGeoFields(worker);
    const cleaned = { ...worker };

    // 🔍 CORRECCIÓN: Guardar valores originales ANTES de cualquier limpieza
    const originalValues = {
      sexo: worker.sexo, // Usar worker original, no cleaned
      escolaridad: worker.escolaridad,
      estadoCivil: worker.estadoCivil,
      // ✅ ELIMINADO: No se capturan valores originales del estado laboral
      telefono:
        worker.telefono &&
        typeof worker.telefono === 'string' &&
        worker.telefono.trim() !== ''
          ? worker.telefono
          : null,
      numeroEmpleado:
        worker.numeroEmpleado &&
        typeof worker.numeroEmpleado === 'string' &&
        worker.numeroEmpleado.trim() !== ''
          ? worker.numeroEmpleado
          : null,
      nss:
        worker.nss && typeof worker.nss === 'string' && worker.nss.trim() !== ''
          ? worker.nss
          : null,
      curp:
        worker.curp &&
        typeof worker.curp === 'string' &&
        worker.curp.trim() !== ''
          ? worker.curp
          : null,
    };

    // Limpiar strings eliminando espacios y convirtiendo a string
    if (cleaned.primerApellido)
      cleaned.primerApellido = collapsePersonNameWhitespace(
        String(cleaned.primerApellido),
      );
    if (cleaned.segundoApellido)
      cleaned.segundoApellido = collapsePersonNameWhitespace(
        String(cleaned.segundoApellido),
      );
    if (cleaned.nombre)
      cleaned.nombre = collapsePersonNameWhitespace(String(cleaned.nombre));
    if (cleaned.sexo) cleaned.sexo = String(cleaned.sexo).trim();
    if (cleaned.escolaridad)
      cleaned.escolaridad = String(cleaned.escolaridad).trim();
    if (cleaned.puesto) cleaned.puesto = String(cleaned.puesto).trim();
    if (cleaned.telefono && typeof cleaned.telefono === 'string')
      cleaned.telefono = cleaned.telefono.trim();
    if (cleaned.estadoCivil)
      cleaned.estadoCivil = String(cleaned.estadoCivil).trim();
    if (cleaned.numeroEmpleado)
      cleaned.numeroEmpleado = String(cleaned.numeroEmpleado).trim();
    if (cleaned.nss) cleaned.nss = String(cleaned.nss).trim();
    if (cleaned.curp) cleaned.curp = String(cleaned.curp).trim();
    if (cleaned.entidadNacimiento)
      cleaned.entidadNacimiento = String(cleaned.entidadNacimiento).trim();
    if (cleaned.entidadResidencia)
      cleaned.entidadResidencia = String(cleaned.entidadResidencia).trim();
    if (cleaned.municipioResidencia)
      cleaned.municipioResidencia = String(cleaned.municipioResidencia).trim();
    if (cleaned.localidadResidencia)
      cleaned.localidadResidencia = String(cleaned.localidadResidencia).trim();
    if (
      cleaned.paisNacimiento != null &&
      String(cleaned.paisNacimiento).trim() !== ''
    ) {
      const parsedPaisNac = Number(cleaned.paisNacimiento);
      if (!Number.isNaN(parsedPaisNac)) {
        cleaned.paisNacimiento = parsedPaisNac;
      }
    }
    if (
      cleaned.paisResidencia != null &&
      String(cleaned.paisResidencia).trim() !== ''
    ) {
      const parsedPaisRes = Number(cleaned.paisResidencia);
      if (!Number.isNaN(parsedPaisRes)) {
        cleaned.paisResidencia = parsedPaisRes;
      }
    }
    // ✅ ELIMINADO: No se procesa el estado laboral del Excel

    // Normalizar enumeraciones - solo loguear si hay cambios reales
    const sexos = ['Masculino', 'Femenino', 'Intersexual'];
    if (cleaned.sexo) {
      const originalSexo = cleaned.sexo;
      const normalizedSexo = this.normalizeEnumValue(cleaned.sexo, sexos);
      if (normalizedSexo && normalizedSexo !== originalSexo) {
        cleaned.sexo = normalizedSexo;
        console.log(
          `[NORMALIZACIÓN] Sexo: "${originalSexo}" -> "${normalizedSexo}"`,
        );
      }
    }

    const normalizedSexoCurp = normalizeSexoCurpInput(
      cleaned.sexoCURP ?? cleaned['Sexo CURP'] ?? cleaned['sexo curp'],
    );
    if (normalizedSexoCurp != null) {
      cleaned.sexoCURP = normalizedSexoCurp;
    }

    const nivelesEscolaridad = [
      'Primaria',
      'Secundaria',
      'Preparatoria',
      'Licenciatura',
      'Maestría',
      'Doctorado',
      'Nula',
    ];
    if (cleaned.escolaridad) {
      const originalEscolaridad = cleaned.escolaridad;
      const normalizedEscolaridad = this.normalizeEnumValue(
        cleaned.escolaridad,
        nivelesEscolaridad,
      );
      if (
        normalizedEscolaridad &&
        normalizedEscolaridad !== originalEscolaridad
      ) {
        cleaned.escolaridad = normalizedEscolaridad;
        console.log(
          `[NORMALIZACIÓN] Escolaridad: "${originalEscolaridad}" -> "${normalizedEscolaridad}"`,
        );
      }
    }

    const estadosCiviles = [
      'Soltero/a',
      'Casado/a',
      'Unión libre',
      'Separado/a',
      'Divorciado/a',
      'Viudo/a',
    ];
    if (cleaned.estadoCivil) {
      const originalEstadoCivil = cleaned.estadoCivil;
      const normalizedEstadoCivil = this.normalizeEnumValue(
        cleaned.estadoCivil,
        estadosCiviles,
      );
      if (
        normalizedEstadoCivil &&
        normalizedEstadoCivil !== originalEstadoCivil
      ) {
        cleaned.estadoCivil = normalizedEstadoCivil;
        console.log(
          `[NORMALIZACIÓN] Estado civil: "${originalEstadoCivil}" -> "${normalizedEstadoCivil}"`,
        );
      }
    }

    // ✅ ELIMINADO: No se normaliza el estado laboral

    // Normalizar teléfono - solo si hay un cambio real
    if (
      cleaned.telefono &&
      typeof cleaned.telefono === 'string' &&
      cleaned.telefono.trim() !== ''
    ) {
      const originalTelefono = cleaned.telefono;
      const normalizedTelefono = this.normalizePhoneNumber(cleaned.telefono);

      // Solo normalizar si hay un cambio real y el resultado no es null
      if (normalizedTelefono && normalizedTelefono !== originalTelefono) {
        cleaned.telefono = normalizedTelefono;
        console.log(
          `[NORMALIZACIÓN] Teléfono: "${originalTelefono}" -> "${normalizedTelefono}"`,
        );
      }
    }

    // Guardar valores originales en el objeto cleaned para uso posterior
    cleaned.originalValues = originalValues;

    // Manejar valores nulos o undefined
    if (
      cleaned.primerApellido === 'null' ||
      cleaned.primerApellido === 'undefined' ||
      cleaned.primerApellido === ''
    ) {
      cleaned.primerApellido = null;
    }
    if (
      cleaned.segundoApellido === 'null' ||
      cleaned.segundoApellido === 'undefined' ||
      cleaned.segundoApellido === ''
    ) {
      cleaned.segundoApellido = null;
    }
    if (
      cleaned.nombre === 'null' ||
      cleaned.nombre === 'undefined' ||
      cleaned.nombre === ''
    ) {
      cleaned.nombre = null;
    }
    if (
      cleaned.sexo === 'null' ||
      cleaned.sexo === 'undefined' ||
      cleaned.sexo === ''
    ) {
      cleaned.sexo = null;
    }
    if (
      cleaned.escolaridad === 'null' ||
      cleaned.escolaridad === 'undefined' ||
      cleaned.escolaridad === ''
    ) {
      cleaned.escolaridad = null;
    }
    if (
      cleaned.puesto === 'null' ||
      cleaned.puesto === 'undefined' ||
      cleaned.puesto === ''
    ) {
      cleaned.puesto = null;
    }
    if (
      cleaned.estadoCivil === 'null' ||
      cleaned.estadoCivil === 'undefined' ||
      cleaned.estadoCivil === ''
    ) {
      cleaned.estadoCivil = null;
    }
    if (
      cleaned.numeroEmpleado === 'null' ||
      cleaned.numeroEmpleado === 'undefined' ||
      cleaned.numeroEmpleado === ''
    ) {
      cleaned.numeroEmpleado = null;
    }
    if (
      cleaned.nss === 'null' ||
      cleaned.nss === 'undefined' ||
      cleaned.nss === ''
    ) {
      cleaned.nss = null;
    }
    if (
      cleaned.curp === 'null' ||
      cleaned.curp === 'undefined' ||
      cleaned.curp === ''
    ) {
      cleaned.curp = null;
    }

    // Limpiar fechas - convertir strings vacíos a null
    if (
      cleaned.fechaNacimiento === '' ||
      cleaned.fechaNacimiento === 'null' ||
      cleaned.fechaNacimiento === 'undefined'
    ) {
      cleaned.fechaNacimiento = null;
    }
    if (
      cleaned.fechaIngreso === '' ||
      cleaned.fechaIngreso === 'null' ||
      cleaned.fechaIngreso === 'undefined'
    ) {
      cleaned.fechaIngreso = null;
    }

    return cleaned;
  }

  /**
   * Método para validar y limpiar datos antes de procesarlos
   * Ayuda a identificar problemas temprano en la importación
   */
  private validateAndCleanWorkerData(
    worker: any,
    regime?: string | null,
  ): {
    isValid: boolean;
    errors: string[];
    cleanedData: any;
  } {
    const errors: string[] = [];
    const cleanedData = this.cleanWorkerData(worker);
    applyTrabajadorPersonNames(cleanedData, regime);

    // Validar campos requeridos
    if (!worker.nombre || String(worker.nombre).trim() === '') {
      errors.push('El nombre es requerido');
    }

    const nameLengthValidation = validatePersonNameFields(
      cleanedData.nombre,
      cleanedData.primerApellido,
      cleanedData.segundoApellido,
      regime,
    );
    if (!nameLengthValidation.isValid) {
      errors.push(...nameLengthValidation.errors);
    }

    if (!worker.fechaNacimiento) {
      errors.push('La fecha de nacimiento es requerida');
    } else {
      const parsedDate = this.parseExcelDate(worker.fechaNacimiento);
      if (!parsedDate) {
        errors.push(`Fecha de nacimiento inválida: ${worker.fechaNacimiento}`);
      } else {
        try {
          validateFechaNacimiento(parsedDate);
          cleanedData.fechaNacimiento = parsedDate;
        } catch (error) {
          const message =
            error instanceof BadRequestException &&
            typeof error.getResponse() === 'object' &&
            error.getResponse() !== null &&
            'message' in (error.getResponse() as object)
              ? String((error.getResponse() as { message: string }).message)
              : `Edad fuera de rango (${AGE_MIN_YEARS} a ${AGE_MAX_YEARS} años, incluyendo meses y días)`;
          errors.push(message);
        }
      }
    }

    // La fecha de ingreso ahora es opcional
    if (worker.fechaIngreso) {
      const parsedDate = this.parseExcelDate(worker.fechaIngreso);
      if (!parsedDate) {
        errors.push(`Fecha de ingreso inválida: ${worker.fechaIngreso}`);
      } else {
        cleanedData.fechaIngreso = parsedDate;
      }
    }

    // Validar campos de enumeración (ya normalizados en cleanWorkerData)
    const sexos = ['Masculino', 'Femenino', 'Intersexual'];
    if (!cleanedData.sexo || !sexos.includes(cleanedData.sexo)) {
      errors.push(`El sexo debe ser uno de: ${sexos.join(', ')}`);
    }

    const nivelesEscolaridad = [
      'Primaria',
      'Secundaria',
      'Preparatoria',
      'Licenciatura',
      'Maestría',
      'Doctorado',
      'Nula',
    ];
    if (
      !cleanedData.escolaridad ||
      !nivelesEscolaridad.includes(cleanedData.escolaridad)
    ) {
      errors.push(
        `La escolaridad debe ser una de: ${nivelesEscolaridad.join(', ')}`,
      );
    }

    const estadosCiviles = [
      'Soltero/a',
      'Casado/a',
      'Unión libre',
      'Separado/a',
      'Divorciado/a',
      'Viudo/a',
    ];
    if (
      !cleanedData.estadoCivil ||
      !estadosCiviles.includes(cleanedData.estadoCivil)
    ) {
      errors.push(
        `El estado civil debe ser uno de: ${estadosCiviles.join(', ')}`,
      );
    }

    if (!cleanedData.puesto || String(cleanedData.puesto).trim() === '') {
      errors.push('El puesto es requerido');
    }

    // ✅ ELIMINADO: No se valida el estado laboral del Excel

    // ✅ SOLUCIÓN: Validar número de empleado (opcional, pero si existe debe tener 1-7 dígitos)
    if (worker.numeroEmpleado) {
      const numeroEmpleadoNormalizado = String(worker.numeroEmpleado).trim();
      if (numeroEmpleadoNormalizado !== '') {
        // Aceptar solo números, pero permitir que venga como texto con separadores
        const numeroEmpleadoLimpio = numeroEmpleadoNormalizado.replace(
          /[^0-9]/g,
          '',
        );
        if (
          numeroEmpleadoLimpio.length < 1 ||
          numeroEmpleadoLimpio.length > 7
        ) {
          errors.push(
            `El número de empleado debe tener entre 1 y 7 dígitos. Recibido: ${numeroEmpleadoLimpio.length} dígitos`,
          );
        } else {
          // Guardar el número de empleado normalizado (solo números)
          cleanedData.numeroEmpleado = numeroEmpleadoLimpio;
        }
      }
    }

    // ✅ SOLUCIÓN: Validar teléfono (opcional, pero si existe debe tener 10 dígitos)
    if (worker.telefono && typeof worker.telefono === 'string') {
      const telefonoNormalizado = this.normalizePhoneNumber(
        worker.telefono.trim(),
      );
      if (telefonoNormalizado) {
        if (telefonoNormalizado.length !== 10) {
          errors.push(
            `El teléfono debe tener exactamente 10 dígitos. Recibido: ${telefonoNormalizado.length} dígitos`,
          );
        } else {
          // Guardar el teléfono normalizado
          cleanedData.telefono = telefonoNormalizado;
        }
      } else {
        errors.push(
          'El formato del teléfono no es válido. Debe contener solo números, espacios, paréntesis y guiones',
        );
      }
    }

    // Validar Identificador de Seguridad Social (opcional, LATAM: 4-30 chars alfanuméricos y separadores comunes)
    if (worker.nss && typeof worker.nss === 'string') {
      const nssNormalizado = String(worker.nss).trim();
      if (nssNormalizado !== '') {
        const permitido = /^[A-Za-z0-9\s\-_.\/]{4,30}$/;
        if (!permitido.test(nssNormalizado)) {
          errors.push(
            'El identificador de seguridad social debe tener 4-30 caracteres alfanuméricos y puede incluir - _ . / y espacios',
          );
        } else {
          cleanedData.nss = nssNormalizado;
        }
      }
    }

    // Validar CURP u homólogo LATAM (opcional, permite separadores comunes)
    if (worker.curp && typeof worker.curp === 'string') {
      const curpNormalizada = String(worker.curp).trim();
      if (curpNormalizada !== '') {
        const permitidoCurp = /^[A-Za-z0-9\s\-_.\/#]{4,30}$/;
        if (!permitidoCurp.test(curpNormalizada)) {
          errors.push(
            'El identificador CURP debe tener 4-30 caracteres alfanuméricos y puede incluir - _ . / # y espacios',
          );
        } else {
          cleanedData.curp = curpNormalizada;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      cleanedData,
    };
  }

  private extractImportValidationMessage(error: unknown): string {
    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (response && typeof response === 'object') {
        const payload = response as {
          message?: string | string[];
          details?: Array<{ field?: string; reason?: string }>;
        };
        if (Array.isArray(payload.message)) {
          return payload.message.join('; ');
        }
        if (payload.message) {
          return payload.message;
        }
        if (Array.isArray(payload.details) && payload.details.length > 0) {
          return payload.details
            .map((detail) =>
              detail.field
                ? `${detail.field}: ${detail.reason ?? 'inválido'}`
                : (detail.reason ?? 'Error de validación'),
            )
            .join('; ');
        }
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Error de validación regulatoria';
  }

  private async validateWorkerImportForPolicy(
    cleanedData: any,
    policy: RegulatoryPolicy,
    proveedorSaludId: string | null,
  ): Promise<string[]> {
    const errors: string[] = [];
    const isSiresStrict =
      policy.validation.geoFields === 'required' &&
      policy.validation.workerCurp === 'required_strict';

    if (!isSiresStrict) {
      return errors;
    }

    const pais = proveedorSaludId
      ? await this.nom024Util.getProveedorPais(proveedorSaludId)
      : null;

    if (cleanedData.nss && String(cleanedData.nss).trim() !== '') {
      const nssDigits = String(cleanedData.nss).replace(/[^0-9]/g, '');
      if (pais === 'MX' && nssDigits.length !== 11) {
        errors.push(
          'El NSS debe tener exactamente 11 dígitos numéricos para proveedores en México (SIRES)',
        );
      }
    }

    try {
      await this.validateNOM024PersonFields(cleanedData, proveedorSaludId);
    } catch (error) {
      errors.push(this.extractImportValidationMessage(error));
    }

    try {
      await this.validateCURPForMX(cleanedData.curp, proveedorSaludId, {
        fechaNacimiento: cleanedData.fechaNacimiento,
        sexoCURP: normalizeSexoCurpInput(cleanedData.sexoCURP) ?? undefined,
        entidadNacimiento: cleanedData.entidadNacimiento,
        nombre: cleanedData.nombre,
        primerApellido: cleanedData.primerApellido,
        segundoApellido: cleanedData.segundoApellido,
      });
    } catch (error) {
      errors.push(this.extractImportValidationMessage(error));
    }

    return errors;
  }

  // Método para importar trabajadores
  async importarTrabajadores(
    data: any[],
    idCentroTrabajo: string,
    createdBy: string,
  ) {
    const resultados = [];
    const startTime = Date.now();
    const proveedorSaludId =
      await this.getProveedorSaludIdFromCentroTrabajo(idCentroTrabajo);
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    console.log(
      `[IMPORTACIÓN] 🚀 Iniciando importación de ${data.length} trabajadores (régimen: ${policy.regime})`,
    );

    for (const worker of data) {
      try {
        // Primero validar y limpiar los datos
        const validation = this.validateAndCleanWorkerData(
          {
            ...worker,
            idCentroTrabajo,
            createdBy,
            updatedBy: createdBy,
          },
          policy.regime,
        );

        const policyErrors =
          validation.isValid
            ? await this.validateWorkerImportForPolicy(
                validation.cleanedData,
                policy,
                proveedorSaludId,
              )
            : [];

        const allErrors = [...validation.errors, ...policyErrors];

        if (allErrors.length > 0) {
          console.error(
            `[ERROR] ${worker.primerApellido || 'Sin primer apellido'} ${worker.segundoApellido || 'Sin segundo apellido'} ${worker.nombre || 'Sin nombre'}: ${allErrors.join(', ')}`,
          );
          // ✅ SOLUCIÓN: Enviar datos procesados para que las fechas se muestren correctamente
          const processedData = this.processWorkerData(validation.cleanedData);
          resultados.push({
            success: false,
            error: 'Hay errores de validación', // ✅ Resumen genérico para evitar redundancia
            worker: processedData, // Usar datos procesados en lugar de datos originales
            validationErrors: allErrors,
          });
          continue;
        }

        // Procesar los datos validados
        const processedWorker = this.processWorkerData(validation.cleanedData);

        const { trabajador: nuevoTrabajador, posibleDuplicado } =
          await this.create(processedWorker);

        const workerWithOriginals = {
          ...nuevoTrabajador.toObject(),
          // Agregar los campos originales para normalizaciones
          sexoOriginal: processedWorker.sexoOriginal,
          escolaridadOriginal: processedWorker.escolaridadOriginal,
          estadoCivilOriginal: processedWorker.estadoCivilOriginal,
          telefonoOriginal: processedWorker.telefonoOriginal,
          numeroEmpleadoOriginal: processedWorker.numeroEmpleadoOriginal,
          nssOriginal: processedWorker.nssOriginal,
          curpOriginal: processedWorker.curpOriginal,
        };

        resultados.push({ success: true, worker: workerWithOriginals, posibleDuplicado });
      } catch (error) {
        console.error(
          `[ERROR] ${worker.primerApellido || 'Sin primer apellido'} ${worker.segundoApellido || 'Sin segundo apellido'} ${worker.nombre || 'Sin nombre'}: ${error.message}`,
        );
        resultados.push({
          success: false,
          error: error.message,
          worker,
          processedData: this.processWorkerData({
            ...worker,
            idCentroTrabajo,
            createdBy,
            updatedBy: createdBy,
          }),
        });
      }
    }

    const hasErrors = resultados.some((r) => !r.success);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    if (hasErrors) {
      const exitosos = resultados.filter((r) => r.success).length;
      const fallidos = resultados.filter((r) => !r.success).length;
      console.log(
        `[IMPORTACIÓN] ⚠️ - Resultado mixto en ${duration}s: ${exitosos} exitosos, ${fallidos} fallidos de ${data.length} total`,
      );
      return {
        message:
          'Hubo errores durante la importación. Revisa los datos y asegúrate de usar el formato correcto.',
        data: resultados, // ✅ TODOS los resultados (exitosos + fallidos)
        totalProcessed: data.length,
        successful: exitosos,
        failed: fallidos,
      };
    }

    console.log(
      `[IMPORTACIÓN] ✅ - Completada exitosamente en ${duration}s. ${resultados.length} trabajadores importados`,
    );
    return {
      message: 'Trabajadores importados exitosamente',
      data: resultados,
      totalProcessed: data.length,
      successful: resultados.length,
      failed: 0,
    };
  }

  private buildFilePath(basePath: string, doc: any): string {
    if (!doc) {
      return '';
    }

    // Mapeo de campos de fecha por tipo de documento
    const dateFields: Record<string, string> = {
      HistoriaClinica: 'fechaHistoriaClinica',
      ExploracionFisica: 'fechaExploracionFisica',
      ExamenVista: 'fechaExamenVista',
      Antidoping: 'fechaAntidoping',
      AptitudPuesto: 'fechaAptitudPuesto',
      Audiometria: 'fechaAudiometria',
      Certificado: 'fechaCertificado',
      CertificadoExpedito: 'fechaCertificadoExpedito',
      ControlPrenatal: 'fechaInicioControlPrenatal',
      DocumentoExterno: 'fechaDocumento', // Este es clave para Documento Externo
      NotaMedica: 'fechaNotaMedica',
      NotaAclaratoria: 'fechaNotaAclaratoria',
      Receta: 'fechaReceta',
      ConstanciaAptitud: 'fechaConstanciaAptitud',
      EntrevistaPsicologica: 'fechaEntrevistaPsicologica',
      TrastornosEstadoAnimo: 'fechaTrastornosEstadoAnimo',
      CuestionarioProdromalBreve: 'fechaCuestionarioProdromalBreve',
      TrastornoLimitePersonalidad: 'fechaTrastornoLimitePersonalidad',
      EventoSeguimientoCardiometabolico: 'fechaEventoSeguimientoCardiometabolico',
      InformeLongitudinalCardiometabolico: 'fechaInformeLongitudinalCardiometabolico',
    };

    // Determinar el tipo de documento con el nombre del modelo en Mongoose
    const modelName = doc.constructor.modelName;
    const fechaCampo = dateFields[modelName] || 'createdAt'; // Usar createdAt si no hay fecha específica

    if (!doc[fechaCampo]) {
      return '';
    }

    // ⚠️ Convertir la fecha a string ISO si es un objeto Date
    const fechaISO =
      doc[fechaCampo] instanceof Date
        ? doc[fechaCampo].toISOString()
        : doc[fechaCampo];

    if (typeof fechaISO !== 'string' || !fechaISO.includes('T')) {
      return '';
    }

    // Extraer manualmente el día, mes y año sin que JavaScript lo ajuste
    const [year, month, day] = fechaISO.split('T')[0].split('-'); // Extrae "2025", "03", "12"
    const fecha = `${day}-${month}-${year}`; // Formato DD-MM-YYYY

    // Mapeo de nombres de documentos para generar el nombre del archivo
    const documentTypes: Record<string, string> = {
      HistoriaClinica: 'Historia Clinica',
      ExploracionFisica: 'Exploracion Fisica',
      ExamenVista: 'Examen Vista',
      Antidoping: 'Antidoping',
      AptitudPuesto: 'Aptitud',
      Audiometria: 'Audiometria',
      Certificado: 'Certificado',
      CertificadoExpedito: 'Certificado Expedito',
      ControlPrenatal: 'Control Prenatal',
      NotaMedica: 'Nota Medica',
      Receta: 'Receta',
      ConstanciaAptitud: 'Constancia de Aptitud',
      EntrevistaPsicologica: 'Entrevista Psicologica',
      TrastornosEstadoAnimo: 'Trastornos Estado Animo',
      CuestionarioProdromalBreve: 'Cuestionario Prodromal Breve',
      TrastornoLimitePersonalidad: 'Trastorno Limite Personalidad',
      EventoSeguimientoCardiometabolico: 'Evento Seguimiento Cardiometabolico',
      InformeLongitudinalCardiometabolico: 'Informe Longitudinal Cardiometabolico',
    };

    // Mapeo de tipos de documentos técnicos a nombres legibles (para Nota Aclaratoria)
    const documentoNombres: Record<string, string> = {
      notaMedica: 'Nota Médica',
      historiaClinica: 'Historia Clínica',
      exploracionFisica: 'Exploración Física',
      audiometria: 'Audiometría',
      antidoping: 'Antidoping',
      aptitud: 'Aptitud para el Puesto',
      certificado: 'Certificado',
      certificadoExpedito: 'Certificado Expedito',
      examenVista: 'Examen de Vista',
      controlPrenatal: 'Control Prenatal',
      historiaOtologica: 'Historia Otológica',
      previoEspirometria: 'Previo Espirometría',
      constanciaAptitud: 'Constancia de Aptitud',
      receta: 'Receta',
      documentoExterno: 'Documento Externo',
      // Tipos plurales (para compatibilidad)
      notasMedicas: 'Nota Médica',
      historiasClinicas: 'Historia Clínica',
      exploracionesFisicas: 'Exploración Física',
      audiometrias: 'Audiometría',
      antidopings: 'Antidoping',
      aptitudes: 'Aptitud para el Puesto',
      certificados: 'Certificado',
      certificadosExpedito: 'Certificado Expedito',
      examenesVista: 'Examen de Vista',
      recetas: 'Receta',
      documentosExternos: 'Documento Externo',
      constanciasAptitud: 'Constancia de Aptitud',
      eventoSeguimientoCardiometabolico: 'Evento de Seguimiento Cardiometabólico',
      informeLongitudinalCardiometabolico: 'Informe Longitudinal Cardiometabólico',
    };

    // Si es un Documento Externo, construir el nombre dinámicamente
    let fullPath = '';

    if (modelName === 'DocumentoExterno') {
      if (!doc.nombreDocumento || !doc.extension) {
        return '';
      }
      fullPath = `${basePath}/${doc.nombreDocumento} ${fecha}${doc.extension}`;
    } else if (modelName === 'NotaAclaratoria') {
      // Para Nota Aclaratoria, construir el nombre personalizado
      const fechaNotaAclaratoria = convertirFechaADDMMAAAA(
        doc.fechaNotaAclaratoria,
      )
        .replace(/\//g, '-')
        .replace(/\\/g, '-');

      // Construir nombre del documento que aclara
      let documentoQueAclara = '';
      const documentoOrigenTipo = doc.documentoOrigenTipo;
      const esDocumentoExterno =
        documentoOrigenTipo === 'documentoExterno' ||
        documentoOrigenTipo === 'documentosExternos';

      if (esDocumentoExterno && doc.documentoOrigenNombre) {
        documentoQueAclara = doc.documentoOrigenNombre;
      } else {
        documentoQueAclara =
          documentoNombres[documentoOrigenTipo] || documentoOrigenTipo;
      }

      // Agregar fecha del documento origen si está disponible
      if (doc.documentoOrigenFecha) {
        const fechaOrigen = convertirFechaADDMMAAAA(doc.documentoOrigenFecha)
          .replace(/\//g, '-')
          .replace(/\\/g, '-');
        documentoQueAclara = `${documentoQueAclara} ${fechaOrigen}`;
      }

      fullPath = `${basePath}/Nota Aclaratoria ${fechaNotaAclaratoria} (${documentoQueAclara}).pdf`;
    } else {
      const tipoDocumento = documentTypes[modelName] || 'Documento';
      fullPath = `${basePath}/${tipoDocumento} ${fecha}.pdf`;
    }

    // Limpiar cualquier doble barra accidental en la ruta
    fullPath = fullPath.replace(/\/\//g, '/');

    return fullPath;
  }

  private async eliminarArchivosDeDocumentos(
    documentos: any[],
  ): Promise<boolean> {
    if (documentos.length === 0) return true;

    console.log(
      `[ARCHIVOS] Verificando eliminación de ${documentos.length} archivos asociados...`,
    );

    let eliminacionesExitosas = 0;
    let erroresEncontrados = 0;
    const archivosAEliminar: { filePath: string; required: boolean }[] = [];

    try {
      for (const doc of documentos) {
        let fullPath = '';
        // DocumentoExterno no es regenerable: su ausencia debe fallar la cascada.
        // PDFs Ramazzini (rutaPDF) sí lo son: ENOENT u otros fallos FS son best-effort.
        let required = false;

        if ('rutaPDF' in doc && doc.rutaPDF) {
          fullPath = this.buildFilePath(doc.rutaPDF, doc);
          required = false;
        } else if ('rutaDocumento' in doc && doc.rutaDocumento) {
          fullPath = this.buildFilePath(doc.rutaDocumento, doc);
          // Uploads externos (p. ej. DocumentoExterno): deben existir para permitir la cascada.
          required = true;
        }

        if (!fullPath) continue;

        archivosAEliminar.push({ filePath: fullPath, required });
      }

      if (archivosAEliminar.length === 0) return true;

      await Promise.all(
        archivosAEliminar.map(async ({ filePath, required }) => {
          try {
            const result = await this.filesService.deleteFile(filePath);
            if (result === 'missing' && required) {
              erroresEncontrados++;
              console.error(
                `[ERROR] Documento externo no disponible para eliminar: ${filePath}`,
              );
              return;
            }
            eliminacionesExitosas++;
          } catch (error) {
            if (required) {
              erroresEncontrados++;
              console.error(
                `[ERROR] No se pudo eliminar el archivo ${filePath}: ${error.message}`,
              );
            } else {
              console.warn(
                `[ARCHIVOS] Fallo best-effort al eliminar PDF regenerable ${filePath}: ${error.message}`,
              );
            }
          }
        }),
      );

      if (erroresEncontrados > 0) {
        console.log(
          `[ARCHIVOS] ⚠️ Eliminación completada con ${erroresEncontrados} errores de ${archivosAEliminar.length} archivos`,
        );
      } else {
        console.log(
          `[ARCHIVOS] ✅ Eliminación exitosa de ${eliminacionesExitosas} archivos`,
        );
      }

      return erroresEncontrados === 0;
    } catch (error) {
      console.error(
        `[ERROR] Error en la eliminación de archivos: ${error.message}`,
      );
      return false;
    }
  }

  async remove(id: string): Promise<boolean> {
    const session = await this.trabajadorModel.db.startSession();

    try {
      await session.withTransaction(async () => {
        // 1️⃣ Buscar documentos del trabajador
        const documentos = (
          await Promise.all([
            this.historiaClinicaModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.exploracionFisicaModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.examenVistaModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.antidopingModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.aptitudModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.audiometriaModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.certificadoModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.certificadoExpeditoModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.controlPrenatalModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.documentoExternoModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.notaMedicaModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.notaAclaratoriaModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.recetaModel.find({ idTrabajador: id }).session(session).exec(),
            this.constanciaAptitudModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.entrevistaPsicologicaModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.trastornosEstadoAnimoModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.cuestionarioProdromalBreveModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.trastornoLimitePersonalidadModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.eventoSeguimientoCardiometabolicoModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.informeLongitudinalCardiometabolicoModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
            this.riesgoTrabajoModel
              .find({ idTrabajador: id })
              .session(session)
              .exec(),
          ])
        ).flat();

        if (documentos.length > 0) {
          // 2️⃣ Intentar eliminar los documentos en la base de datos primero
          await Promise.all([
            this.historiaClinicaModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.exploracionFisicaModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.examenVistaModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.antidopingModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.aptitudModel.deleteMany({ idTrabajador: id }).session(session),
            this.audiometriaModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.certificadoModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.certificadoExpeditoModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.controlPrenatalModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.documentoExternoModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.notaMedicaModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.notaAclaratoriaModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.recetaModel.deleteMany({ idTrabajador: id }).session(session),
            this.constanciaAptitudModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.entrevistaPsicologicaModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.trastornosEstadoAnimoModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.cuestionarioProdromalBreveModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.trastornoLimitePersonalidadModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.eventoSeguimientoCardiometabolicoModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.informeLongitudinalCardiometabolicoModel
              .deleteMany({ idTrabajador: id })
              .session(session),
            this.riesgoTrabajoModel
              .deleteMany({ idTrabajador: id })
              .session(session),
          ]);

          // 3️⃣ Si la eliminación en la base de datos fue exitosa, proceder a eliminar los archivos
          const eliminacionExitosa =
            await this.eliminarArchivosDeDocumentos(documentos);
          if (!eliminacionExitosa) {
            throw new Error('Error eliminando archivos.');
          }
        }

        // Resultados clínicos no tienen archivo propio (pueden vincular DocumentoExterno,
        // que ya se elimina arriba). Se borran siempre, incluso si no hay otros documentos.
        await this.resultadoClinicoModel
          .deleteMany({ idTrabajador: id })
          .session(session);

        // 4️⃣ Eliminar el trabajador
        const result = await this.trabajadorModel
          .findByIdAndDelete(id)
          .session(session);

        if (!result) {
          throw new Error(`No se pudo eliminar el Trabajador con ID: ${id}.`);
        }

        // 5️⃣ Limpiar alertas de duplicado que referencian a este trabajador,
        // para que el registro que permanece no quede marcado como duplicado.
        await this.workerFusionService.removeAlertsReferencingWorker(
          id,
          session,
        );
      });

      session.endSession();
      return true;
    } catch (error) {
      console.error(`[ERROR] ${error.message}`);
      session.endSession();
      return false;
    }
  }

  async exportarTrabajadores(idCentroTrabajo: string): Promise<Buffer> {
    // Consultar trabajadores del centro de trabajo especificado
    const trabajadores = await this.trabajadorModel
      .find({ idCentroTrabajo })
      .exec();

    // Convertir los datos en un arreglo de objetos para el archivo Excel, usando edad y antigüedad
    const trabajadoresData = trabajadores.map((trabajador) => {
      // Convertir las fechas a formato string 'YYYY-MM-DD' para usar en calcularEdad y calcularAntiguedad
      const fechaNacimientoStr = trabajador.fechaNacimiento
        ? moment(trabajador.fechaNacimiento).format('YYYY-MM-DD')
        : null;
      const fechaIngresoStr = trabajador.fechaIngreso
        ? moment(trabajador.fechaIngreso).format('YYYY-MM-DD')
        : null;

      return {
        PrimerApellido: trabajador.primerApellido,
        SegundoApellido: trabajador.segundoApellido,
        Nombre: trabajador.nombre,
        Edad: fechaNacimientoStr
          ? `${calcularEdad(fechaNacimientoStr)} años`
          : 'Desconocido',
        Sexo: trabajador.sexo,
        Escolaridad: trabajador.escolaridad,
        Puesto: trabajador.puesto,
        Antiguedad: fechaIngresoStr ? calcularAntiguedad(fechaIngresoStr) : '-',
        Telefono: trabajador.telefono,
        EstadoCivil: trabajador.estadoCivil,
        NumeroEmpleado: trabajador.numeroEmpleado || '',
        NSS: trabajador.nss || '',
        CURP: trabajador.curp || '',
      };
    });

    // Crear un nuevo libro y hoja de trabajo
    const worksheet = xlsx.utils.json_to_sheet(trabajadoresData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Trabajadores');

    // Convertir el libro a un buffer
    return xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  }

  /**
   * Valida que el número de empleado sea único a nivel empresa
   * @param numeroEmpleado - Número de empleado a validar
   * @param idCentroTrabajo - ID del centro de trabajo
   * @throws BadRequestException si el número ya existe en la empresa
   */
  private async validateNumeroEmpleadoUniqueness(
    numeroEmpleado: string,
    idCentroTrabajo: string,
    excludeTrabajadorId?: string,
  ): Promise<void> {
    // Obtener el centro de trabajo para encontrar la empresa
    const centroTrabajo = await this.centroTrabajoModel
      .findById(idCentroTrabajo)
      .exec();
    if (!centroTrabajo) {
      throw new BadRequestException('Centro de trabajo no encontrado');
    }

    // Buscar todos los centros de trabajo de la misma empresa
    const centrosEmpresa = await this.centroTrabajoModel
      .find({
        idEmpresa: centroTrabajo.idEmpresa,
      })
      .exec();

    const idsCentrosEmpresa = centrosEmpresa.map((ct) => ct._id);

    // Verificar si ya existe un trabajador con ese número en la empresa
    const filter: any = {
      numeroEmpleado: numeroEmpleado,
      idCentroTrabajo: { $in: idsCentrosEmpresa },
    };
    if (excludeTrabajadorId) {
      filter._id = { $ne: excludeTrabajadorId };
    }
    const trabajadorExistente = await this.trabajadorModel
      .findOne(filter)
      .exec();

    if (trabajadorExistente) {
      throw new BadRequestException(
        `El número de empleado ${numeroEmpleado} ya está registrado`,
      );
    }
  }

  async fusionarTrabajadores(
    params: {
      trabajadorDestinoId: string;
      trabajadorFuenteId: string;
      userId: string;
      idEmpresa: string;
      confirmacion: boolean;
      numeroEmpleadoResuelto?: string;
      migrarArchivos?: boolean;
      legacyAutoFusion?: boolean;
    },
  ) {
    const proveedorSaludId =
      await this.getProveedorSaludIdFromCentroTrabajo(
        (
          await this.trabajadorModel
            .findById(params.trabajadorDestinoId)
            .select('idCentroTrabajo')
            .lean()
            .exec()
        )?.idCentroTrabajo?.toString() ?? '',
      );
    if (!proveedorSaludId) {
      throw new BadRequestException('No se pudo determinar el proveedor de salud');
    }
    return this.workerFusionService.fusionarTrabajadores({
      ...params,
      proveedorSaludId,
    });
  }
}
