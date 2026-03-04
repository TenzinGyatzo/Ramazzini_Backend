// Servicios para gestionar la data que se almacena en la base de datos
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
import { Lesion } from './schemas/lesion.schema';
import { Deteccion } from './schemas/deteccion.schema';
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
import { forwardRef, Inject } from '@nestjs/common';
import { mapSexoToNumeric } from '../../utils/sexo-mapper.util';
import { calculateAge } from '../../utils/age-calculator.util';
import {
  CIE10Entry,
  CatalogType,
} from '../catalogs/interfaces/catalog-entry.interface';
import { validateFechaDocumento } from './validators/date-validators';
import { validateNoDuplicateCIE10PrincipalAndComplementary } from './validators/diagnosis-duplicate.validator';
import { validateCie10SexAgeAgainstCatalog } from './validators/cie10-catalog-sex-age.validator';
import { Cie10CatalogLookupService } from './services/cie10-catalog-lookup.service';
import { ProveedoresSaludService } from '../proveedores-salud/proveedores-salud.service';
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';
import { createRegulatoryError } from '../../utils/regulatory-error-helper';
import { RegulatoryErrorCode } from '../../utils/regulatory-error-codes';
import { ConsentimientoDiario } from '../consentimiento-diario/schemas/consentimiento-diario.schema';
import { calculateDateKey } from '../../utils/date-key.util';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import { UsersService } from '../users/users.service';
import { hasCIE10Min4Chars } from '../../utils/cie10.util';
import { isCieAfeccionLesionAllowedRanges } from '../giis-export/utils/cie-lesion.utils';

@Injectable()
export class ExpedientesService {
  private readonly models: Record<string, Model<any>>;
  private readonly dateFields: Record<string, string>;

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
    @InjectModel(Lesion.name) private lesionModel: Model<Lesion>,
    @InjectModel(Deteccion.name) private deteccionModel: Model<Deteccion>,
    @InjectModel(CentroTrabajo.name)
    private centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(Empresa.name) private empresaModel: Model<Empresa>,
    @InjectModel(ConsentimientoDiario.name)
    private consentimientoDiarioModel: Model<ConsentimientoDiario>,
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
      lesion: this.lesionModel,
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
      lesion: 'fechaReporteLesion',
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

    // 3. Mapear sexo a numérico (1/2)
    const sexoBiologico = mapSexoToNumeric(trabajador.sexo);

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

      // Validar LSEX vs sexoBiologico (con excepción para intersexual=3)
      // LSEX en el catálogo: "NO" = ambos sexos, "SI" = restricción (típicamente masculino)
      // Nota: El formato exacto puede variar, pero "NO" siempre significa sin restricción
      if (sexoBiologico !== null && entry.lsex && entry.lsex !== 'NO') {
        // Si LSEX tiene un valor diferente de "NO", hay restricción de sexo
        // Por ahora, asumimos que "SI" indica restricción masculina
        // Si el paciente es mujer (2) y hay restricción, error
        if (entry.lsex === 'SI' && sexoBiologico === 2) {
          errors.push(
            `El código CIE-10 ${tipo} ${codigoNormalizado} no es aplicable para pacientes de sexo femenino (restricción LSEX)`,
          );
        }
        // Si el paciente es hombre (1) y LSEX = "SI", podría ser válido
        // Nota: La especificación menciona valores 0,1,2 pero el CSV usa "NO"/"SI"
        // Esta validación es una aproximación - puede necesitar ajuste según documentación oficial
      }

      // Validar LINF/LSUP vs edad
      if (edad !== null) {
        if (entry.linf !== undefined && edad < entry.linf) {
          errors.push(
            `El código CIE-10 ${tipo} ${codigoNormalizado} no es aplicable para pacientes menores de ${entry.linf} años. Edad del paciente: ${edad} años`,
          );
        }
        if (entry.lsup !== undefined && edad > entry.lsup) {
          errors.push(
            `El código CIE-10 ${tipo} ${codigoNormalizado} no es aplicable para pacientes mayores de ${entry.lsup} años. Edad del paciente: ${edad} años`,
          );
        }
      }

      // Validar RUBRICA_TYPE (excluir encabezados si aplica)
      // RUBRICA_TYPE puede indicar si es un encabezado no seleccionable
      // Por ahora, solo validamos si es necesario según la especificación

      // Validar diagnósticos exclusivos
      // Si código inicia con S/T (Cap. XIX) o V-Y (Cap. XX) → requerir causaExterna
      const primeraLetra = codigoNormalizado.charAt(0);
      if (
        (primeraLetra === 'S' ||
          primeraLetra === 'T' ||
          (primeraLetra >= 'V' && primeraLetra <= 'Y')) &&
        tipo === 'principal'
      ) {
        const codigoCausaFull = dto.codigoCIECausaExterna?.trim() || '';
        if (!codigoCausaFull) {
          errors.push(
            `El código CIE-10 ${codigoNormalizado} (Capítulo ${primeraLetra === 'S' || primeraLetra === 'T' ? 'XIX' : 'XX'}) requiere especificar una causa externa (codigoCIECausaExterna)`,
          );
        }
      }

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
      // Si el código está presente, validarlo (aplica a ambos tipos de documentos)
      await validateCIE10Code(codigoPrincipalFull, 'principal');
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

    // Validate segundo diagnóstico (codigoCIEDiagnostico2)
    // IMPORTANTE: Esta validación solo aplica a notas médicas
    if (documentType === 'notaMedica' && dto.primeraVezDiagnostico2 === 1) {
      const codigoDiagnostico2Full = dto.codigoCIEDiagnostico2?.trim() || '';
      if (!codigoDiagnostico2Full) {
        errors.push(
          'El código CIE-10 diagnóstico 2 es obligatorio cuando primeraVezDiagnostico2 es Sí (1)',
        );
      } else {
        // Validar que sea diferente al principal (comparar códigos extraídos)
        const codigoPrincipal = extractCodeFromFullText(codigoPrincipalFull);
        const codigoDiagnostico2 = extractCodeFromFullText(
          codigoDiagnostico2Full,
        );
        if (
          codigoPrincipal &&
          codigoPrincipal.toUpperCase() === codigoDiagnostico2.toUpperCase()
        ) {
          errors.push(
            'El código CIE-10 diagnóstico 2 debe ser diferente al código CIE-10 principal',
          );
        } else {
          await validateCIE10Code(codigoDiagnostico2Full, 'diagnostico2');
        }
      }
    }

    // Validate tercer diagnóstico (codigoCIEDiagnostico3)
    // IMPORTANTE: Esta validación solo aplica a notas médicas
    if (documentType === 'notaMedica' && dto.primeraVezDiagnostico3 === 1) {
      const codigoDiagnostico3Full = dto.codigoCIEDiagnostico3?.trim() || '';
      if (!codigoDiagnostico3Full) {
        errors.push(
          'El código CIE-10 diagnóstico 3 es obligatorio cuando primeraVezDiagnostico3 es Sí (1)',
        );
      } else {
        const codigoPrincipal = extractCodeFromFullText(codigoPrincipalFull);
        const codigoDiagnostico3 = extractCodeFromFullText(
          codigoDiagnostico3Full,
        );
        const codigoDiagnostico2 = extractCodeFromFullText(
          dto.codigoCIEDiagnostico2?.trim() || '',
        );
        const comp = dto.codigosCIE10Complementarios || [];
        const codigosComplementarios = comp
          .filter((c) => c && c.trim() !== '')
          .map((c) => extractCodeFromFullText(c.trim()).toUpperCase());
        const codigo3Upper = codigoDiagnostico3.toUpperCase();
        if (codigoPrincipal && codigoPrincipal.toUpperCase() === codigo3Upper) {
          errors.push(
            'El código CIE-10 diagnóstico 3 debe ser diferente al código CIE-10 principal',
          );
        } else if (
          codigoDiagnostico2 &&
          codigoDiagnostico2.toUpperCase() === codigo3Upper
        ) {
          errors.push(
            'El código CIE-10 diagnóstico 3 debe ser diferente al código CIE-10 diagnóstico 2',
          );
        } else if (codigosComplementarios.some((c) => c === codigo3Upper)) {
          errors.push(
            'El código CIE-10 diagnóstico 3 debe ser diferente a los diagnósticos complementarios',
          );
        } else {
          await validateCIE10Code(codigoDiagnostico3Full, 'diagnostico3');
        }
      }
    }

    // Validar causa externa si se proporciona
    if (dto.codigoCIECausaExterna && dto.codigoCIECausaExterna.trim() !== '') {
      const codigoCausaFull = dto.codigoCIECausaExterna.trim();
      const codigoCausa =
        extractCodeFromFullText(codigoCausaFull).toUpperCase();
      // Validar que esté en rango V01-Y98 (2 o 3 dígitos: W01, W013, etc.)
      if (!/^[V-Y][0-9]{2,3}(\.[0-9]{1,2})?$/.test(codigoCausa)) {
        errors.push(
          `El código CIE-10 causa externa ${codigoCausa} debe estar en el rango V01-Y98`,
        );
      } else {
        const isValid = await this.catalogsService.validateCIE10(codigoCausa);
        if (!isValid) {
          errors.push(
            `Código CIE-10 causa externa inválido: ${codigoCausa}. No se encuentra en el catálogo CIE-10`,
          );
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

    // Validación E1: fechaDocumento para notaMedica
    if (
      documentType === 'notaMedica' &&
      createDto.fechaNotaMedica &&
      createDto.idTrabajador
    ) {
      const trabajador = await this.trabajadorModel
        .findById(createDto.idTrabajador)
        .lean();

      if (trabajador?.fechaNacimiento) {
        validateFechaDocumento(
          createDto.fechaNotaMedica,
          trabajador.fechaNacimiento,
        );
      } else {
        // Si no hay fechaNacimiento, solo validar que no sea futura
        validateFechaDocumento(createDto.fechaNotaMedica);
      }
    }

    // Validación C3/C4: CIE-10 por sexo y edad para notaMedica
    if (documentType === 'notaMedica' && createDto.idTrabajador) {
      const trabajador = await this.trabajadorModel
        .findById(createDto.idTrabajador)
        .lean();

      if (trabajador && trabajador.sexo && trabajador.fechaNacimiento) {
        // Recolectar todos los códigos CIE-10 del DTO
        const cie10Fields = [
          {
            field: 'codigoCIE10Principal',
            value: createDto.codigoCIE10Principal,
          },
          {
            field: 'codigosCIE10Complementarios',
            value: createDto.codigosCIE10Complementarios || [],
          },
          {
            field: 'codigoCIEDiagnostico2',
            value: createDto.codigoCIEDiagnostico2,
          },
          {
            field: 'codigoCIEDiagnostico3',
            value: createDto.codigoCIEDiagnostico3,
          },
        ];

        // Validar restricciones de sexo y edad usando catálogo
        const validationResult = await validateCie10SexAgeAgainstCatalog({
          trabajadorSexo: trabajador.sexo,
          trabajadorFechaNacimiento: trabajador.fechaNacimiento,
          fechaNotaMedica: createDto.fechaNotaMedica,
          cie10Fields,
          lookup: this.cie10CatalogLookupService.findDiagnosisRule.bind(
            this.cie10CatalogLookupService,
          ),
        });

        // Si hay violaciones, lanzar error con formato especificado
        if (!validationResult.ok && validationResult.issues.length > 0) {
          throw new BadRequestException({
            code: 'VALIDATION_ERROR',
            ruleId: 'CIE10_SEX_AGE',
            message:
              'Uno o más diagnósticos CIE-10 no son válidos para el sexo o la edad del trabajador',
            details: validationResult.issues.map((issue) => ({
              field: issue.field,
              cie10: issue.cie10,
              catalogKeyUsed: issue.catalogKeyUsed,
              lsex: issue.lsex,
              linf: issue.linf,
              lsup: issue.lsup,
              sexoTrabajador: issue.sexoTrabajador,
              edadTrabajador: issue.edadTrabajador,
              reason: issue.reason,
            })),
          });
        }
      }
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

    // Lesion requiere lógica específica (idProveedorSalud, unicidad folio, validateLesionRules)
    if (documentType === 'lesion') {
      const savedLesion = await this.createLesion(createDto);
      await this.recordDocDraftCreated({
        documentType: 'lesion',
        documentId: savedLesion._id.toString(),
        trabajadorId: createDto.idTrabajador ?? null,
        actorId: createDto.createdBy,
        source: 'createDocument',
      });
      return savedLesion;
    }

    // Vincular Consentimiento Diario (NOM-024)
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
            // Obtener proveedor para calcular dateKey con timezone
            const proveedor =
              await this.proveedoresSaludService.findOne(proveedorSaludId);
            const dateKey = calculateDateKey(proveedor || null);

            // Buscar consentimiento del día
            const consentimiento = await this.consentimientoDiarioModel
              .findOne({
                proveedorSaludId: new Types.ObjectId(proveedorSaludId),
                trabajadorId: new Types.ObjectId(createDto.idTrabajador),
                dateKey,
              })
              .lean();

            if (consentimiento) {
              createDto.consentimientoDiarioId = consentimiento._id;
            }
          }
        }
      } catch (error) {
        // Si hay error al obtener consentimiento, no bloquear la creación
        // El guard ya validó que el consentimiento existe
        console.warn(
          'Error al obtener consentimiento diario para documento:',
          error,
        );
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
    const trabajadorId = updateDto.idTrabajador;

    if (!newFecha) {
      throw new BadRequestException(
        `El campo ${dateField} es requerido para este documento`,
      );
    }

    if (!trabajadorId) {
      throw new BadRequestException('El campo idTrabajador es requerido');
    }

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

    // Validación E1: fechaDocumento para notaMedica
    if (
      documentType === 'notaMedica' &&
      updateDto.fechaNotaMedica &&
      trabajadorId
    ) {
      const trabajador = await this.trabajadorModel
        .findById(trabajadorId)
        .lean();

      if (trabajador?.fechaNacimiento) {
        validateFechaDocumento(
          updateDto.fechaNotaMedica,
          trabajador.fechaNacimiento,
        );
      } else {
        validateFechaDocumento(updateDto.fechaNotaMedica);
      }
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

      // Validación C3/C4: CIE-10 por sexo y edad para notaMedica
      const trabajador = await this.trabajadorModel
        .findById(trabajadorId)
        .lean();

      if (trabajador && trabajador.sexo && trabajador.fechaNacimiento) {
        // Usar valores del updateDto si existen, sino del documento existente
        const finalCodigoPrincipal =
          updateDto.codigoCIE10Principal !== undefined
            ? updateDto.codigoCIE10Principal
            : existingDocument.codigoCIE10Principal;
        const finalCodigosComplementarios =
          updateDto.codigosCIE10Complementarios !== undefined
            ? updateDto.codigosCIE10Complementarios
            : existingDocument.codigosCIE10Complementarios;
        const finalCodigoDiagnostico2 =
          updateDto.codigoCIEDiagnostico2 !== undefined
            ? updateDto.codigoCIEDiagnostico2
            : existingDocument.codigoCIEDiagnostico2;
        const finalCodigoDiagnostico3 =
          updateDto.codigoCIEDiagnostico3 !== undefined
            ? updateDto.codigoCIEDiagnostico3
            : existingDocument.codigoCIEDiagnostico3;
        const finalFechaNotaMedica =
          updateDto.fechaNotaMedica !== undefined
            ? updateDto.fechaNotaMedica
            : existingDocument.fechaNotaMedica;

        // Recolectar todos los códigos CIE-10
        const cie10Fields = [
          {
            field: 'codigoCIE10Principal',
            value: finalCodigoPrincipal,
          },
          {
            field: 'codigosCIE10Complementarios',
            value: finalCodigosComplementarios || [],
          },
          {
            field: 'codigoCIEDiagnostico2',
            value: finalCodigoDiagnostico2,
          },
          {
            field: 'codigoCIEDiagnostico3',
            value: finalCodigoDiagnostico3,
          },
        ];

        // Validar restricciones de sexo y edad usando catálogo
        const validationResult = await validateCie10SexAgeAgainstCatalog({
          trabajadorSexo: trabajador.sexo,
          trabajadorFechaNacimiento: trabajador.fechaNacimiento,
          fechaNotaMedica: finalFechaNotaMedica,
          cie10Fields,
          lookup: this.cie10CatalogLookupService.findDiagnosisRule.bind(
            this.cie10CatalogLookupService,
          ),
        });

        // Si hay violaciones, lanzar error con formato especificado
        if (!validationResult.ok && validationResult.issues.length > 0) {
          throw new BadRequestException({
            code: 'VALIDATION_ERROR',
            ruleId: 'CIE10_SEX_AGE',
            message:
              'Uno o más diagnósticos CIE-10 no son válidos para el sexo o la edad del trabajador',
            details: validationResult.issues.map((issue) => ({
              field: issue.field,
              cie10: issue.cie10,
              catalogKeyUsed: issue.catalogKeyUsed,
              lsex: issue.lsex,
              linf: issue.linf,
              lsup: issue.lsup,
              sexoTrabajador: issue.sexoTrabajador,
              edadTrabajador: issue.edadTrabajador,
              reason: issue.reason,
            })),
          });
        }
      }
    }

    let result;
    if (newFecha.toISOString() !== oldFecha.toISOString()) {
      const newDocumentData = { ...updateDto };
      delete newDocumentData._id;

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
      let updatePayload: any = updateDto;
      if (documentType === 'notaMedica') {
        const unsetVitals: Record<string, 1> = {};
        updatePayload = { ...updateDto };
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

    const estadoAnterior = document.estado;
    const idTrabajador = (document as any).idTrabajador?.toString?.() ?? null;

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
      const rutaPdfGenerado =
        await this.informesService.regenerarInformeAlFinalizar(
          documentType,
          id,
          creadorId,
          userId, // finalizador
        );
      // Para lesión: guardar rutaPDF (directorio) si no existía
      if (
        documentType === 'lesion' &&
        rutaPdfGenerado &&
        !(document as any).rutaPDF
      ) {
        const rutaBase = path.dirname(rutaPdfGenerado);
        const base = path.resolve('.');
        const rutaRelativa = rutaBase.startsWith(base)
          ? path.relative(base, rutaBase).replace(/\\/g, '/')
          : rutaBase.replace(/\\/g, '/');
        await this.lesionModel.findByIdAndUpdate(id, {
          rutaPDF: rutaRelativa,
        });
      }
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

  /**
   * GIIS-B013: Validate Lesion-specific business rules
   *
   * Note: Official DGIS catalogs for SITIO_OCURRENCIA, AGENTE_LESION, AREA_ANATOMICA,
   * and CONSECUENCIA are not publicly available. We validate only:
   * - Integer type
   * - Basic bounds (>= 0 or >= 1)
   * - Requiredness based on intencionalidad
   * - Format validation (no strict catalog enumeration)
   */
  private async validateLesionRules(
    lesionDto: any,
    trabajadorId: string,
  ): Promise<void> {
    const errors: string[] = [];

    // 1. Check MX provider requirement
    const proveedorSaludId =
      await this.getProveedorSaludIdFromTrabajador(trabajadorId);
    if (!proveedorSaludId) {
      errors.push('No se pudo determinar el proveedor de salud del trabajador');
    } else {
      const requiresCompliance =
        await this.nom024Util.requiresNOM024Compliance(proveedorSaludId);
      if (!requiresCompliance) {
        errors.push(
          'Los registros de lesiones (GIIS-B013) solo están disponibles para proveedores en México',
        );
      }
    }

    // 2. Validate temporal sequence: fechaNacimiento <= fechaEvento <= fechaAtencion <= fechaActual
    const trabajador = await this.trabajadorModel
      .findById(trabajadorId)
      .select('fechaNacimiento sexo')
      .lean();
    if (!trabajador?.fechaNacimiento) {
      errors.push('No se encontró la fecha de nacimiento del trabajador');
    }
    const fechaNacimiento = trabajador?.fechaNacimiento
      ? new Date(trabajador.fechaNacimiento)
      : null;
    const fechaEvento = new Date(lesionDto.fechaEvento);
    const fechaAtencion = new Date(lesionDto.fechaAtencion);
    const fechaActual = new Date();

    if (fechaNacimiento && fechaEvento < fechaNacimiento) {
      errors.push(
        'La fecha del evento no puede ser anterior a la fecha de nacimiento',
      );
    }

    if (fechaAtencion < fechaEvento) {
      errors.push(
        'La fecha de atención no puede ser anterior a la fecha del evento',
      );
    }

    if (fechaAtencion > fechaActual) {
      errors.push('La fecha de atención no puede ser futura');
    }

    // If same day, validate hour sequence (only when both are real times, not 99:99 SE DESCONOCE)
    const esSeDesconoce = (h: string) => h === '99:99' || !h?.trim();
    if (
      lesionDto.horaEvento &&
      lesionDto.horaAtencion &&
      !esSeDesconoce(lesionDto.horaEvento) &&
      !esSeDesconoce(lesionDto.horaAtencion) &&
      fechaEvento.toDateString() === fechaAtencion.toDateString()
    ) {
      const horaEvento = lesionDto.horaEvento.split(':').map(Number);
      const horaAtencion = lesionDto.horaAtencion.split(':').map(Number);
      const minutosEvento = horaEvento[0] * 60 + horaEvento[1];
      const minutosAtencion = horaAtencion[0] * 60 + horaAtencion[1];

      if (minutosAtencion <= minutosEvento) {
        errors.push(
          'La hora de atención debe ser posterior a la hora del evento cuando ocurren el mismo día',
        );
      }
    }

    // 3. Validate age (should be < 100 years)
    if (fechaNacimiento) {
      const edad = fechaActual.getFullYear() - fechaNacimiento.getFullYear();
      if (edad >= 100) {
        errors.push('La edad calculada debe ser menor a 100 años');
      }
    }

    // 4. Basic numeric validation for catalog fields (without strict catalog enumeration)
    // Official DGIS catalogs not publicly available - validate only type and basic bounds
    // cat_sitio_ocurrencia includes 0=VIVIENDA, so sitioOcurrencia >= 0
    if (lesionDto.sitioOcurrencia !== undefined) {
      const val = Number(lesionDto.sitioOcurrencia);
      if (!Number.isInteger(val) || val < 0) {
        errors.push(
          'Sitio de ocurrencia debe ser un número entero mayor o igual a 0',
        );
      } else {
        lesionDto.sitioOcurrencia = val;
      }
    }

    if (lesionDto.areaAnatomica !== undefined) {
      if (
        !Number.isInteger(lesionDto.areaAnatomica) ||
        lesionDto.areaAnatomica < 1
      ) {
        errors.push(
          'Área anatómica debe ser un número entero mayor o igual a 1',
        );
      }
    }

    if (lesionDto.consecuenciaGravedad !== undefined) {
      if (
        !Number.isInteger(lesionDto.consecuenciaGravedad) ||
        lesionDto.consecuenciaGravedad < 1
      ) {
        errors.push(
          'Consecuencia/gravedad debe ser un número entero mayor o igual a 1',
        );
      }
    }

    // 5. Conditional validation based on intencionalidad
    if (lesionDto.intencionalidad === 1 || lesionDto.intencionalidad === 4) {
      // Accidental (1) or Self-inflicted (4): agenteLesion is required
      if (!lesionDto.agenteLesion) {
        errors.push(
          'Agente de lesión es obligatorio para eventos accidentales o autoinfligidos',
        );
      } else if (
        !Number.isInteger(lesionDto.agenteLesion) ||
        lesionDto.agenteLesion < 1
      ) {
        errors.push(
          'Agente de lesión debe ser un número entero mayor o igual a 1',
        );
      }
    }

    if (lesionDto.intencionalidad === 2 || lesionDto.intencionalidad === 3) {
      // Violence (2 or 3): tipoViolencia is required
      if (!lesionDto.tipoViolencia || lesionDto.tipoViolencia.length === 0) {
        errors.push(
          'Tipo de violencia es obligatorio para eventos de violencia',
        );
      } else {
        // Validate array elements are integers >= 1
        const invalidTipos = lesionDto.tipoViolencia.filter(
          (tipo: any) => !Number.isInteger(tipo) || tipo < 1,
        );
        if (invalidTipos.length > 0) {
          errors.push(
            'Cada tipo de violencia debe ser un número entero mayor o igual a 1',
          );
        }
      }
    }

    // Validate tipoAtencion array elements
    if (lesionDto.tipoAtencion && lesionDto.tipoAtencion.length > 0) {
      const invalidTipos = lesionDto.tipoAtencion.filter(
        (tipo: any) => !Number.isInteger(tipo) || tipo < 1,
      );
      if (invalidTipos.length > 0) {
        errors.push(
          'Cada tipo de atención debe ser un número entero mayor o igual a 1',
        );
      }
    }

    // 6. Validate CIE-10 codes (use GIIS catalog for lesion)
    // Siempre requiere 4+ caracteres (solo4Caracteres en selector). Rangos permitidos sin catálogo: F00-F99, Cap XIX (S00-T98), O04-O07, O20, O26.7, O42.9, O46.8-O46.9, O68, O71.0-O71.9
    if (lesionDto.codigoCIEAfeccionPrincipal) {
      const codePrincipal = lesionDto.codigoCIEAfeccionPrincipal.trim();
      if (!hasCIE10Min4Chars(codePrincipal)) {
        errors.push(
          'Código CIE-10 afección principal debe tener al menos 4 caracteres (ej. S00.0, F41.9, S097)',
        );
      } else {
        const inAllowedRanges = isCieAfeccionLesionAllowedRanges(codePrincipal);
        if (!inAllowedRanges) {
          const isValidPrincipal =
            await this.catalogsService.validateCIE10GIIS(codePrincipal);
          if (!isValidPrincipal) {
            errors.push(
              `Código CIE-10 afección principal inválido: ${codePrincipal}`,
            );
          }
        }
      }
    }

    if (lesionDto.codigoCIECausaExterna) {
      if (
        !/^[V-Y][0-9]{2,3}(\.[0-9]{1,2})?$/i.test(
          lesionDto.codigoCIECausaExterna.trim(),
        )
      ) {
        errors.push(
          'Código CIE-10 causa externa debe ser del Capítulo XX (V01-Y98)',
        );
      } else {
        const isValidExterna = await this.catalogsService.validateCIE10GIIS(
          lesionDto.codigoCIECausaExterna,
        );
        if (!isValidExterna) {
          errors.push(
            `Código CIE-10 causa externa inválido: ${lesionDto.codigoCIECausaExterna}`,
          );
        }
      }
    }

    if (lesionDto.afeccionPrincipalReseleccionada) {
      const codeReselect = lesionDto.afeccionPrincipalReseleccionada.trim();
      if (!hasCIE10Min4Chars(codeReselect)) {
        errors.push(
          'Código CIE-10 afección reseleccionada debe tener al menos 4 caracteres',
        );
      } else {
        const inAllowedReselect =
          isCieAfeccionLesionAllowedRanges(codeReselect);
        if (!inAllowedReselect) {
          const isValidReselect =
            await this.catalogsService.validateCIE10GIIS(codeReselect);
          if (!isValidReselect) {
            errors.push(
              `Código CIE-10 afección reseleccionada inválido: ${codeReselect}`,
            );
          }
        }
      }
    }

    if (
      lesionDto.afeccionesTratadas &&
      Array.isArray(lesionDto.afeccionesTratadas)
    ) {
      for (let i = 0; i < lesionDto.afeccionesTratadas.length; i++) {
        const item = lesionDto.afeccionesTratadas[i];
        if (typeof item !== 'string' || !item) continue;
        const parts = item.split('#');
        const cieCode = parts.length >= 3 ? parts[2]?.trim() : undefined;
        if (cieCode) {
          if (!hasCIE10Min4Chars(cieCode)) {
            errors.push(
              `Código CIE en afección tratada ${i + 1} debe tener al menos 4 caracteres`,
            );
          } else {
            const inAllowed = isCieAfeccionLesionAllowedRanges(cieCode);
            if (!inAllowed) {
              const isValid =
                await this.catalogsService.validateCIE10GIIS(cieCode);
              if (!isValid) {
                errors.push(
                  `Código CIE inválido en afección tratada ${i + 1}: ${cieCode}`,
                );
              }
            }
          }
        }
      }
    }

    // 7. Validate LSEX/LINF/LSUP (sex and age) against GIIS catalog for CIE codes
    if (trabajador?.fechaNacimiento && trabajador?.sexo) {
      const cie10Fields: Array<{ field: string; value: string | string[] }> =
        [];
      if (lesionDto.codigoCIEAfeccionPrincipal) {
        cie10Fields.push({
          field: 'codigoCIEAfeccionPrincipal',
          value: lesionDto.codigoCIEAfeccionPrincipal.trim(),
        });
      }
      if (lesionDto.afeccionPrincipalReseleccionada) {
        cie10Fields.push({
          field: 'afeccionPrincipalReseleccionada',
          value: lesionDto.afeccionPrincipalReseleccionada.trim(),
        });
      }
      if (
        lesionDto.afeccionesTratadas &&
        Array.isArray(lesionDto.afeccionesTratadas)
      ) {
        const codes: string[] = [];
        for (const item of lesionDto.afeccionesTratadas) {
          if (typeof item === 'string' && item) {
            const parts = item.split('#');
            const cieCode = parts.length >= 3 ? parts[2]?.trim() : undefined;
            if (cieCode) codes.push(cieCode);
          }
        }
        if (codes.length > 0) {
          cie10Fields.push({ field: 'afeccionesTratadas', value: codes });
        }
      }
      if (cie10Fields.length > 0) {
        const validationResult = await validateCie10SexAgeAgainstCatalog({
          trabajadorSexo: trabajador.sexo,
          trabajadorFechaNacimiento: new Date(trabajador.fechaNacimiento),
          fechaNotaMedica: fechaAtencion,
          cie10Fields,
          lookup: this.cie10CatalogLookupService.findDiagnosisRuleGIIS.bind(
            this.cie10CatalogLookupService,
          ),
        });
        if (!validationResult.ok && validationResult.issues.length > 0) {
          for (const issue of validationResult.issues) {
            const reason =
              issue.reason === 'Sexo no permitido'
                ? `sexo del trabajador (${issue.sexoTrabajador}) no permitido por catálogo (LSEX: ${issue.lsex})`
                : `edad (${issue.edadTrabajador} años) fuera de rango del catálogo (LINF: ${issue.linf ?? 'NO'}, LSUP: ${issue.lsup ?? 'NO'})`;
            errors.push(`CIE-10 ${issue.cie10} en ${issue.field}: ${reason}`);
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }
  }

  /**
   * GIIS-B013: Create Lesion record
   * CLUES se obtiene de ProveedorSalud cuando se requiere; unicidad por idProveedorSalud + fechaAtencion + folio
   */
  async createLesion(createDto: any): Promise<any> {
    await this.validateLesionRules(createDto, createDto.idTrabajador);

    const proveedorSaludId = await this.getProveedorSaludIdFromTrabajador(
      createDto.idTrabajador,
    );
    if (!proveedorSaludId) {
      throw new BadRequestException(
        'No se pudo determinar el proveedor de salud del trabajador',
      );
    }

    // Vincular Consentimiento Diario (NOM-024) cuando dailyConsentEnabled
    let consentimientoDiarioId: Types.ObjectId | undefined;
    try {
      const policy =
        await this.regulatoryPolicyService.getRegulatoryPolicy(
          proveedorSaludId,
        );
      if (policy.features.dailyConsentEnabled) {
        const proveedor =
          await this.proveedoresSaludService.findOne(proveedorSaludId);
        const dateKey = calculateDateKey(proveedor || null);
        const consentimiento = await this.consentimientoDiarioModel
          .findOne({
            proveedorSaludId: new Types.ObjectId(proveedorSaludId),
            trabajadorId: new Types.ObjectId(createDto.idTrabajador),
            dateKey,
          })
          .lean();
        if (consentimiento)
          consentimientoDiarioId = new Types.ObjectId(
            consentimiento._id.toString(),
          );
      }
    } catch (error) {
      console.warn(
        'Error al obtener consentimiento diario para lesión:',
        error,
      );
    }

    const fechaAtencion = new Date(createDto.fechaAtencion);
    const fechaAtencionOnly = new Date(
      fechaAtencion.getFullYear(),
      fechaAtencion.getMonth(),
      fechaAtencion.getDate(),
    );
    const endOfDay = new Date(
      fechaAtencionOnly.getTime() + 24 * 60 * 60 * 1000,
    );

    const clues = await this.getCluesFromProveedorSalud(createDto.idTrabajador);
    const folioScopeId = clues ?? proveedorSaludId;

    const count = await this.lesionModel
      .countDocuments({
        folioScopeId,
        fechaAtencion: {
          $gte: fechaAtencionOnly,
          $lt: endOfDay,
        },
      })
      .exec();

    const nextNum = count + 1;
    if (nextNum > 99999999) {
      throw new BadRequestException(
        'Límite de folios alcanzado para esta CLUES en la fecha indicada',
      );
    }
    const folio = String(nextNum).padStart(8, '0').slice(-8);

    const { folio: _folio, ...restDto } = createDto;
    const lesionData = {
      ...restDto,
      idProveedorSalud: proveedorSaludId,
      folioScopeId,
      folio,
      ...(consentimientoDiarioId && { consentimientoDiarioId }),
    };
    const createdLesion = new this.lesionModel(lesionData);
    const savedLesion = await createdLesion.save();

    if (createDto.idTrabajador) {
      await this.actualizarUpdatedAtTrabajador(createDto.idTrabajador);
    }

    return savedLesion;
  }

  /**
   * GIIS-B013: Update Lesion record
   */
  async updateLesion(id: string, updateDto: any): Promise<any> {
    const existingLesion = await this.lesionModel.findById(id).exec();

    if (!existingLesion) {
      throw new BadRequestException(`Lesión con ID ${id} no encontrada`);
    }

    // Check immutability based on regulatory policy
    const proveedorSaludId =
      await this.getProveedorSaludIdFromDocument(existingLesion);
    if (proveedorSaludId) {
      const policy =
        await this.regulatoryPolicyService.getRegulatoryPolicy(
          proveedorSaludId,
        );
      const isImmutable = await this.isDocumentImmutable(
        proveedorSaludId,
        existingLesion.estado,
      );
      if (isImmutable) {
        throw createRegulatoryError({
          errorCode: RegulatoryErrorCode.REGIMEN_DOCUMENT_IMMUTABLE,
          details: {
            documentState: existingLesion.estado,
            documentType: 'lesion',
          },
          regime: policy.regime,
        });
      }
    }

    const mergedDto = {
      ...existingLesion.toObject(),
      ...updateDto,
    };

    await this.validateLesionRules(
      mergedDto,
      mergedDto.idTrabajador.toString(),
    );

    // Check folio uniqueness if changed (por folioScopeId + fechaAtencion + folio)
    if (updateDto.folio || updateDto.fechaAtencion) {
      const finalFolioScopeId =
        (existingLesion as any).folioScopeId ||
        (await (async () => {
          const psId =
            existingLesion.idProveedorSalud?.toString() ||
            (await this.getProveedorSaludIdFromTrabajador(
              (existingLesion.idTrabajador as any)?.toString(),
            ));
          if (!psId) return null;
          const c = await this.getCluesFromProveedorSalud(
            (existingLesion.idTrabajador as any)?.toString(),
          );
          return c ?? psId;
        })());
      const finalFechaAtencion = updateDto.fechaAtencion
        ? new Date(updateDto.fechaAtencion)
        : existingLesion.fechaAtencion;
      const finalFolio = updateDto.folio || existingLesion.folio;

      if (finalFolioScopeId) {
        const fechaAtencionOnly = new Date(
          finalFechaAtencion.getFullYear(),
          finalFechaAtencion.getMonth(),
          finalFechaAtencion.getDate(),
        );

        const existingLesionWithFolio = await this.lesionModel
          .findOne({
            _id: { $ne: id },
            folioScopeId: finalFolioScopeId,
            fechaAtencion: {
              $gte: fechaAtencionOnly,
              $lt: new Date(fechaAtencionOnly.getTime() + 24 * 60 * 60 * 1000),
            },
            folio: finalFolio,
          })
          .exec();

        if (existingLesionWithFolio) {
          const cluesLabel = /^[A-Z0-9]{11}$/.test(finalFolioScopeId)
            ? finalFolioScopeId
            : 'N/A';
          throw new BadRequestException(
            `Ya existe otro registro de lesión con el folio ${finalFolio} para el establecimiento (CLUES ${cluesLabel}) en la fecha ${fechaAtencionOnly.toISOString().split('T')[0]}`,
          );
        }
      }
    }

    const { folioScopeId: _skip, ...updatePayload } = updateDto as any;
    const updatedLesion = await this.lesionModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .exec();

    if (updateDto.idTrabajador || existingLesion.idTrabajador) {
      await this.actualizarUpdatedAtTrabajador(
        (updateDto.idTrabajador || existingLesion.idTrabajador).toString(),
      );
    }

    return updatedLesion;
  }

  /**
   * GIIS-B013: Find Lesion by ID
   */
  async findLesion(id: string): Promise<any> {
    return this.lesionModel.findById(id).exec();
  }

  /**
   * GIIS-B013: Find all Lesions for a trabajador
   */
  async findLesionesByTrabajador(trabajadorId: string): Promise<any[]> {
    return this.lesionModel
      .find({ idTrabajador: trabajadorId })
      .sort({ fechaAtencion: -1 })
      .exec();
  }

  /**
   * GIIS-B013: Delete Lesion
   */
  async deleteLesion(
    id: string,
    userId?: string,
    razonAnulacion?: string,
  ): Promise<{ deleted: boolean; anulado?: boolean }> {
    const lesion = await this.lesionModel.findById(id).exec();
    if (!lesion) {
      throw new BadRequestException(`Lesión con ID ${id} no encontrada`);
    }

    // Obtener política regulatoria para verificar inmutabilidad
    const proveedorSaludId = await this.getProveedorSaludIdFromDocument(lesion);
    let isImmutable = false;
    if (proveedorSaludId) {
      isImmutable = await this.isDocumentImmutable(
        proveedorSaludId,
        lesion.estado,
      );
    }

    if (lesion.estado === DocumentoEstado.FINALIZADO && isImmutable) {
      if (!userId || !razonAnulacion) {
        throw new BadRequestException(
          'Se requiere userId y razonAnulacion para anular una lesión finalizada',
        );
      }
      lesion.estado = DocumentoEstado.ANULADO;
      lesion.fechaAnulacion = new Date();
      lesion.anuladoPor = userId as any;
      lesion.razonAnulacion = razonAnulacion;
      await lesion.save();
      if (lesion.idTrabajador) {
        await this.actualizarUpdatedAtTrabajador(
          lesion.idTrabajador.toString(),
        );
      }
      await this.recordDocAnulated({
        documentType: 'lesion',
        documentId: lesion._id.toString(),
        trabajadorId: lesion.idTrabajador?.toString?.() ?? null,
        actorId: userId,
        estadoAnterior: DocumentoEstado.FINALIZADO,
        razonAnulacion,
        fechaAnulacion: lesion.fechaAnulacion ?? null,
      });
      return { deleted: false, anulado: true };
    }

    await this.lesionModel.findByIdAndDelete(id).exec();
    return { deleted: true, anulado: false };
  }

  /**
   * GIIS-B013: Finalize Lesion
   */
  async finalizarLesion(id: string, userId: string): Promise<any> {
    const lesion = await this.lesionModel.findById(id).exec();

    if (!lesion) {
      throw new BadRequestException(`Lesión con ID ${id} no encontrada`);
    }

    if (lesion.estado === DocumentoEstado.FINALIZADO) {
      throw new BadRequestException('La lesión ya está finalizada');
    }

    if (lesion.estado === DocumentoEstado.ANULADO) {
      throw new BadRequestException('No se puede finalizar una lesión anulada');
    }

    lesion.estado = DocumentoEstado.FINALIZADO;
    lesion.fechaFinalizacion = new Date();
    lesion.finalizadoPor = userId as any; // User ObjectId reference

    const savedLesion = await lesion.save();

    if (lesion.idTrabajador) {
      await this.actualizarUpdatedAtTrabajador(lesion.idTrabajador.toString());
    }

    // Populate finalizadoPor before returning
    await savedLesion.populate('finalizadoPor', 'username');

    return savedLesion;
  }

  async uploadDocument(createDto: any): Promise<any> {
    const model = this.models['documentoExterno'];

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
    const model = this.models[documentType];
    if (!model) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }
    const query = model
      .find({ idTrabajador: trabajadorId })
      .populate('createdBy', '_id username role')
      .populate('finalizadoPor', 'username')
      .populate('anuladoPor', 'username');

    // documentoExterno no tiene consentimientoDiarioId en su schema
    if (documentType !== 'documentoExterno') {
      query.populate({
        path: 'consentimientoDiarioId',
        select: '_id acceptedAt consentMethod acceptedByUserId',
        populate: {
          path: 'acceptedByUserId',
          select: 'username nombre',
        },
      });
    }

    const docs = await query.exec();

    // Enriquecer lesiones con rutaPDF cuando falte (para vincular con PDFs existentes)
    if (documentType === 'lesion') {
      return this.enriquecerLesionesConRutaPDF(docs, trabajadorId);
    }

    return docs;
  }

  /**
   * Añade rutaPDF a lesiones que no lo tienen, usando la misma lógica que getInformeLesion.
   * Permite que DocumentoItem visualice PDFs ya generados en disco.
   */
  private async enriquecerLesionesConRutaPDF(
    lesiones: any[],
    trabajadorId: string,
  ): Promise<any[]> {
    const needEnrichment = lesiones.some((l) => !l.rutaPDF);
    if (!needEnrichment || lesiones.length === 0) return lesiones;

    try {
      const trabajador = await this.trabajadorModel
        .findById(trabajadorId)
        .populate('idCentroTrabajo')
        .lean()
        .exec();
      if (!trabajador) return lesiones;

      const centro = (trabajador as any).idCentroTrabajo;
      const centroId = centro?._id ?? centro;
      const centroDoc = centroId
        ? await this.centroTrabajoModel.findById(centroId).lean().exec()
        : null;
      const empresaId = centroDoc?.idEmpresa ?? (centro as any)?.idEmpresa;
      const empresa = empresaId
        ? await this.empresaModel.findById(empresaId).lean().exec()
        : null;

      const nombreEmpresa = (empresa as any)?.nombreComercial ?? 'SinEmpresa';
      const nombreCentro =
        (centroDoc as any)?.nombreCentro ??
        (centro as any)?.nombreCentro ??
        'SinCentro';
      const trabajadorNombre = [
        (trabajador as any).primerApellido ?? '',
        (trabajador as any).segundoApellido ?? '',
        (trabajador as any).nombre ?? '',
      ]
        .join(' ')
        .trim();
      const rutaBase = `expedientes-medicos/${nombreEmpresa}/${nombreCentro}/${trabajadorNombre}_${trabajadorId}`;

      return lesiones.map((lesion) => {
        const plain = lesion.toObject ? lesion.toObject() : { ...lesion };
        if (!plain.rutaPDF) {
          plain.rutaPDF = rutaBase;
        }
        return plain;
      });
    } catch (err) {
      console.warn('Error al enriquecer lesiones con rutaPDF:', err);
      return lesiones.map((l) => (l.toObject ? l.toObject() : l));
    }
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
      .populate('finalizadoPor', 'username')
      .populate('anuladoPor', 'username');

    if (documentType !== 'documentoExterno') {
      query.populate({
        path: 'consentimientoDiarioId',
        select: '_id acceptedAt consentMethod acceptedByUserId',
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
    userId?: string,
    razonAnulacion?: string,
  ): Promise<{ deleted: boolean; anulado?: boolean }> {
    // console.log(`[DEBUG] Inicio de removeDocument - documentType: ${documentType}, id: ${id}`);
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

    // Si se proporciona razonAnulacion, significa que se está intentando anular (soft delete)
    // Esto solo aplica para documentos finalizados
    if (razonAnulacion && document.estado === DocumentoEstado.FINALIZADO) {
      if (!userId) {
        throw new BadRequestException(
          'Se requiere userId para anular un documento finalizado',
        );
      }

      // Aplicar soft delete (anulación) independientemente de si es MX o no
      // para mantener consistencia cuando se usa el modal de anulación
      document.estado = DocumentoEstado.ANULADO;
      document.fechaAnulacion = new Date();
      document.anuladoPor = userId;
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
        actorId: userId,
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
    try {
      // 1. Buscar en exploración física (más reciente)
      const exploracionFisica = await this.exploracionFisicaModel
        .findOne({ idTrabajador: trabajadorId })
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
        .findOne({ idTrabajador: trabajadorId })
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
    try {
      const historiaClinica = await this.historiaClinicaModel
        .findOne({ idTrabajador: trabajadorId })
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
    return this.deteccionModel
      .find({ idTrabajador: trabajadorId })
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
