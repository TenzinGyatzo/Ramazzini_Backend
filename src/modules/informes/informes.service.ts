// Servicios para la generación de informes en PDF
import {
  BadRequestException,
  Injectable,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { PrinterService } from '../printer/printer.service';
import { antidopingInforme } from './documents/antidoping.informe';
import { certificadoInforme } from './documents/certificado.informe';
import { certificadoExpeditoInforme } from './documents/certificado-expedito.informe';
import { aptitudPuestoInforme } from './documents/aptitud-puesto.informe';
import { audiometriaInforme } from './documents/audiometria.informe';
import { examenVistaInforme } from './documents/examen-vista.informe';
import { exploracionFisicaInforme } from './documents/exploracion-fisica.informe';
import { historiaClinicaInforme } from './documents/historia-clinica.informe';
import { notaMedicaInforme } from './documents/nota-medica.informe';
import { notaAclaratoriaInforme } from './documents/nota-aclaratoria.informe';
import { controlPrenatalInforme } from './documents/control-prenatal.informe';
import { historiaOtologicaInforme } from './documents/historia-otologica.informe';
import { previoEspirometriaInforme } from './documents/previo-espirometria.informe';
import { constanciaAptitudInforme } from './documents/constancia-aptitud.informe';
import { recetaInforme } from './documents/receta.informe';
import { entrevistaPsicologicaInforme } from './documents/entrevista-psicologica.informe';
import { trastornoLimitePersonalidadInforme } from './documents/tratorno-limite-personalidad.informe';
import { cuestionarioProdromalBreveInforme } from './documents/cuestionario-prodromal-breve.informe';
import { trastornosEstadoAnimoInforme } from './documents/trastornos-estado-animo.informe';
import { dashboardInforme } from './documents/dashboard.informe';
import { eventoSeguimientoCardiometabolicoInforme } from './documents/evento-seguimiento-cardiometabolico.informe';
import { informeLongitudinalCardiometabolicoInforme } from './documents/informe-longitudinal-cardiometabolico.informe';
import { EmpresasService } from '../empresas/empresas.service';
import { TrabajadoresService } from '../trabajadores/trabajadores.service';
import { ExpedientesService } from '../expedientes/expedientes.service';
import { FilesService } from '../files/files.service';
import {
  convertirFechaADDMMAAAA,
  convertirFechaAAAAAMMDD,
  calcularEdad,
  calcularAntiguedad,
} from 'src/utils/dates';
import { findNearestDocument } from 'src/utils/findNearestDocuments';
import { findNearestDocumentSameYear } from 'src/utils/findNearestDocumentSameYear';
import {
  resumenTablaEntrevistaPsicologica,
  resumenTablaTrastornosEstadoAnimo,
  resumenTablaCuestionarioProdromalBreve,
  resumenTablaTrastornoLimitePersonalidad,
} from 'src/utils/aptitud-informe-psicologia-resumenes';
import * as path from 'path';
import * as fs from 'fs';
import { UsersService } from '../users/users.service';
import { MedicosFirmantesService } from '../medicos-firmantes/medicos-firmantes.service';
import { EnfermerasFirmantesService } from '../enfermeras-firmantes/enfermeras-firmantes.service';
import { TecnicosFirmantesService } from '../tecnicos-firmantes/tecnicos-firmantes.service';
import { ProveedoresSaludService } from '../proveedores-salud/proveedores-salud.service';
import {
  FirmanteData,
  FooterFirmantesData,
} from './interfaces/firmante-data.interface';
import { CentrosTrabajoService } from '../centros-trabajo/centros-trabajo.service';
import { CatalogsService } from '../catalogs/catalogs.service';
import { DocumentoEstado } from '../expedientes/enums/documento-estado.enum';
import { ResultadosClinicosService } from '../resultados-clinicos/resultados-clinicos.service';
import { FirmanteHelper } from '../expedientes/helpers/firmante-helper';
import { computeMuestraConfirmacionFlagsForNotaMedica } from './helpers/nota-medica-confirmacion.helper';
import {
  EnfermeraFirmanteInforme,
  MedicoFirmanteInforme,
  TecnicoFirmanteInforme,
} from './types/firmante-informe.types';
import { ProveedorInformeResolver } from './helpers/proveedor-informe.resolver';
import { ResolveProveedorInformeResult } from './types/proveedor-informe.types';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
@Injectable()
export class InformesService {
  // Mapeo de tipos de documentos técnicos a nombres legibles
  private readonly documentoNombres: Record<string, string> = {
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
    eventoSeguimientoCardiometabolico: 'Evento de Seguimiento Cardiometabólico',
    informeLongitudinalCardiometabolico:
      'Informe Longitudinal Cardiometabólico',
    documentoExterno: 'Documento Externo',
    // Tipos plurales (para compatibilidad con frontend)
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
  };

  constructor(
    private readonly printer: PrinterService,
    private readonly empresasService: EmpresasService,
    private readonly trabajadoresService: TrabajadoresService,
    @Inject(forwardRef(() => ExpedientesService))
    private readonly expedientesService: ExpedientesService,
    private readonly filesService: FilesService,
    private readonly usersService: UsersService,
    private readonly medicosFirmantesService: MedicosFirmantesService,
    private readonly enfermerasFirmantesService: EnfermerasFirmantesService,
    private readonly proveedoresSaludService: ProveedoresSaludService,
    private readonly tecnicosFirmantesService: TecnicosFirmantesService,
    private readonly centrosTrabajoService: CentrosTrabajoService,
    private readonly catalogsService: CatalogsService,
    private readonly resultadosClinicosService: ResultadosClinicosService,
    private readonly firmanteHelper: FirmanteHelper,
    private readonly proveedorInformeResolver: ProveedorInformeResolver,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  private async recordDelegatedPdfRegenerationIfNeeded(
    proveedorInforme: ResolveProveedorInformeResult,
    actorUserId: string,
    documentType: string,
    documentId: string,
  ): Promise<void> {
    if (!proveedorInforme.delegated || !proveedorInforme.proveedorBrandingId) {
      return;
    }

    await this.auditService.record({
      proveedorSaludId: proveedorInforme.proveedorBrandingId,
      actorId: actorUserId,
      actionType: AuditActionType.EXPEDIENTE_PDF_REGENERADO_DELEGADO,
      resourceType: documentType,
      resourceId: documentId,
      payload: {
        colaboracionId: proveedorInforme.colaboracionId,
        proveedorBrandingId: proveedorInforme.proveedorBrandingId,
        trabajadorContext: true,
      },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });
  }

  private mapMedicoFirmante(
    medicoFirmante: {
      nombre?: string;
      primerApellido?: string;
      segundoApellido?: string;
      tituloProfesional?: string;
      universidad?: string;
      numeroCedulaProfesional?: string;
      especialistaSaludTrabajo?: string;
      numeroCedulaEspecialista?: string;
      nombreCredencialAdicional?: string;
      numeroCredencialAdicional?: string;
      nombreCredencialAdicional2?: string;
      numeroCredencialAdicional2?: string;
      firma?: { data: string; contentType: string } | null;
      [key: string]: any;
    } | null,
  ): MedicoFirmanteInforme {
    if (!medicoFirmante) {
      return {
        nombre: '',
        primerApellido: '',
        segundoApellido: '',
        tituloProfesional: '',
        universidad: '',
        numeroCedulaProfesional: '',
        especialistaSaludTrabajo: '',
        numeroCedulaEspecialista: '',
        nombreCredencialAdicional: '',
        numeroCredencialAdicional: '',
        nombreCredencialAdicional2: '',
        numeroCredencialAdicional2: '',
        firma: null,
      };
    }

    return {
      nombre: medicoFirmante.nombre || '',
      primerApellido: medicoFirmante.primerApellido || '',
      segundoApellido: medicoFirmante.segundoApellido || '',
      tituloProfesional: medicoFirmante.tituloProfesional || '',
      universidad: medicoFirmante.universidad || '',
      numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional || '',
      especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo || '',
      numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista || '',
      nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional || '',
      numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional || '',
      nombreCredencialAdicional2:
        medicoFirmante.nombreCredencialAdicional2 || '',
      numeroCredencialAdicional2:
        medicoFirmante.numeroCredencialAdicional2 || '',
      firma: medicoFirmante.firma || null,
    };
  }

  /**
   * Obtiene el nombre amigable de un tipo de documento
   */
  private getNombreDocumento(tipo: string): string {
    return this.documentoNombres[tipo] || tipo;
  }

  /**
   * Obtiene datos del firmante (médico, enfermera o técnico) por userId
   * Busca en orden: médico -> enfermera -> técnico
   */
  private async obtenerDatosFirmante(
    userId: string,
  ): Promise<FirmanteData | null> {
    // Intentar obtener médico firmante
    const medico = await this.medicosFirmantesService.findOneByUserId(userId);
    if (medico?.nombre) {
      return {
        nombre: medico.nombre || '',
        primerApellido: medico.primerApellido || '',
        segundoApellido: medico.segundoApellido || '',
        tituloProfesional: medico.tituloProfesional || '',
        numeroCedulaProfesional: medico.numeroCedulaProfesional || '',
        especialistaSaludTrabajo: medico.especialistaSaludTrabajo || '',
        numeroCedulaEspecialista: medico.numeroCedulaEspecialista || '',
        nombreCredencialAdicional: medico.nombreCredencialAdicional || '',
        numeroCredencialAdicional: medico.numeroCredencialAdicional || '',
        firma: (medico.firma as { data: string; contentType: string }) || null,
        tipo: 'medico',
      };
    }

    // Intentar obtener enfermera firmante
    const enfermera =
      await this.enfermerasFirmantesService.findOneByUserId(userId);
    if (enfermera?.nombre) {
      return {
        nombre: enfermera.nombre || '',
        primerApellido: enfermera.primerApellido || '',
        segundoApellido: enfermera.segundoApellido || '',
        tituloProfesional: enfermera.tituloProfesional || '',
        numeroCedulaProfesional: enfermera.numeroCedulaProfesional || '',
        nombreCredencialAdicional: enfermera.nombreCredencialAdicional || '',
        numeroCredencialAdicional: enfermera.numeroCredencialAdicional || '',
        firma:
          (enfermera.firma as { data: string; contentType: string }) || null,
        sexo: enfermera.sexo || '',
        tipo: 'enfermera',
      };
    }

    // Intentar obtener técnico firmante
    const tecnico = await this.tecnicosFirmantesService.findOneByUserId(userId);
    if (tecnico?.nombre) {
      return {
        nombre: tecnico.nombre || '',
        primerApellido: tecnico.primerApellido || '',
        segundoApellido: tecnico.segundoApellido || '',
        tituloProfesional: tecnico.tituloProfesional || '',
        numeroCedulaProfesional: tecnico.numeroCedulaProfesional || '',
        nombreCredencialAdicional: tecnico.nombreCredencialAdicional || '',
        numeroCredencialAdicional: tecnico.numeroCredencialAdicional || '',
        firma: (tecnico.firma as { data: string; contentType: string }) || null,
        sexo: tecnico.sexo || '',
        tipo: 'tecnico',
      };
    }

    // No se encontró ningún firmante
    return null;
  }

  /**
   * Regenera el PDF de un documento cuando se finaliza
   * Incluye información de elaborador y finalizador en el footer
   */
  async regenerarInformeAlFinalizar(
    documentType: string,
    documentId: string,
    creadorId: string,
    finalizadorId: string,
  ): Promise<string> {
    // 1. Obtener documento
    const documento = await this.expedientesService.findDocument(
      documentType,
      documentId,
    );

    // 2. Navegar a empresaId
    const trabajador = await this.trabajadoresService.findOne(
      documento.idTrabajador.toString(),
    );
    const centroTrabajo = await this.centrosTrabajoService.findOne(
      trabajador.idCentroTrabajo.toString(),
    );
    const empresaId = centroTrabajo.idEmpresa.toString();

    // 3. Si el creador y finalizador son la misma persona, usar formato simple (como borrador)
    const normalizedType = this.normalizarTipoDocumento(documentType);

    if (creadorId === finalizadorId) {
      // No pasar footerFirmantesData, se usará el formato tradicional
      switch (normalizedType) {
        case 'antidoping':
          return await this.getInformeAntidoping(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'aptitud':
          return await this.getInformeAptitudPuesto(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'certificado':
          return await this.getInformeCertificado(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'certificadoExpedito':
          return await this.getInformeCertificadoExpedito(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'examenVista':
          return await this.getInformeExamenVista(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'exploracionFisica':
          return await this.getInformeExploracionFisica(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'historiaClinica':
          return await this.getInformeHistoriaClinica(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'notaMedica':
          return await this.getInformeNotaMedica(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'notaAclaratoria':
          return await this.getInformeNotaAclaratoria(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'controlPrenatal':
          return await this.getInformeControlPrenatal(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'historiaOtologica':
          return await this.getInformeHistoriaOtologica(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'previoEspirometria':
          return await this.getInformePrevioEspirometria(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'receta':
          return await this.getInformeReceta(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'constanciaAptitud':
          return await this.getInformeConstanciaAptitud(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'audiometria':
          return await this.getInformeAudiometria(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'entrevistaPsicologica':
          return await this.getInformeEntrevistaPsicologica(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'trastornosEstadoAnimo':
          return await this.getInformeTrastornosEstadoAnimo(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'cuestionarioProdromalBreve':
          return await this.getInformeCuestionarioProdromalBreve(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'trastornoLimitePersonalidad':
          return await this.getInformeTrastornoLimitePersonalidad(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'eventoSeguimientoCardiometabolico':
          return await this.getInformeEventoSeguimientoCardiometabolico(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        case 'informeLongitudinalCardiometabolico':
          return await this.getInformeLongitudinalCardiometabolico(
            empresaId,
            trabajador._id,
            documentId,
            finalizadorId,
            undefined,
          );
        default:
          console.warn(
            `regenerarInformeAlFinalizar: Tipo de documento ${normalizedType} no soportado`,
          );
          return documento.rutaPDF || '';
      }
    }

    // 4. Obtener datos de firmantes (personas diferentes)
    const elaborador = await this.obtenerDatosFirmante(creadorId);
    const finalizador = await this.obtenerDatosFirmante(finalizadorId);

    // 5. Preparar datos de footer
    const footerFirmantesData = {
      elaborador,
      finalizador,
      esDocumentoFinalizado: true,
    };

    // 6. Llamar al método de generación correspondiente
    switch (normalizedType) {
      case 'antidoping':
        return await this.getInformeAntidoping(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'aptitud':
        return await this.getInformeAptitudPuesto(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'certificado':
        return await this.getInformeCertificado(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'certificadoExpedito':
        return await this.getInformeCertificadoExpedito(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'examenVista':
        return await this.getInformeExamenVista(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'exploracionFisica':
        return await this.getInformeExploracionFisica(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'historiaClinica':
        return await this.getInformeHistoriaClinica(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'notaMedica':
        return await this.getInformeNotaMedica(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'notaAclaratoria':
        return await this.getInformeNotaAclaratoria(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'controlPrenatal':
        return await this.getInformeControlPrenatal(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'historiaOtologica':
        return await this.getInformeHistoriaOtologica(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'previoEspirometria':
        return await this.getInformePrevioEspirometria(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'receta':
        return await this.getInformeReceta(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'constanciaAptitud':
        return await this.getInformeConstanciaAptitud(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'audiometria':
        return await this.getInformeAudiometria(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          undefined, // audiometria tiene graficaAudiometria como parámetro opcional diferente
          footerFirmantesData,
        );
      case 'entrevistaPsicologica':
        return await this.getInformeEntrevistaPsicologica(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'trastornosEstadoAnimo':
        return await this.getInformeTrastornosEstadoAnimo(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'cuestionarioProdromalBreve':
        return await this.getInformeCuestionarioProdromalBreve(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'trastornoLimitePersonalidad':
        return await this.getInformeTrastornoLimitePersonalidad(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'eventoSeguimientoCardiometabolico':
        return await this.getInformeEventoSeguimientoCardiometabolico(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      case 'informeLongitudinalCardiometabolico':
        return await this.getInformeLongitudinalCardiometabolico(
          empresaId,
          trabajador._id,
          documentId,
          finalizadorId,
          footerFirmantesData,
        );
      default:
        console.warn(
          `regenerarInformeAlFinalizar: Tipo de documento ${normalizedType} no soportado`,
        );
        return documento.rutaPDF || '';
    }
  }

  /**
   * Mapeo de tipos plurales a singulares
   */
  private readonly tipoDocumentoMapeo: Record<string, string> = {
    antidopings: 'antidoping',
    aptitudes: 'aptitud',
    audiometrias: 'audiometria',
    certificados: 'certificado',
    certificadosExpedito: 'certificadoExpedito',
    documentosExternos: 'documentoExterno',
    examenesVista: 'examenVista',
    exploracionesFisicas: 'exploracionFisica',
    historiasClinicas: 'historiaClinica',
    notasMedicas: 'notaMedica',
    controlPrenatal: 'controlPrenatal',
    historiaOtologica: 'historiaOtologica',
    previoEspirometria: 'previoEspirometria',
    recetas: 'receta',
    constanciasAptitud: 'constanciaAptitud',
  };

  /**
   * Normaliza un tipo de documento (convierte plural a singular si es necesario)
   */
  private normalizarTipoDocumento(tipo: string): string {
    return this.tipoDocumentoMapeo[tipo] || tipo;
  }

  /**
   * Obtiene el nombre del campo de fecha principal para un tipo de documento
   */
  private getFechaPrincipalField(tipo: string): string {
    const tipoNormalizado = this.normalizarTipoDocumento(tipo);
    const dateFields: Record<string, string> = {
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
      controlPrenatal: 'fechaInicioControlPrenatal',
      historiaOtologica: 'fechaHistoriaOtologica',
      previoEspirometria: 'fechaPrevioEspirometria',
      receta: 'fechaReceta',
      constanciaAptitud: 'fechaConstanciaAptitud',
      notaAclaratoria: 'fechaNotaAclaratoria',
      eventoSeguimientoCardiometabolico:
        'fechaEventoSeguimientoCardiometabolico',
      informeLongitudinalCardiometabolico:
        'fechaInformeLongitudinalCardiometabolico',
    };
    return dateFields[tipoNormalizado] || 'fecha';
  }

  /**
   * Obtiene información distintiva del documento según su tipo
   */
  private getCampoDistintivo(documento: any, tipo: string): string {
    if (!documento) return '';

    const tipoNormalizado = this.normalizarTipoDocumento(tipo);

    switch (tipoNormalizado) {
      case 'notaMedica':
        return documento.tipoNota ? `Tipo: ${documento.tipoNota}` : '';
      case 'historiaClinica':
        return documento.motivoExamen
          ? `Motivo: ${documento.motivoExamen}`
          : '';
      case 'antidoping':
        return 'Examen toxicológico';
      case 'audiometria':
        return documento.diagnosticoAudiometria || '';
      default:
        return '';
    }
  }

  async getInformeAntidoping(
    empresaId: string,
    trabajadorId: string,
    antidopingId: string,
    userId: string,
    footerFirmantesData?: any,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);
    const nombreEmpresa = empresa.nombreComercial;

    const trabajador = await this.trabajadoresService.findOne(trabajadorId);
    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const antidoping = await this.expedientesService.findDocument(
      'antidoping',
      antidopingId,
    );
    const datosAntidoping = {
      fechaAntidoping: antidoping.fechaAntidoping,
      marihuana: antidoping.marihuana,
      cocaina: antidoping.cocaina,
      anfetaminas: antidoping.anfetaminas,
      metanfetaminas: antidoping.metanfetaminas,
      opiaceos: antidoping.opiaceos,
      benzodiacepinas: antidoping.benzodiacepinas || null,
      fenciclidina: antidoping.fenciclidina || null,
      metadona: antidoping.metadona || null,
      barbituricos: antidoping.barbituricos || null,
      antidepresivosTriciclicos: antidoping.antidepresivosTriciclicos || null,
      metilendioximetanfetamina: antidoping.metilendioximetanfetamina || null,
      ketamina: antidoping.ketamina || null,
    };

    // Determinar footerFirmantesData según estado del documento
    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (antidoping.estado === DocumentoEstado.FINALIZADO ||
        antidoping.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (antidoping.createdBy?._id || antidoping.createdBy)?.toString() ||
        userId;
      const finalizadorId =
        (
          antidoping.finalizadoPor?._id || antidoping.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        // Obtener datos de ambos firmantes
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
      // Si creador === finalizador, footerData queda undefined (formato simple)
    }
    // Si está en BORRADOR, footerData queda undefined (formato simple)

    // Determinar qué userId usar para obtener firmante (solo para formato simple o cuando creador === finalizador)
    const firmanteUserId =
      antidoping.estado === DocumentoEstado.BORRADOR
        ? (antidoping.createdBy?._id || antidoping.createdBy)?.toString() ||
          userId
        : antidoping.estado === DocumentoEstado.FINALIZADO ||
            antidoping.estado === DocumentoEstado.ANULADO
          ? (
              antidoping.finalizadoPor?._id || antidoping.finalizadoPor
            )?.toString() || userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = this.mapMedicoFirmante(
      medicoFirmante
        ? {
            nombre: medicoFirmante.nombre,
            primerApellido: medicoFirmante.primerApellido,
            segundoApellido: medicoFirmante.segundoApellido,
            tituloProfesional: medicoFirmante.tituloProfesional,
            universidad: medicoFirmante.universidad,
            numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional,
            especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo,
            numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista,
            nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional,
            numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional,
            firma:
              (medicoFirmante.firma as { data: string; contentType: string }) ||
              null,
          }
        : null,
    );

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        primerApellido: enfermeraFirmante.primerApellido || "",
        segundoApellido: enfermeraFirmante.segundoApellido || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante =
      await this.tecnicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        primerApellido: tecnicoFirmante.primerApellido || "",
        segundoApellido: tecnicoFirmante.segundoApellido || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(antidoping.fechaAntidoping)
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Antidoping ${fecha}.pdf`;

    const rutaDirectorio = path.resolve(antidoping.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);

    const docDefinition = antidopingInforme(
      nombreEmpresa,
      datosTrabajador,
      datosAntidoping,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
      datosProveedorSalud,
      footerData,
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'antidoping',
      antidopingId,
    );

    return rutaCompleta;
  }

  private findMostRecentResultadoClinicoByTipo(
    items: Array<Record<string, unknown>> | null | undefined,
    tipoEstudio: string,
    referenceYear?: number | null,
  ): Record<string, unknown> | null {
    if (!items?.length) {
      return null;
    }

    let candidates = items.filter(
      (item) => item?.tipoEstudio === tipoEstudio && item?.fechaEstudio,
    );

    if (referenceYear != null && !Number.isNaN(referenceYear)) {
      candidates = candidates.filter((item) => {
        const d = new Date(item.fechaEstudio as string | number | Date);
        return !Number.isNaN(d.getTime()) && d.getFullYear() === referenceYear;
      });
    }

    return candidates.reduce<Record<string, unknown> | null>(
      (latest, current) => {
        const currentDate = new Date(
          current.fechaEstudio as string | number | Date,
        );
        if (Number.isNaN(currentDate.getTime())) {
          return latest;
        }
        if (!latest) {
          return current;
        }
        const latestDate = new Date(
          latest.fechaEstudio as string | number | Date,
        );
        return currentDate > latestDate ? current : latest;
      },
      null,
    );
  }

  async getInformeAptitudPuesto(
    empresaId: string,
    trabajadorId: string,
    aptitudId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
    includeResultadosClinicos = true,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);
    const nombreEmpresa = empresa.nombreComercial;

    const trabajador = await this.trabajadoresService.findOne(trabajadorId);
    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const aptitud = await this.expedientesService.findDocument(
      'aptitud',
      aptitudId,
    );

    const datosAptitud = {
      fechaAptitudPuesto: aptitud.fechaAptitudPuesto,
      evaluacionAdicional1: aptitud.evaluacionAdicional1,
      fechaEvaluacionAdicional1: aptitud.fechaEvaluacionAdicional1,
      resultadosEvaluacionAdicional1: aptitud.resultadosEvaluacionAdicional1,
      evaluacionAdicional2: aptitud.evaluacionAdicional2,
      fechaEvaluacionAdicional2: aptitud.fechaEvaluacionAdicional2,
      resultadosEvaluacionAdicional2: aptitud.resultadosEvaluacionAdicional2,
      evaluacionAdicional3: aptitud.evaluacionAdicional3,
      fechaEvaluacionAdicional3: aptitud.fechaEvaluacionAdicional3,
      resultadosEvaluacionAdicional3: aptitud.resultadosEvaluacionAdicional3,
      evaluacionAdicional4: aptitud.evaluacionAdicional4,
      fechaEvaluacionAdicional4: aptitud.fechaEvaluacionAdicional4,
      resultadosEvaluacionAdicional4: aptitud.resultadosEvaluacionAdicional4,
      evaluacionAdicional5: aptitud.evaluacionAdicional5,
      fechaEvaluacionAdicional5: aptitud.fechaEvaluacionAdicional5,
      resultadosEvaluacionAdicional5: aptitud.resultadosEvaluacionAdicional5,
      aptitudPuesto: aptitud.aptitudPuesto,
      alteracionesSalud: aptitud.alteracionesSalud,
      resultados: aptitud.resultados,
      medidasPreventivas: aptitud.medidasPreventivas,
    };

    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (aptitud.estado === DocumentoEstado.FINALIZADO ||
        aptitud.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (aptitud.createdBy?._id || aptitud.createdBy)?.toString() || userId;
      const finalizadorId =
        (aptitud.finalizadoPor?._id || aptitud.finalizadoPor)?.toString() ||
        userId;

      if (creadorId !== finalizadorId) {
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
    }

    const firmanteUserId =
      aptitud.estado === DocumentoEstado.BORRADOR
        ? (aptitud.createdBy?._id || aptitud.createdBy)?.toString() || userId
        : aptitud.estado === DocumentoEstado.FINALIZADO ||
            aptitud.estado === DocumentoEstado.ANULADO
          ? (aptitud.finalizadoPor?._id || aptitud.finalizadoPor)?.toString() ||
            userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = this.mapMedicoFirmante(
      medicoFirmante
        ? {
            nombre: medicoFirmante.nombre,
            primerApellido: medicoFirmante.primerApellido,
            segundoApellido: medicoFirmante.segundoApellido,
            tituloProfesional: medicoFirmante.tituloProfesional,
            universidad: medicoFirmante.universidad,
            numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional,
            especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo,
            numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista,
            nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional,
            numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional,
            firma:
              (medicoFirmante.firma as { data: string; contentType: string }) ||
              null,
          }
        : null,
    );

    const [
      historiasClinicasList,
      exploracionesFisicasList,
      examenesVistaList,
      audiometriasList,
      antidopingsList,
      entrevistasPsicologicasList,
      trastornosEstadoAnimoList,
      cuestionariosProdromalBreveList,
      trastornosLimitePersonalidadList,
      resultadosClinicosList,
    ] = await Promise.all([
      this.expedientesService.findDocuments('historiaClinica', trabajadorId),
      this.expedientesService.findDocuments('exploracionFisica', trabajadorId),
      this.expedientesService.findDocuments('examenVista', trabajadorId),
      this.expedientesService.findDocuments('audiometria', trabajadorId),
      this.expedientesService.findDocuments('antidoping', trabajadorId),
      this.expedientesService.findDocuments(
        'entrevistaPsicologica',
        trabajadorId,
      ),
      this.expedientesService.findDocuments(
        'trastornosEstadoAnimo',
        trabajadorId,
      ),
      this.expedientesService.findDocuments(
        'cuestionarioProdromalBreve',
        trabajadorId,
      ),
      this.expedientesService.findDocuments(
        'trastornoLimitePersonalidad',
        trabajadorId,
      ),
      includeResultadosClinicos
        ? this.resultadosClinicosService.findByTrabajador(trabajadorId)
        : Promise.resolve([]),
    ]);

    const fechaAptitudRef = aptitud.fechaAptitudPuesto;
    const referenceYear = fechaAptitudRef
      ? new Date(fechaAptitudRef).getFullYear()
      : null;

    const nearestHistoriaClinica = findNearestDocumentSameYear(
      historiasClinicasList,
      fechaAptitudRef,
      'fechaHistoriaClinica',
    );
    const nearestExploracionFisica = findNearestDocumentSameYear(
      exploracionesFisicasList,
      fechaAptitudRef,
      'fechaExploracionFisica',
    );
    const nearestExamenVista = findNearestDocumentSameYear(
      examenesVistaList,
      fechaAptitudRef,
      'fechaExamenVista',
    );
    const nearestAudiometria = findNearestDocumentSameYear(
      audiometriasList,
      fechaAptitudRef,
      'fechaAudiometria',
    );
    const nearestAntidoping = findNearestDocumentSameYear(
      antidopingsList,
      fechaAptitudRef,
      'fechaAntidoping',
    );

    const nearestEntrevistaPsicologica = findNearestDocumentSameYear(
      entrevistasPsicologicasList,
      fechaAptitudRef,
      'fechaEntrevistaPsicologica',
    );
    const nearestTrastornosEstadoAnimo = findNearestDocumentSameYear(
      trastornosEstadoAnimoList,
      fechaAptitudRef,
      'fechaTrastornosEstadoAnimo',
    );
    const nearestCuestionarioProdromalBreve = findNearestDocumentSameYear(
      cuestionariosProdromalBreveList,
      fechaAptitudRef,
      'fechaCuestionarioProdromalBreve',
    );
    const nearestTrastornoLimitePersonalidad = findNearestDocumentSameYear(
      trastornosLimitePersonalidadList,
      fechaAptitudRef,
      'fechaTrastornoLimitePersonalidad',
    );

    const datosHistoriaClinica = nearestHistoriaClinica
      ? {
          fechaHistoriaClinica: nearestHistoriaClinica.fechaHistoriaClinica,
          resumenHistoriaClinica: nearestHistoriaClinica.resumenHistoriaClinica,
        }
      : null;

    const datosExploracionFisica = nearestExploracionFisica
      ? {
          fechaExploracionFisica:
            nearestExploracionFisica.fechaExploracionFisica,
          tensionArterialSistolica:
            nearestExploracionFisica.tensionArterialSistolica,
          tensionArterialDiastolica:
            nearestExploracionFisica.tensionArterialDiastolica,
          categoriaTensionArterial:
            nearestExploracionFisica.categoriaTensionArterial,
          indiceMasaCorporal: nearestExploracionFisica.indiceMasaCorporal,
          categoriaIMC: nearestExploracionFisica.categoriaIMC,
          circunferenciaCintura: nearestExploracionFisica.circunferenciaCintura,
          categoriaCircunferenciaCintura:
            nearestExploracionFisica.categoriaCircunferenciaCintura,
          resumenExploracionFisica:
            nearestExploracionFisica.resumenExploracionFisica,
        }
      : null;

    const datosExamenVista = nearestExamenVista
      ? {
          fechaExamenVista: nearestExamenVista.fechaExamenVista,
          ojoIzquierdoCegueraTotal: nearestExamenVista.ojoIzquierdoCegueraTotal,
          ojoDerechoCegueraTotal: nearestExamenVista.ojoDerechoCegueraTotal,
          ojoIzquierdoLejanaCegueraTotal:
            nearestExamenVista.ojoIzquierdoLejanaCegueraTotal,
          ojoDerechoLejanaCegueraTotal:
            nearestExamenVista.ojoDerechoLejanaCegueraTotal,
          ojoIzquierdoCercanaCegueraTotal:
            nearestExamenVista.ojoIzquierdoCercanaCegueraTotal,
          ojoDerechoCercanaCegueraTotal:
            nearestExamenVista.ojoDerechoCercanaCegueraTotal,
          ojoIzquierdoLejanaSinCorreccion:
            nearestExamenVista.ojoIzquierdoLejanaSinCorreccion,
          ojoDerechoLejanaSinCorreccion:
            nearestExamenVista.ojoDerechoLejanaSinCorreccion,
          sinCorreccionLejanaInterpretacion:
            nearestExamenVista.sinCorreccionLejanaInterpretacion,
          ojoIzquierdoLejanaConCorreccion:
            nearestExamenVista.ojoIzquierdoLejanaConCorreccion,
          ojoDerechoLejanaConCorreccion:
            nearestExamenVista.ojoDerechoLejanaConCorreccion,
          conCorreccionLejanaInterpretacion:
            nearestExamenVista.conCorreccionLejanaInterpretacion,
          porcentajeIshihara: nearestExamenVista.porcentajeIshihara,
          interpretacionIshihara: nearestExamenVista.interpretacionIshihara,
        }
      : null;

    const datosAudiometria = nearestAudiometria
      ? {
          fechaAudiometria: nearestAudiometria.fechaAudiometria,
          diagnosticoAudiometria: nearestAudiometria.diagnosticoAudiometria,
          hipoacusiaBilateralCombinada:
            nearestAudiometria.hipoacusiaBilateralCombinada,
        }
      : null;

    const datosAntidopingAptitud = nearestAntidoping
      ? {
          fechaAntidoping: nearestAntidoping.fechaAntidoping,
          marihuana: nearestAntidoping.marihuana,
          cocaina: nearestAntidoping.cocaina,
          anfetaminas: nearestAntidoping.anfetaminas,
          metanfetaminas: nearestAntidoping.metanfetaminas,
          opiaceos: nearestAntidoping.opiaceos,
          benzodiacepinas: nearestAntidoping.benzodiacepinas || null,
          fenciclidina: nearestAntidoping.fenciclidina || null,
          metadona: nearestAntidoping.metadona || null,
          barbituricos: nearestAntidoping.barbituricos || null,
          antidepresivosTriciclicos:
            nearestAntidoping.antidepresivosTriciclicos || null,
        }
      : null;

    const nearestTipoSangre = includeResultadosClinicos
      ? this.findMostRecentResultadoClinicoByTipo(
          resultadosClinicosList as Array<Record<string, unknown>>,
          'TIPO_SANGRE',
        )
      : null;
    const nearestEKG = includeResultadosClinicos
      ? this.findMostRecentResultadoClinicoByTipo(
          resultadosClinicosList as Array<Record<string, unknown>>,
          'EKG',
          referenceYear,
        )
      : null;
    const nearestEspirometria = includeResultadosClinicos
      ? this.findMostRecentResultadoClinicoByTipo(
          resultadosClinicosList as Array<Record<string, unknown>>,
          'ESPIROMETRIA',
          referenceYear,
        )
      : null;
    const nearestRayosX = includeResultadosClinicos
      ? this.findMostRecentResultadoClinicoByTipo(
          resultadosClinicosList as Array<Record<string, unknown>>,
          'RAYOS_X',
          referenceYear,
        )
      : null;
    const nearestAnalisisLaboratorio = includeResultadosClinicos
      ? this.findMostRecentResultadoClinicoByTipo(
          resultadosClinicosList as Array<Record<string, unknown>>,
          'ANALISIS_LABORATORIO',
          referenceYear,
        )
      : null;

    const datosResultadoClinicoTipoSangre = nearestTipoSangre
      ? {
          fechaEstudio: nearestTipoSangre.fechaEstudio as Date,
          tipoSangre: nearestTipoSangre.tipoSangre as string,
        }
      : null;
    const datosResultadoClinicoEKG = nearestEKG
      ? ({
          fechaEstudio: nearestEKG.fechaEstudio,
          resultadoGlobal: nearestEKG.resultadoGlobal,
          hallazgoEspecifico: nearestEKG.hallazgoEspecifico,
          tipoAlteracionEKG: nearestEKG.tipoAlteracionEKG,
        } as {
          fechaEstudio: Date;
          resultadoGlobal?: string;
          hallazgoEspecifico?: string;
          tipoAlteracionEKG?: string;
        })
      : null;
    const datosResultadoClinicoEspirometria = nearestEspirometria
      ? ({
          fechaEstudio: nearestEspirometria.fechaEstudio,
          resultadoGlobal: nearestEspirometria.resultadoGlobal,
          hallazgoEspecifico: nearestEspirometria.hallazgoEspecifico,
          tipoAlteracionEspirometria: nearestEspirometria.tipoAlteracionEspirometria,
        } as {
          fechaEstudio: Date;
          resultadoGlobal?: string;
          hallazgoEspecifico?: string;
          tipoAlteracionEspirometria?: string;
        })
      : null;
    const datosResultadoClinicoRayosX = nearestRayosX
      ? ({
          fechaEstudio: nearestRayosX.fechaEstudio,
          resultadoGlobal: nearestRayosX.resultadoGlobal,
          hallazgoEspecifico: nearestRayosX.hallazgoEspecifico,
          tipoAlteracionRayosX: nearestRayosX.tipoAlteracionRayosX,
        } as {
          fechaEstudio: Date;
          resultadoGlobal?: string;
          hallazgoEspecifico?: string;
          tipoAlteracionRayosX?: string[];
        })
      : null;
    const datosResultadoClinicoAnalisisLaboratorio = nearestAnalisisLaboratorio
      ? ({
          fechaEstudio: nearestAnalisisLaboratorio.fechaEstudio,
          resultadoGlobal: nearestAnalisisLaboratorio.resultadoGlobal,
          hallazgoEspecifico: nearestAnalisisLaboratorio.hallazgoEspecifico,
          tipoAlteracionAnalisisLaboratorio:
            nearestAnalisisLaboratorio.tipoAlteracionAnalisisLaboratorio,
        } as {
          fechaEstudio: Date;
          resultadoGlobal?: string;
          hallazgoEspecifico?: string;
          tipoAlteracionAnalisisLaboratorio?: string[];
        })
      : null;

    const filasTamizajePsicologia: {
      titulo: string;
      fecha: Date;
      resumen: string;
    }[] = [];
    if (nearestEntrevistaPsicologica) {
      filasTamizajePsicologia.push({
        titulo: 'ENTREVISTA PSICOLÓGICA',
        fecha: nearestEntrevistaPsicologica.fechaEntrevistaPsicologica,
        resumen: resumenTablaEntrevistaPsicologica(
          nearestEntrevistaPsicologica as Record<string, unknown>,
        ),
      });
    }
    if (nearestTrastornosEstadoAnimo) {
      filasTamizajePsicologia.push({
        titulo: 'TRASTORNOS DEL ESTADO DE ÁNIMO',
        fecha: nearestTrastornosEstadoAnimo.fechaTrastornosEstadoAnimo,
        resumen: resumenTablaTrastornosEstadoAnimo(
          nearestTrastornosEstadoAnimo as Record<string, unknown>,
        ),
      });
    }
    if (nearestCuestionarioProdromalBreve) {
      filasTamizajePsicologia.push({
        titulo: 'CUESTIONARIO PRODROMAL BREVE',
        fecha: nearestCuestionarioProdromalBreve.fechaCuestionarioProdromalBreve,
        resumen: resumenTablaCuestionarioProdromalBreve(
          nearestCuestionarioProdromalBreve as Record<string, unknown>,
        ),
      });
    }
    if (nearestTrastornoLimitePersonalidad) {
      filasTamizajePsicologia.push({
        titulo: 'TRASTORNO LÍMITE PERSONALIDAD',
        fecha: nearestTrastornoLimitePersonalidad.fechaTrastornoLimitePersonalidad,
        resumen: resumenTablaTrastornoLimitePersonalidad(
          nearestTrastornoLimitePersonalidad as Record<string, unknown>,
        ),
      });
    }

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
        includeSemaforizacion: true,
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(aptitud.fechaAptitudPuesto)
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Aptitud ${fecha}.pdf`;

    const rutaDirectorio = path.resolve(aptitud.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);

    const docDefinition = aptitudPuestoInforme(
      nombreEmpresa,
      datosTrabajador,
      datosAptitud,
      datosHistoriaClinica,
      datosExploracionFisica,
      datosExamenVista,
      datosAudiometria,
      datosAntidopingAptitud,
      datosResultadoClinicoTipoSangre,
      datosResultadoClinicoEKG,
      datosResultadoClinicoEspirometria,
      datosResultadoClinicoRayosX,
      datosResultadoClinicoAnalisisLaboratorio,
      datosMedicoFirmante,
      {
        ...datosProveedorSalud,
        semaforizacionActivada: datosProveedorSalud.semaforizacionActivada ?? false,
      },
      footerData,
      filasTamizajePsicologia,
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'aptitud',
      aptitudId,
    );

    return rutaCompleta;
  }


  async getInformeConstanciaAptitud(
    empresaId: string,
    trabajadorId: string,
    constanciaAptitudId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);
    const nombreEmpresa = empresa.nombreComercial;

    const trabajador = await this.trabajadoresService.findOne(trabajadorId);
    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const constanciaAptitud = await this.expedientesService.findDocument(
      'constanciaAptitud',
      constanciaAptitudId,
    );
    const datosConstanciaAptitud = {
      fechaConstanciaAptitud: constanciaAptitud.fechaConstanciaAptitud,
    };

    // Determinar footerFirmantesData según estado del documento
    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (constanciaAptitud.estado === DocumentoEstado.FINALIZADO ||
        constanciaAptitud.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (
          constanciaAptitud.createdBy?._id || constanciaAptitud.createdBy
        )?.toString() || userId;
      const finalizadorId =
        (
          constanciaAptitud.finalizadoPor?._id ||
          constanciaAptitud.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        // Obtener datos de ambos firmantes
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
      // Si creador === finalizador, footerData queda undefined (formato simple)
    }
    // Si está en BORRADOR, footerData queda undefined (formato simple)

    // Determinar qué userId usar para obtener firmante (solo para formato simple o cuando creador === finalizador)
    const firmanteUserId =
      constanciaAptitud.estado === DocumentoEstado.BORRADOR
        ? (
            constanciaAptitud.createdBy?._id || constanciaAptitud.createdBy
          )?.toString() || userId
        : constanciaAptitud.estado === DocumentoEstado.FINALIZADO ||
            constanciaAptitud.estado === DocumentoEstado.ANULADO
          ? (
              constanciaAptitud.finalizadoPor?._id ||
              constanciaAptitud.finalizadoPor
            )?.toString() || userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = this.mapMedicoFirmante(
      medicoFirmante
        ? {
            nombre: medicoFirmante.nombre,
            primerApellido: medicoFirmante.primerApellido,
            segundoApellido: medicoFirmante.segundoApellido,
            tituloProfesional: medicoFirmante.tituloProfesional,
            universidad: medicoFirmante.universidad,
            numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional,
            especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo,
            numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista,
            nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional,
            numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional,
            firma:
              (medicoFirmante.firma as { data: string; contentType: string }) ||
              null,
          }
        : null,
    );

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
        includeSemaforizacion: true,
      });
    const datosProveedorSalud = proveedorInforme.datos;

    // Formatear la fecha para el nombre del archivo
    const fecha = convertirFechaADDMMAAAA(
      constanciaAptitud.fechaConstanciaAptitud,
    )
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Constancia de Aptitud ${fecha}.pdf`;

    // Obtener la ruta específica del documento
    const rutaDirectorio = path.resolve(constanciaAptitud.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);

    const docDefinition = constanciaAptitudInforme(
      nombreEmpresa,
      datosTrabajador,
      datosConstanciaAptitud,
      datosMedicoFirmante,
      {
        ...datosProveedorSalud,
        semaforizacionActivada: datosProveedorSalud.semaforizacionActivada ?? false,
      },
      footerData,
    );

    // Generar y guardar el PDF
    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'constanciaAptitud',
      constanciaAptitudId,
    );

    return rutaCompleta; // Retorna la ruta del archivo generado
  }

  async getInformeAudiometria(
    empresaId: string,
    trabajadorId: string,
    audiometriaId: string,
    userId: string,
    graficaAudiometria?: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);
    const nombreEmpresa = empresa.nombreComercial;

    const trabajador = await this.trabajadoresService.findOne(trabajadorId);
    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const audiometria = await this.expedientesService.findDocument(
      'audiometria',
      audiometriaId,
    );
    const datosAudiometria = {
      fechaAudiometria: audiometria.fechaAudiometria,
      metodoAudiometria: audiometria.metodoAudiometria || 'AMA', // Agregar método de audiometría
      oidoDerecho125: audiometria.oidoDerecho125,
      oidoDerecho250: audiometria.oidoDerecho250,
      oidoDerecho500: audiometria.oidoDerecho500,
      oidoDerecho1000: audiometria.oidoDerecho1000,
      oidoDerecho2000: audiometria.oidoDerecho2000,
      oidoDerecho3000: audiometria.oidoDerecho3000,
      oidoDerecho4000: audiometria.oidoDerecho4000,
      oidoDerecho6000: audiometria.oidoDerecho6000,
      oidoDerecho8000: audiometria.oidoDerecho8000,
      porcentajePerdidaOD: audiometria.porcentajePerdidaOD,
      // Campos específicos para AMA
      perdidaAuditivaBilateralAMA: audiometria.perdidaAuditivaBilateralAMA,
      perdidaMonauralOD_AMA: audiometria.perdidaMonauralOD_AMA,
      perdidaMonauralOI_AMA: audiometria.perdidaMonauralOI_AMA,
      oidoIzquierdo125: audiometria.oidoIzquierdo125,
      oidoIzquierdo250: audiometria.oidoIzquierdo250,
      oidoIzquierdo500: audiometria.oidoIzquierdo500,
      oidoIzquierdo1000: audiometria.oidoIzquierdo1000,
      oidoIzquierdo2000: audiometria.oidoIzquierdo2000,
      oidoIzquierdo3000: audiometria.oidoIzquierdo3000,
      oidoIzquierdo4000: audiometria.oidoIzquierdo4000,
      oidoIzquierdo6000: audiometria.oidoIzquierdo6000,
      oidoIzquierdo8000: audiometria.oidoIzquierdo8000,
      porcentajePerdidaOI: audiometria.porcentajePerdidaOI,
      hipoacusiaBilateralCombinada: audiometria.hipoacusiaBilateralCombinada,
      observacionesAudiometria: audiometria.observacionesAudiometria,
      interpretacionAudiometrica: audiometria.interpretacionAudiometrica,
      diagnosticoAudiometria: audiometria.diagnosticoAudiometria,
      recomendacionesAudiometria: audiometria.recomendacionesAudiometria,
      graficaAudiometria: graficaAudiometria, // Agregar la gráfica si se proporciona
    };

    // Determinar footerFirmantesData según estado del documento
    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (audiometria.estado === DocumentoEstado.FINALIZADO ||
        audiometria.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (audiometria.createdBy?._id || audiometria.createdBy)?.toString() ||
        userId;
      const finalizadorId =
        (
          audiometria.finalizadoPor?._id || audiometria.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        // Obtener datos de ambos firmantes
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
      // Si creador === finalizador, footerData queda undefined (formato simple)
    }
    // Si está en BORRADOR, footerData queda undefined (formato simple)

    // Determinar qué userId usar para obtener firmante (solo para formato simple o cuando creador === finalizador)
    const firmanteUserId =
      audiometria.estado === DocumentoEstado.BORRADOR
        ? (audiometria.createdBy?._id || audiometria.createdBy)?.toString() ||
          userId
        : audiometria.estado === DocumentoEstado.FINALIZADO ||
            audiometria.estado === DocumentoEstado.ANULADO
          ? (
              audiometria.finalizadoPor?._id || audiometria.finalizadoPor
            )?.toString() || userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = this.mapMedicoFirmante(
      medicoFirmante
        ? {
            nombre: medicoFirmante.nombre,
            primerApellido: medicoFirmante.primerApellido,
            segundoApellido: medicoFirmante.segundoApellido,
            tituloProfesional: medicoFirmante.tituloProfesional,
            universidad: medicoFirmante.universidad,
            numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional,
            especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo,
            numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista,
            nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional,
            numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional,
            firma:
              (medicoFirmante.firma as { data: string; contentType: string }) ||
              null,
          }
        : null,
    );

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        primerApellido: enfermeraFirmante.primerApellido || "",
        segundoApellido: enfermeraFirmante.segundoApellido || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante =
      await this.tecnicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        primerApellido: tecnicoFirmante.primerApellido || "",
        segundoApellido: tecnicoFirmante.segundoApellido || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
        includeSemaforizacion: true,
      });
    const datosProveedorSalud = proveedorInforme.datos;

    // Formatear la fecha para el nombre del archivo
    const fecha = convertirFechaADDMMAAAA(audiometria.fechaAudiometria)
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Audiometria ${fecha}.pdf`;

    // Obtener la ruta específica del documento
    const rutaDirectorio = path.resolve(audiometria.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);

    const docDefinition = audiometriaInforme(
      nombreEmpresa,
      datosTrabajador,
      datosAudiometria,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
      datosProveedorSalud,
      footerData,
    );

    // Generar y guardar el PDF
    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'audiometria',
      audiometriaId,
    );

    return rutaCompleta; // Retorna la ruta del archivo generado
  }

  async getInformeCertificado(
    empresaId: string,
    trabajadorId: string,
    certificadoId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);
    const nombreEmpresa = empresa.nombreComercial;

    const trabajador = await this.trabajadoresService.findOne(trabajadorId);
    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const certificado = await this.expedientesService.findDocument(
      'certificado',
      certificadoId,
    );
    const datosCertificado = {
      fechaCertificado: certificado.fechaCertificado,
      impedimentosFisicos: certificado.impedimentosFisicos,
    };

    // Determinar footerFirmantesData según estado del documento
    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (certificado.estado === DocumentoEstado.FINALIZADO ||
        certificado.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (certificado.createdBy?._id || certificado.createdBy)?.toString() ||
        userId;
      const finalizadorId =
        (
          certificado.finalizadoPor?._id || certificado.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        // Obtener datos de ambos firmantes
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
      // Si creador === finalizador, footerData queda undefined (formato simple)
    }
    // Si está en BORRADOR, footerData queda undefined (formato simple)

    // Determinar qué userId usar para obtener firmante (solo para formato simple o cuando creador === finalizador)
    const firmanteUserId =
      certificado.estado === DocumentoEstado.BORRADOR
        ? (certificado.createdBy?._id || certificado.createdBy)?.toString() ||
          userId
        : certificado.estado === DocumentoEstado.FINALIZADO ||
            certificado.estado === DocumentoEstado.ANULADO
          ? (
              certificado.finalizadoPor?._id || certificado.finalizadoPor
            )?.toString() || userId
          : userId;

    const exploracionesFisicas = await this.expedientesService.findDocuments(
      'exploracionFisica',
      trabajadorId,
    );

    const nearestExploracionFisica = exploracionesFisicas?.length
      ? findNearestDocument(
          exploracionesFisicas,
          certificado.fechaCertificado,
          'fechaExploracionFisica',
        )
      : null;

    const datosExploracionFisica = nearestExploracionFisica
      ? {
          fechaExploracionFisica:
            nearestExploracionFisica.fechaExploracionFisica,
          peso: nearestExploracionFisica.peso,
          altura: nearestExploracionFisica.altura,
          indiceMasaCorporal: nearestExploracionFisica.indiceMasaCorporal,
          categoriaIMC: nearestExploracionFisica.categoriaIMC,
          circunferenciaCintura: nearestExploracionFisica.circunferenciaCintura,
          categoriaCircunferenciaCintura:
            nearestExploracionFisica.categoriaCircunferenciaCintura,
          tensionArterialSistolica:
            nearestExploracionFisica.tensionArterialSistolica,
          tensionArterialDiastolica:
            nearestExploracionFisica.tensionArterialDiastolica,
          categoriaTensionArterial:
            nearestExploracionFisica.categoriaTensionArterial,
          frecuenciaCardiaca: nearestExploracionFisica.frecuenciaCardiaca,
          categoriaFrecuenciaCardiaca:
            nearestExploracionFisica.categoriaFrecuenciaCardiaca,
          frecuenciaRespiratoria:
            nearestExploracionFisica.frecuenciaRespiratoria,
          categoriaFrecuenciaRespiratoria:
            nearestExploracionFisica.categoriaFrecuenciaRespiratoria,
          saturacionOxigeno: nearestExploracionFisica.saturacionOxigeno,
          categoriaSaturacionOxigeno:
            nearestExploracionFisica.categoriaSaturacionOxigeno,
          craneoCara: nearestExploracionFisica.craneoCara,
          ojos: nearestExploracionFisica.ojos,
          oidos: nearestExploracionFisica.oidos,
          nariz: nearestExploracionFisica.nariz,
          boca: nearestExploracionFisica.boca,
          cuello: nearestExploracionFisica.cuello,
          hombros: nearestExploracionFisica.hombros,
          codos: nearestExploracionFisica.codos,
          manos: nearestExploracionFisica.manos,
          reflejosOsteoTendinososSuperiores:
            nearestExploracionFisica.reflejosOsteoTendinososSuperiores,
          vascularESuperiores: nearestExploracionFisica.vascularESuperiores,
          torax: nearestExploracionFisica.torax,
          abdomen: nearestExploracionFisica.abdomen,
          cadera: nearestExploracionFisica.cadera,
          rodillas: nearestExploracionFisica.rodillas,
          tobillosPies: nearestExploracionFisica.tobillosPies,
          reflejosOsteoTendinososInferiores:
            nearestExploracionFisica.reflejosOsteoTendinososInferiores,
          vascularEInferiores: nearestExploracionFisica.vascularEInferiores,
          inspeccionColumna: nearestExploracionFisica.inspeccionColumna,
          movimientosColumna: nearestExploracionFisica.movimientosColumna,
          lesionesPiel: nearestExploracionFisica.lesionesPiel,
          cicatrices: nearestExploracionFisica.cicatrices,
          nevos: nearestExploracionFisica.nevos,
          coordinacion: nearestExploracionFisica.coordinacion,
          sensibilidad: nearestExploracionFisica.sensibilidad,
          equilibrio: nearestExploracionFisica.equilibrio,
          marcha: nearestExploracionFisica.marcha,
          resumenExploracionFisica:
            nearestExploracionFisica.resumenExploracionFisica,
        }
      : null;

    const examenesVista = await this.expedientesService.findDocuments(
      'examenVista',
      trabajadorId,
    );
    const nearestExamenVista = examenesVista?.length
      ? findNearestDocument(
          examenesVista,
          certificado.fechaCertificado,
          'fechaExamenVista',
        )
      : null;

    const datosExamenVista = nearestExamenVista
      ? {
          fechaExamenVista: nearestExamenVista.fechaExamenVista,
          ojoIzquierdoCegueraTotal: nearestExamenVista.ojoIzquierdoCegueraTotal,
          ojoDerechoCegueraTotal: nearestExamenVista.ojoDerechoCegueraTotal,
          ojoIzquierdoLejanaCegueraTotal:
            nearestExamenVista.ojoIzquierdoLejanaCegueraTotal,
          ojoDerechoLejanaCegueraTotal:
            nearestExamenVista.ojoDerechoLejanaCegueraTotal,
          ojoIzquierdoCercanaCegueraTotal:
            nearestExamenVista.ojoIzquierdoCercanaCegueraTotal,
          ojoDerechoCercanaCegueraTotal:
            nearestExamenVista.ojoDerechoCercanaCegueraTotal,
          ojoIzquierdoLejanaSinCorreccion:
            nearestExamenVista.ojoIzquierdoLejanaSinCorreccion,
          ojoDerechoLejanaSinCorreccion:
            nearestExamenVista.ojoDerechoLejanaSinCorreccion,
          sinCorreccionLejanaInterpretacion:
            nearestExamenVista.sinCorreccionLejanaInterpretacion,
          requiereLentesUsoGeneral: nearestExamenVista.requiereLentesUsoGeneral,
          ojoIzquierdoCercanaSinCorreccion:
            nearestExamenVista.ojoIzquierdoCercanaSinCorreccion,
          ojoDerechoCercanaSinCorreccion:
            nearestExamenVista.ojoDerechoCercanaSinCorreccion,
          sinCorreccionCercanaInterpretacion:
            nearestExamenVista.sinCorreccionCercanaInterpretacion,
          requiereLentesParaLectura:
            nearestExamenVista.requiereLentesParaLectura,
          ojoIzquierdoLejanaConCorreccion:
            nearestExamenVista.ojoIzquierdoLejanaConCorreccion,
          ojoDerechoLejanaConCorreccion:
            nearestExamenVista.ojoDerechoLejanaConCorreccion,
          conCorreccionLejanaInterpretacion:
            nearestExamenVista.conCorreccionLejanaInterpretacion,
          ojoIzquierdoCercanaConCorreccion:
            nearestExamenVista.ojoIzquierdoCercanaConCorreccion,
          ojoDerechoCercanaConCorreccion:
            nearestExamenVista.ojoDerechoCercanaConCorreccion,
          conCorreccionCercanaInterpretacion:
            nearestExamenVista.conCorreccionCercanaInterpretacion,
          placasCorrectas: nearestExamenVista.placasCorrectas,
          porcentajeIshihara: nearestExamenVista.porcentajeIshihara,
          interpretacionIshihara: nearestExamenVista.interpretacionIshihara,
        }
      : null;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = this.mapMedicoFirmante(
      medicoFirmante
        ? {
            nombre: medicoFirmante.nombre,
            primerApellido: medicoFirmante.primerApellido,
            segundoApellido: medicoFirmante.segundoApellido,
            tituloProfesional: medicoFirmante.tituloProfesional,
            universidad: medicoFirmante.universidad,
            numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional,
            especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo,
            numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista,
            nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional,
            numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional,
            nombreCredencialAdicional2:
              medicoFirmante.nombreCredencialAdicional2,
            numeroCredencialAdicional2:
              medicoFirmante.numeroCredencialAdicional2,
            firma:
              (medicoFirmante.firma as { data: string; contentType: string }) ||
              null,
          }
        : null,
    );

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(certificado.fechaCertificado)
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Certificado ${fecha}.pdf`;

    const rutaDirectorio = path.resolve(certificado.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);

    const docDefinition = certificadoInforme(
      nombreEmpresa,
      datosTrabajador,
      datosCertificado,
      datosExploracionFisica,
      datosExamenVista,
      datosMedicoFirmante,
      datosProveedorSalud,
      footerData,
    );
    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'certificado',
      certificadoId,
    );

    return rutaCompleta;
  }

  async getInformeCertificadoExpedito(
    empresaId: string,
    trabajadorId: string,
    certificadoExpeditoId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);
    const nombreEmpresa = empresa.nombreComercial;

    const trabajador = await this.trabajadoresService.findOne(trabajadorId);
    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const certificadoExpedito = await this.expedientesService.findDocument(
      'certificadoExpedito',
      certificadoExpeditoId,
    );
    const datosCertificadoExpedito = {
      fechaCertificadoExpedito: certificadoExpedito.fechaCertificadoExpedito,
      cuerpoCertificado: certificadoExpedito.cuerpoCertificado,
      impedimentosFisicos: certificadoExpedito.impedimentosFisicos,
      peso: certificadoExpedito.peso,
      altura: certificadoExpedito.altura,
      indiceMasaCorporal: certificadoExpedito.indiceMasaCorporal,
      tensionArterialSistolica: certificadoExpedito.tensionArterialSistolica,
      tensionArterialDiastolica: certificadoExpedito.tensionArterialDiastolica,
      frecuenciaCardiaca: certificadoExpedito.frecuenciaCardiaca,
      frecuenciaRespiratoria: certificadoExpedito.frecuenciaRespiratoria,
      temperaturaCorporal: certificadoExpedito.temperaturaCorporal,
      gradoSalud: certificadoExpedito.gradoSalud,
      aptitudPuesto: certificadoExpedito.aptitudPuesto,
      descripcionSobreAptitud: certificadoExpedito.descripcionSobreAptitud,
      observaciones: certificadoExpedito.observaciones,
    };

    let footerData: FooterFirmantesData | undefined = footerFirmantesData;
    if (
      !footerData &&
      (certificadoExpedito.estado === DocumentoEstado.FINALIZADO ||
        certificadoExpedito.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (certificadoExpedito.createdBy?._id || certificadoExpedito.createdBy)?.toString() ||
        userId;
      const finalizadorId =
        (certificadoExpedito.finalizadoPor?._id || certificadoExpedito.finalizadoPor)?.toString() ||
        userId;
      if (creadorId !== finalizadorId) {
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);
        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
    }

    const firmanteUserId =
      certificadoExpedito.estado === DocumentoEstado.BORRADOR
        ? (certificadoExpedito.createdBy?._id || certificadoExpedito.createdBy)?.toString() ||
          userId
        : certificadoExpedito.estado === DocumentoEstado.FINALIZADO ||
            certificadoExpedito.estado === DocumentoEstado.ANULADO
          ? (certificadoExpedito.finalizadoPor?._id || certificadoExpedito.finalizadoPor)?.toString() ||
            userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = this.mapMedicoFirmante(
      medicoFirmante
        ? {
            nombre: medicoFirmante.nombre,
            primerApellido: medicoFirmante.primerApellido,
            segundoApellido: medicoFirmante.segundoApellido,
            tituloProfesional: medicoFirmante.tituloProfesional,
            universidad: medicoFirmante.universidad,
            numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional,
            especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo,
            numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista,
            nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional,
            numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional,
            firma:
              (medicoFirmante.firma as { data: string; contentType: string }) ||
              null,
          }
        : null,
    );

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(
      certificadoExpedito.fechaCertificadoExpedito,
    )
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Certificado Expedito ${fecha}.pdf`;

    const rutaDirectorio = path.resolve(certificadoExpedito.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);

    const docDefinition = certificadoExpeditoInforme(
      nombreEmpresa,
      datosTrabajador,
      datosCertificadoExpedito,
      datosMedicoFirmante,
      datosProveedorSalud,
      footerData,
    );
    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'certificadoExpedito',
      certificadoExpeditoId,
    );

    return rutaCompleta;
  }

  async getInformeExamenVista(
    empresaId: string,
    trabajadorId: string,
    examenVistaId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);
    const nombreEmpresa = empresa.nombreComercial;

    const trabajador = await this.trabajadoresService.findOne(trabajadorId);
    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const examenVista = await this.expedientesService.findDocument(
      'examenVista',
      examenVistaId,
    );
    const datosExamenVistaDoc = {
      fechaExamenVista: examenVista.fechaExamenVista,
      ojoIzquierdoCegueraTotal: examenVista.ojoIzquierdoCegueraTotal,
      ojoDerechoCegueraTotal: examenVista.ojoDerechoCegueraTotal,
      ojoIzquierdoLejanaCegueraTotal: examenVista.ojoIzquierdoLejanaCegueraTotal,
      ojoDerechoLejanaCegueraTotal: examenVista.ojoDerechoLejanaCegueraTotal,
      ojoIzquierdoCercanaCegueraTotal: examenVista.ojoIzquierdoCercanaCegueraTotal,
      ojoDerechoCercanaCegueraTotal: examenVista.ojoDerechoCercanaCegueraTotal,
      ojoIzquierdoLejanaSinCorreccion: examenVista.ojoIzquierdoLejanaSinCorreccion,
      ojoDerechoLejanaSinCorreccion: examenVista.ojoDerechoLejanaSinCorreccion,
      sinCorreccionLejanaInterpretacion: examenVista.sinCorreccionLejanaInterpretacion,
      requiereLentesUsoGeneral: examenVista.requiereLentesUsoGeneral,
      ojoIzquierdoCercanaSinCorreccion: examenVista.ojoIzquierdoCercanaSinCorreccion,
      ojoDerechoCercanaSinCorreccion: examenVista.ojoDerechoCercanaSinCorreccion,
      sinCorreccionCercanaInterpretacion: examenVista.sinCorreccionCercanaInterpretacion,
      requiereLentesParaLectura: examenVista.requiereLentesParaLectura,
      ojoIzquierdoLejanaConCorreccion: examenVista.ojoIzquierdoLejanaConCorreccion,
      ojoDerechoLejanaConCorreccion: examenVista.ojoDerechoLejanaConCorreccion,
      conCorreccionLejanaInterpretacion: examenVista.conCorreccionLejanaInterpretacion,
      ojoIzquierdoCercanaConCorreccion: examenVista.ojoIzquierdoCercanaConCorreccion,
      ojoDerechoCercanaConCorreccion: examenVista.ojoDerechoCercanaConCorreccion,
      conCorreccionCercanaInterpretacion: examenVista.conCorreccionCercanaInterpretacion,
      placasCorrectas: examenVista.placasCorrectas,
      porcentajeIshihara: examenVista.porcentajeIshihara,
      interpretacionIshihara: examenVista.interpretacionIshihara,
    };

    let footerData: FooterFirmantesData | undefined = footerFirmantesData;
    if (
      !footerData &&
      (examenVista.estado === DocumentoEstado.FINALIZADO ||
        examenVista.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (examenVista.createdBy?._id || examenVista.createdBy)?.toString() ||
        userId;
      const finalizadorId =
        (examenVista.finalizadoPor?._id || examenVista.finalizadoPor)?.toString() ||
        userId;
      if (creadorId !== finalizadorId) {
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);
        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
    }

    const firmanteUserId =
      examenVista.estado === DocumentoEstado.BORRADOR
        ? (examenVista.createdBy?._id || examenVista.createdBy)?.toString() ||
          userId
        : examenVista.estado === DocumentoEstado.FINALIZADO ||
            examenVista.estado === DocumentoEstado.ANULADO
          ? (examenVista.finalizadoPor?._id || examenVista.finalizadoPor)?.toString() ||
            userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = this.mapMedicoFirmante(
      medicoFirmante
        ? {
            nombre: medicoFirmante.nombre,
            primerApellido: medicoFirmante.primerApellido,
            segundoApellido: medicoFirmante.segundoApellido,
            tituloProfesional: medicoFirmante.tituloProfesional,
            universidad: medicoFirmante.universidad,
            numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional,
            especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo,
            numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista,
            nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional,
            numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional,
            firma:
              (medicoFirmante.firma as { data: string; contentType: string }) ||
              null,
          }
        : null,
    );

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
      ? {
          nombre: enfermeraFirmante.nombre || '',
          primerApellido: enfermeraFirmante.primerApellido || '',
          segundoApellido: enfermeraFirmante.segundoApellido || '',
          sexo: enfermeraFirmante.sexo || '',
          tituloProfesional: enfermeraFirmante.tituloProfesional || '',
          numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || '',
          nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || '',
          numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || '',
          firma:
            (enfermeraFirmante.firma as { data: string; contentType: string }) ||
            null,
        }
      : {
          nombre: '',
          primerApellido: '',
          segundoApellido: '',
          sexo: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const tecnicoFirmante =
      await this.tecnicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosTecnicoFirmante = tecnicoFirmante
      ? {
          nombre: tecnicoFirmante.nombre || '',
          primerApellido: tecnicoFirmante.primerApellido || '',
          segundoApellido: tecnicoFirmante.segundoApellido || '',
          sexo: tecnicoFirmante.sexo || '',
          tituloProfesional: tecnicoFirmante.tituloProfesional || '',
          numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || '',
          nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || '',
          numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || '',
          firma:
            (tecnicoFirmante.firma as { data: string; contentType: string }) ||
            null,
        }
      : {
          nombre: '',
          primerApellido: '',
          segundoApellido: '',
          sexo: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(examenVista.fechaExamenVista)
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Examen Vista ${fecha}.pdf`;

    const rutaDirectorio = path.resolve(examenVista.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);

    const docDefinition = examenVistaInforme(
      nombreEmpresa,
      datosTrabajador,
      datosExamenVistaDoc,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
      datosProveedorSalud,
      footerData,
    );
    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'examenVista',
      examenVistaId,
    );

    return rutaCompleta;
  }
  async getInformeExploracionFisica(
    empresaId: string,
    trabajadorId: string,
    exploracionFisicaId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);

    const nombreEmpresa = empresa.nombreComercial;

    const trabajador = await this.trabajadoresService.findOne(trabajadorId);

    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const exploracionFisica = await this.expedientesService.findDocument(
      'exploracionFisica',
      exploracionFisicaId,
    );

    const datosExploracionFisica = {
      fechaExploracionFisica: exploracionFisica.fechaExploracionFisica,
      peso: exploracionFisica.peso,
      altura: exploracionFisica.altura,
      indiceMasaCorporal: exploracionFisica.indiceMasaCorporal,
      categoriaIMC: exploracionFisica.categoriaIMC,
      circunferenciaCintura: exploracionFisica.circunferenciaCintura,
      categoriaCircunferenciaCintura:
        exploracionFisica.categoriaCircunferenciaCintura,
      tensionArterialSistolica: exploracionFisica.tensionArterialSistolica,
      tensionArterialDiastolica: exploracionFisica.tensionArterialDiastolica,
      categoriaTensionArterial: exploracionFisica.categoriaTensionArterial,
      frecuenciaCardiaca: exploracionFisica.frecuenciaCardiaca,
      categoriaFrecuenciaCardiaca:
        exploracionFisica.categoriaFrecuenciaCardiaca,
      frecuenciaRespiratoria: exploracionFisica.frecuenciaRespiratoria,
      categoriaFrecuenciaRespiratoria:
        exploracionFisica.categoriaFrecuenciaRespiratoria,
      saturacionOxigeno: exploracionFisica.saturacionOxigeno,
      categoriaSaturacionOxigeno: exploracionFisica.categoriaSaturacionOxigeno,
      craneoCara: exploracionFisica.craneoCara,
      ojos: exploracionFisica.ojos,
      oidos: exploracionFisica.oidos,
      nariz: exploracionFisica.nariz,
      boca: exploracionFisica.boca,
      cuello: exploracionFisica.cuello,
      hombros: exploracionFisica.hombros,
      codos: exploracionFisica.codos,
      manos: exploracionFisica.manos,
      reflejosOsteoTendinososSuperiores:
        exploracionFisica.reflejosOsteoTendinososSuperiores,
      vascularESuperiores: exploracionFisica.vascularESuperiores,
      torax: exploracionFisica.torax,
      abdomen: exploracionFisica.abdomen,
      cadera: exploracionFisica.cadera,
      rodillas: exploracionFisica.rodillas,
      tobillosPies: exploracionFisica.tobillosPies,
      reflejosOsteoTendinososInferiores:
        exploracionFisica.reflejosOsteoTendinososInferiores,
      vascularEInferiores: exploracionFisica.vascularEInferiores,
      inspeccionColumna: exploracionFisica.inspeccionColumna,
      movimientosColumna: exploracionFisica.movimientosColumna,
      lesionesPiel: exploracionFisica.lesionesPiel,
      cicatrices: exploracionFisica.cicatrices,
      nevos: exploracionFisica.nevos,
      coordinacion: exploracionFisica.coordinacion,
      sensibilidad: exploracionFisica.sensibilidad,
      equilibrio: exploracionFisica.equilibrio,
      marcha: exploracionFisica.marcha,
      resumenExploracionFisica: exploracionFisica.resumenExploracionFisica,
    };

    // Determinar footerFirmantesData según estado del documento
    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (exploracionFisica.estado === DocumentoEstado.FINALIZADO ||
        exploracionFisica.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (
          exploracionFisica.createdBy?._id || exploracionFisica.createdBy
        )?.toString() || userId;
      const finalizadorId =
        (
          exploracionFisica.finalizadoPor?._id ||
          exploracionFisica.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        // Obtener datos de ambos firmantes
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
      // Si creador === finalizador, footerData queda undefined (formato simple)
    }
    // Si está en BORRADOR, footerData queda undefined (formato simple)

    // Determinar qué userId usar para obtener firmante (solo para formato simple o cuando creador === finalizador)
    const firmanteUserId =
      exploracionFisica.estado === DocumentoEstado.BORRADOR
        ? (
            exploracionFisica.createdBy?._id || exploracionFisica.createdBy
          )?.toString() || userId
        : exploracionFisica.estado === DocumentoEstado.FINALIZADO ||
            exploracionFisica.estado === DocumentoEstado.ANULADO
          ? (
              exploracionFisica.finalizadoPor?._id ||
              exploracionFisica.finalizadoPor
            )?.toString() || userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
        primerApellido: medicoFirmante.primerApellido || "",
        segundoApellido: medicoFirmante.segundoApellido || "",
        tituloProfesional: medicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional || "",
        especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo || "",
        numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista || "",
        nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional || "",
        firma: medicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        primerApellido: enfermeraFirmante.primerApellido || "",
        segundoApellido: enfermeraFirmante.segundoApellido || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante =
      await this.tecnicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        primerApellido: tecnicoFirmante.primerApellido || "",
        segundoApellido: tecnicoFirmante.segundoApellido || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(
      exploracionFisica.fechaExploracionFisica,
    )
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Exploracion Fisica ${fecha}.pdf`;

    const rutaDirectorio = path.resolve(exploracionFisica.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);

    const docDefinition = exploracionFisicaInforme(
      nombreEmpresa,
      datosTrabajador,
      datosExploracionFisica,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
      datosProveedorSalud,
      footerData,
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'exploracionFisica',
      exploracionFisicaId,
    );

    return rutaCompleta;
  }

  async getInformeHistoriaClinica(
    empresaId: string,
    trabajadorId: string,
    historiaClinicaId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);

    const nombreEmpresa = empresa.nombreComercial;

    const trabajador = await this.trabajadoresService.findOne(trabajadorId);

    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
      contactoEmergenciaNombre: trabajador.contactoEmergenciaNombre ?? '',
      contactoEmergenciaTelefono: trabajador.contactoEmergenciaTelefono ?? '',
    };

    const historiaClinica = await this.expedientesService.findDocument(
      'historiaClinica',
      historiaClinicaId,
    );

    const datosHistoriaClinica = {
      motivoExamen: historiaClinica.motivoExamen,
      fechaHistoriaClinica: historiaClinica.fechaHistoriaClinica,
      // Antecedentes Heredofamiliares
      nefropatias: historiaClinica.nefropatias,
      nefropatiasEspecificar: historiaClinica.nefropatiasEspecificar,
      diabeticos: historiaClinica.diabeticos,
      diabeticosEspecificar: historiaClinica.diabeticosEspecificar,
      hipertensivos: historiaClinica.hipertensivos,
      hipertensivosEspecificar: historiaClinica.hipertensivosEspecificar,
      cardiopaticos: historiaClinica.cardiopaticos,
      cardiopaticosEspecificar: historiaClinica.cardiopaticosEspecificar,
      neoplasicos: historiaClinica.neoplasicos,
      neoplasicosEspecificar: historiaClinica.neoplasicosEspecificar,
      psiquiatricos: historiaClinica.psiquiatricos,
      psiquiatricosEspecificar: historiaClinica.psiquiatricosEspecificar,
      epilepticos: historiaClinica.epilepticos,
      epilepticosEspecificar: historiaClinica.epilepticosEspecificar,
      autoinmunes: historiaClinica.autoinmunes,
      autoinmunesEspecificar: historiaClinica.autoinmunesEspecificar,
      tuberculosis: historiaClinica.tuberculosis,
      tuberculosisEspecificar: historiaClinica.tuberculosisEspecificar,
      hepatopatias: historiaClinica.hepatopatias,
      hepatopatiasEspecificar: historiaClinica.hepatopatiasEspecificar,
      // Antecedentes Personales Patologicos
      lumbalgias: historiaClinica.lumbalgias,
      lumbalgiasEspecificar: historiaClinica.lumbalgiasEspecificar,
      diabeticosPP: historiaClinica.diabeticosPP,
      diabeticosPPEspecificar: historiaClinica.diabeticosPPEspecificar,
      cardiopaticosPP: historiaClinica.cardiopaticosPP,
      cardiopaticosPPEspecificar: historiaClinica.cardiopaticosPPEspecificar,
      alergicos: historiaClinica.alergicos,
      alergicosEspecificar: historiaClinica.alergicosEspecificar,
      hipertensivosPP: historiaClinica.hipertensivosPP,
      hipertensivosPPEspecificar: historiaClinica.hipertensivosPPEspecificar,
      respiratorios: historiaClinica.respiratorios,
      respiratoriosEspecificar: historiaClinica.respiratoriosEspecificar,
      epilepticosPP: historiaClinica.epilepticosPP,
      epilepticosPPEspecificar: historiaClinica.epilepticosPPEspecificar,
      accidentes: historiaClinica.accidentes,
      accidentesEspecificar: historiaClinica.accidentesEspecificar,
      quirurgicos: historiaClinica.quirurgicos,
      quirurgicosEspecificar: historiaClinica.quirurgicosEspecificar,
      otros: historiaClinica.otros,
      otrosEspecificar: historiaClinica.otrosEspecificar,
      // Antecedentes Personales No Patologicos
      alcoholismo: historiaClinica.alcoholismo,
      alcoholismoEspecificar: historiaClinica.alcoholismoEspecificar,
      tabaquismo: historiaClinica.tabaquismo,
      tabaquismoEspecificar: historiaClinica.tabaquismoEspecificar,
      toxicomanias: historiaClinica.toxicomanias,
      toxicomaniasEspecificar: historiaClinica.toxicomaniasEspecificar,
      alimentacionDeficiente: historiaClinica.alimentacionDeficiente,
      alimentacionDeficienteEspecificar:
        historiaClinica.alimentacionDeficienteEspecificar,
      actividadFisicaDeficiente: historiaClinica.actividadFisicaDeficiente,
      actividadFisicaDeficienteEspecificar:
        historiaClinica.actividadFisicaDeficienteEspecificar,
      higienePersonalDeficiente: historiaClinica.higienePersonalDeficiente,
      higienePersonalDeficienteEspecificar:
        historiaClinica.higienePersonalDeficienteEspecificar,
      // Antecedentes Gineco-Obstetricos
      menarca: historiaClinica.menarca,
      duracionPromedio: historiaClinica.duracionPromedio,
      frecuencia: historiaClinica.frecuencia,
      gestas: historiaClinica.gestas,
      partos: historiaClinica.partos,
      cesareas: historiaClinica.cesareas,
      abortos: historiaClinica.abortos,
      fechaUltimaRegla: historiaClinica.fechaUltimaRegla,
      dolorMenstrual: historiaClinica.dolorMenstrual,
      embarazoActual: historiaClinica.embarazoActual,
      planificacionFamiliar: historiaClinica.planificacionFamiliar,
      vidaSexualActiva: historiaClinica.vidaSexualActiva,
      fechaUltimoPapanicolaou: historiaClinica.fechaUltimoPapanicolaou,
      fechaUltimaMastografia: historiaClinica.fechaUltimaMastografia,
      // Antecedentes Laborales
      empresaAnterior1: historiaClinica.empresaAnterior1,
      puestoAnterior1: historiaClinica.puestoAnterior1,
      antiguedadAnterior1: historiaClinica.antiguedadAnterior1,
      agentesAnterior1: historiaClinica.agentesAnterior1,
      empresaAnterior2: historiaClinica.empresaAnterior2,
      puestoAnterior2: historiaClinica.puestoAnterior2,
      antiguedadAnterior2: historiaClinica.antiguedadAnterior2,
      agentesAnterior2: historiaClinica.agentesAnterior2,
      empresaAnterior3: historiaClinica.empresaAnterior3,
      puestoAnterior3: historiaClinica.puestoAnterior3,
      antiguedadAnterior3: historiaClinica.antiguedadAnterior3,
      agentesAnterior3: historiaClinica.agentesAnterior3,
      accidenteLaboral: historiaClinica.accidenteLaboral,
      accidenteLaboralEspecificar: historiaClinica.accidenteLaboralEspecificar,
      descripcionDelDano: historiaClinica.descripcionDelDano,
      secuelas: historiaClinica.secuelas,
      // Resumen
      resumenHistoriaClinica: historiaClinica.resumenHistoriaClinica,
    };

    // Determinar footerFirmantesData según estado del documento
    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (historiaClinica.estado === DocumentoEstado.FINALIZADO ||
        historiaClinica.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (
          historiaClinica.createdBy?._id || historiaClinica.createdBy
        )?.toString() || userId;
      const finalizadorId =
        (
          historiaClinica.finalizadoPor?._id || historiaClinica.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        // Obtener datos de ambos firmantes
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
      // Si creador === finalizador, footerData queda undefined (formato simple)
    }
    // Si está en BORRADOR, footerData queda undefined (formato simple)

    // Determinar qué userId usar para obtener firmante (solo para formato simple o cuando creador === finalizador)
    const firmanteUserId =
      historiaClinica.estado === DocumentoEstado.BORRADOR
        ? (
            historiaClinica.createdBy?._id || historiaClinica.createdBy
          )?.toString() || userId
        : historiaClinica.estado === DocumentoEstado.FINALIZADO ||
            historiaClinica.estado === DocumentoEstado.ANULADO
          ? (
              historiaClinica.finalizadoPor?._id ||
              historiaClinica.finalizadoPor
            )?.toString() || userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
        primerApellido: medicoFirmante.primerApellido || "",
        segundoApellido: medicoFirmante.segundoApellido || "",
        tituloProfesional: medicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional || "",
        especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo || "",
        numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista || "",
        nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional || "",
        firma: medicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        primerApellido: enfermeraFirmante.primerApellido || "",
        segundoApellido: enfermeraFirmante.segundoApellido || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante =
      await this.tecnicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        primerApellido: tecnicoFirmante.primerApellido || "",
        segundoApellido: tecnicoFirmante.segundoApellido || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(historiaClinica.fechaHistoriaClinica)
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Historia Clinica ${fecha}.pdf`;

    const rutaDirectorio = path.resolve(historiaClinica.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);

    const docDefinition = historiaClinicaInforme(
      nombreEmpresa,
      datosTrabajador,
      datosHistoriaClinica,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
      datosProveedorSalud,
      footerFirmantesData,
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'historiaClinica',
      historiaClinicaId,
    );

    return rutaCompleta;
  }

  async getInformeNotaMedica(
    empresaId: string,
    trabajadorId: string,
    notaMedicaId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);
    const nombreEmpresa = empresa.nombreComercial;
    const trabajador = await this.trabajadoresService.findOne(trabajadorId);
    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };
    const notaMedica = await this.expedientesService.findDocument(
      'notaMedica',
      notaMedicaId,
    );
    const datosNotaMedica = {
      tipoNota: notaMedica.tipoNota,
      fechaNotaMedica: notaMedica.fechaNotaMedica,
      motivoConsulta: notaMedica.motivoConsulta,
      antecedentes: notaMedica.antecedentes,
      exploracionFisica: notaMedica.exploracionFisica,
      tensionArterialSistolica: notaMedica.tensionArterialSistolica,
      tensionArterialDiastolica: notaMedica.tensionArterialDiastolica,
      frecuenciaCardiaca: notaMedica.frecuenciaCardiaca,
      frecuenciaRespiratoria: notaMedica.frecuenciaRespiratoria,
      temperatura: notaMedica.temperatura,
      saturacionOxigeno: notaMedica.saturacionOxigeno,
      // CEX NOM-024: Datos demográficos
      genero: notaMedica.genero,
      derechohabiencia: notaMedica.derechohabiencia,
      // CEX: Somatometría
      peso: notaMedica.peso,
      talla: notaMedica.talla,
      circunferenciaCintura: notaMedica.circunferenciaCintura,
      indiceMasaCorporal: notaMedica.indiceMasaCorporal,
      categoriaIMC: notaMedica.categoriaIMC,
      categoriaCircunferenciaCintura: notaMedica.categoriaCircunferenciaCintura,
      // CEX: Glucemia
      glucemia: notaMedica.glucemia,
      tipoMedicion: notaMedica.tipoMedicion,
      resultadoObtenidoaTravesde: notaMedica.resultadoObtenidoaTravesde,
      // CEX: Embarazo
      relacionTemporalEmbarazo: notaMedica.relacionTemporalEmbarazo,
      trimestreGestacional: notaMedica.trimestreGestacional,
      diagnostico: notaMedica.diagnostico, // Legacy field, opcional
      // NOM-024: CIE-10 Diagnosis Codes
      codigoCIE10Principal: notaMedica.codigoCIE10Principal,
      codigosCIE10Complementarios: notaMedica.codigosCIE10Complementarios,
      relacionTemporal: notaMedica.relacionTemporal,
      primeraVezDiagnostico2: notaMedica.primeraVezDiagnostico2,
      codigoCIEDiagnostico2: notaMedica.codigoCIEDiagnostico2,
      confirmacionDiagnostica2: notaMedica.confirmacionDiagnostica2,
      primeraVezDiagnostico3: notaMedica.primeraVezDiagnostico3,
      codigoCIEDiagnostico3: notaMedica.codigoCIEDiagnostico3,
      confirmacionDiagnostica3: notaMedica.confirmacionDiagnostica3,
      diagnosticoTexto: notaMedica.diagnosticoTexto,
      confirmacionDiagnostica: notaMedica.confirmacionDiagnostica,
      muestraConfirmacionDiagnostica1: false,
      muestraConfirmacionDiagnostica2: false,
      muestraConfirmacionDiagnostica3: false,
      codigoCIECausaExterna: notaMedica.codigoCIECausaExterna,
      causaExterna: notaMedica.causaExterna,
      tratamiento: notaMedica.tratamiento,
      recomendaciones: notaMedica.recomendaciones,
      observaciones: notaMedica.observaciones,
    };

    // Determinar footerFirmantesData según estado del documento
    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (notaMedica.estado === DocumentoEstado.FINALIZADO ||
        notaMedica.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (notaMedica.createdBy?._id || notaMedica.createdBy)?.toString() ||
        userId;
      const finalizadorId =
        (
          notaMedica.finalizadoPor?._id || notaMedica.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        // Obtener datos de ambos firmantes
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
      // Si creador === finalizador, footerData queda undefined (formato simple)
    }
    // Si está en BORRADOR, footerData queda undefined (formato simple)

    // Determinar qué userId usar para obtener firmante (solo para formato simple o cuando creador === finalizador)
    const firmanteUserId =
      notaMedica.estado === DocumentoEstado.BORRADOR
        ? (notaMedica.createdBy?._id || notaMedica.createdBy)?.toString() ||
          userId
        : notaMedica.estado === DocumentoEstado.FINALIZADO ||
            notaMedica.estado === DocumentoEstado.ANULADO
          ? (
              notaMedica.finalizadoPor?._id || notaMedica.finalizadoPor
            )?.toString() || userId
          : userId;

    const prestadorData = firmanteUserId
      ? await this.firmanteHelper.getPrestadorDataFromUser(firmanteUserId)
      : null;
    const confirmacionFlags = await computeMuestraConfirmacionFlagsForNotaMedica(
      this.catalogsService,
      {
        codigoCIE10Principal: notaMedica.codigoCIE10Principal,
        codigoCIEDiagnostico2: notaMedica.codigoCIEDiagnostico2,
        codigoCIEDiagnostico3: notaMedica.codigoCIEDiagnostico3,
        relacionTemporal: notaMedica.relacionTemporal,
        primeraVezDiagnostico2: notaMedica.primeraVezDiagnostico2,
        primeraVezDiagnostico3: notaMedica.primeraVezDiagnostico3,
        tipoPersonal: prestadorData?.tipoPersonal ?? null,
        fechaNacimiento: trabajador.fechaNacimiento,
        fechaNotaMedica: notaMedica.fechaNotaMedica,
      },
    );
    datosNotaMedica.muestraConfirmacionDiagnostica1 =
      confirmacionFlags.confirmacion1;
    datosNotaMedica.muestraConfirmacionDiagnostica2 =
      confirmacionFlags.confirmacion2;
    datosNotaMedica.muestraConfirmacionDiagnostica3 =
      confirmacionFlags.confirmacion3;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = this.mapMedicoFirmante(
      medicoFirmante
        ? {
            nombre: medicoFirmante.nombre,
            primerApellido: medicoFirmante.primerApellido,
            segundoApellido: medicoFirmante.segundoApellido,
            tituloProfesional: medicoFirmante.tituloProfesional,
            universidad: medicoFirmante.universidad,
            numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional,
            especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo,
            numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista,
            nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional,
            numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional,
            firma:
              (medicoFirmante.firma as { data: string; contentType: string }) ||
              null,
          }
        : null,
    );

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
      ? {
          nombre: enfermeraFirmante.nombre || '',
          primerApellido: enfermeraFirmante.primerApellido || '',
          segundoApellido: enfermeraFirmante.segundoApellido || '',
          sexo: enfermeraFirmante.sexo || '',
          tituloProfesional: enfermeraFirmante.tituloProfesional || '',
          numeroCedulaProfesional:
            enfermeraFirmante.numeroCedulaProfesional || '',
          nombreCredencialAdicional:
            enfermeraFirmante.nombreCredencialAdicional || '',
          numeroCredencialAdicional:
            enfermeraFirmante.numeroCredencialAdicional || '',
          firma:
            (enfermeraFirmante.firma as {
              data: string;
              contentType: string;
            }) || null,
        }
      : {
          nombre: '',
          primerApellido: '',
          segundoApellido: '',
          sexo: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(notaMedica.fechaNotaMedica)
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Nota Medica ${fecha}.pdf`;
    const rutaDirectorio = path.resolve(notaMedica.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);
    const docDefinition = notaMedicaInforme(
      nombreEmpresa,
      datosTrabajador,
      datosNotaMedica,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosProveedorSalud,
      footerData,
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'notaMedica',
      notaMedicaId,
    );
    return rutaCompleta;
  }

  async getInformeNotaAclaratoria(
    empresaId: string,
    trabajadorId: string,
    notaAclaratoriaId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);
    const nombreEmpresa = empresa.nombreComercial;
    const trabajador = await this.trabajadoresService.findOne(trabajadorId);
    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };
    const notaAclaratoria = await this.expedientesService.findDocument(
      'notaAclaratoria',
      notaAclaratoriaId,
    );

    // Obtener documento origen completo
    const documentoOrigenTipo = notaAclaratoria.documentoOrigenTipo;
    const documentoOrigenId = notaAclaratoria.documentoOrigenId;

    // Normalizar tipo de documento (convertir plural a singular para buscar en BD)
    const tipoDocumentoNormalizado =
      this.normalizarTipoDocumento(documentoOrigenTipo);

    let documentoOrigen: any = null;
    try {
      documentoOrigen = await this.expedientesService.findDocument(
        tipoDocumentoNormalizado,
        documentoOrigenId,
      );
    } catch (error) {
      console.error(
        `[getInformeNotaAclaratoria] No se pudo obtener documento origen: ${error.message}`,
      );
    }

    // Extraer información del documento origen
    const fechaPrincipalField =
      this.getFechaPrincipalField(documentoOrigenTipo);

    // Determinar el nombre del documento
    let nombreDocumento = this.getNombreDocumento(documentoOrigenTipo);
    const esDocumentoExterno =
      documentoOrigenTipo === 'documentoExterno' ||
      documentoOrigenTipo === 'documentosExternos';

    // Para documentos externos, usar el nombre específico si está disponible
    if (esDocumentoExterno && documentoOrigen?.nombreDocumento) {
      nombreDocumento = documentoOrigen.nombreDocumento;
    }

    const datosDocumentoOrigen = documentoOrigen
      ? {
          tipoDocumento: documentoOrigenTipo,
          nombreDocumento: nombreDocumento,
          fechaPrincipal: documentoOrigen[fechaPrincipalField] || null,
          fechaCreacion: documentoOrigen.createdAt || null,
          estado: documentoOrigen.estado || '',
          fechaFinalizacion: documentoOrigen.fechaFinalizacion || null,
          finalizadoPor: documentoOrigen.finalizadoPor?.username || '',
          fechaAnulacion: documentoOrigen.fechaAnulacion || null,
          anuladoPor: documentoOrigen.anuladoPor?.username || '',
          razonAnulacion: documentoOrigen.razonAnulacion || '',
          campoDistintivo: this.getCampoDistintivo(
            documentoOrigen,
            documentoOrigenTipo,
          ),
        }
      : {
          tipoDocumento: documentoOrigenTipo,
          nombreDocumento: nombreDocumento,
          fechaPrincipal: null,
          fechaCreacion: null,
          estado: 'No encontrado',
          fechaFinalizacion: null,
          finalizadoPor: '',
          fechaAnulacion: null,
          anuladoPor: '',
          razonAnulacion: '',
          campoDistintivo: '',
        };

    const datosNotaAclaratoria = {
      documentoOrigenId: notaAclaratoria.documentoOrigenId,
      documentoOrigenTipo: notaAclaratoria.documentoOrigenTipo,
      fechaNotaAclaratoria: notaAclaratoria.fechaNotaAclaratoria,
      motivoAclaracion: notaAclaratoria.motivoAclaracion,
      descripcionAclaracion: notaAclaratoria.descripcionAclaracion,
      alcanceAclaracion: notaAclaratoria.alcanceAclaracion,
      impactoClinico: notaAclaratoria.impactoClinico,
    };

    // Determinar footerFirmantesData según estado del documento
    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (notaAclaratoria.estado === DocumentoEstado.FINALIZADO ||
        notaAclaratoria.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (
          notaAclaratoria.createdBy?._id || notaAclaratoria.createdBy
        )?.toString() || userId;
      const finalizadorId =
        (
          notaAclaratoria.finalizadoPor?._id || notaAclaratoria.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        // Obtener datos de ambos firmantes
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
      // Si creador === finalizador, footerData queda undefined (formato simple)
    }
    // Si está en BORRADOR, footerData queda undefined (formato simple)

    // Determinar qué userId usar para obtener firmante (solo para formato simple o cuando creador === finalizador)
    const firmanteUserId =
      notaAclaratoria.estado === DocumentoEstado.BORRADOR
        ? (
            notaAclaratoria.createdBy?._id || notaAclaratoria.createdBy
          )?.toString() || userId
        : notaAclaratoria.estado === DocumentoEstado.FINALIZADO ||
            notaAclaratoria.estado === DocumentoEstado.ANULADO
          ? (
              notaAclaratoria.finalizadoPor?._id ||
              notaAclaratoria.finalizadoPor
            )?.toString() || userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = this.mapMedicoFirmante(
      medicoFirmante
        ? {
            nombre: medicoFirmante.nombre,
            primerApellido: medicoFirmante.primerApellido,
            segundoApellido: medicoFirmante.segundoApellido,
            tituloProfesional: medicoFirmante.tituloProfesional,
            universidad: medicoFirmante.universidad,
            numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional,
            especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo,
            numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista,
            nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional,
            numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional,
            firma:
              (medicoFirmante.firma as { data: string; contentType: string }) ||
              null,
          }
        : null,
    );

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
      ? {
          nombre: enfermeraFirmante.nombre || '',
          primerApellido: enfermeraFirmante.primerApellido || '',
          segundoApellido: enfermeraFirmante.segundoApellido || '',
          sexo: enfermeraFirmante.sexo || '',
          tituloProfesional: enfermeraFirmante.tituloProfesional || '',
          numeroCedulaProfesional:
            enfermeraFirmante.numeroCedulaProfesional || '',
          nombreCredencialAdicional:
            enfermeraFirmante.nombreCredencialAdicional || '',
          numeroCredencialAdicional:
            enfermeraFirmante.numeroCredencialAdicional || '',
          firma:
            (enfermeraFirmante.firma as {
              data: string;
              contentType: string;
            }) || null,
        }
      : {
          nombre: '',
          primerApellido: '',
          segundoApellido: '',
          sexo: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(notaAclaratoria.fechaNotaAclaratoria)
      .replace(/\//g, '-')
      .replace(/\\/g, '-');

    // Construir nombre del documento que aclara
    let documentoQueAclara = this.getNombreDocumento(documentoOrigenTipo);

    // Para documentos externos, usar el nombre específico si está disponible
    if (
      documentoOrigenTipo === 'documentoExterno' ||
      documentoOrigenTipo === 'documentosExternos'
    ) {
      if (documentoOrigen && documentoOrigen.nombreDocumento) {
        documentoQueAclara = documentoOrigen.nombreDocumento;
      }
    }

    // Agregar fecha del documento origen si está disponible
    if (datosDocumentoOrigen.fechaPrincipal) {
      const fechaOrigen = convertirFechaADDMMAAAA(
        datosDocumentoOrigen.fechaPrincipal,
      )
        .replace(/\//g, '-')
        .replace(/\\/g, '-');
      documentoQueAclara = `${documentoQueAclara} ${fechaOrigen}`;
    }

    const nombreArchivo = `Nota Aclaratoria ${fecha} (${documentoQueAclara}).pdf`;
    const rutaDirectorio = path.resolve(notaAclaratoria.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);
    const docDefinition = notaAclaratoriaInforme(
      nombreEmpresa,
      datosTrabajador,
      datosNotaAclaratoria,
      datosDocumentoOrigen,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosProveedorSalud,
      footerData,
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'notaAclaratoria',
      notaAclaratoriaId,
    );
    return rutaCompleta;
  }

  async getInformeControlPrenatal(
    empresaId: string,
    trabajadorId: string,
    controlPrenatalId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);
    const nombreEmpresa = empresa.nombreComercial;
    const trabajador = await this.trabajadoresService.findOne(trabajadorId);
    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };
    const controlPrenatal = await this.expedientesService.findDocument(
      'controlPrenatal',
      controlPrenatalId,
    );
    const datosControlPrenatal = {
      fechaInicioControlPrenatal: controlPrenatal.fechaInicioControlPrenatal,
      altura: controlPrenatal.altura,
      menarca: controlPrenatal.menarca,
      ciclos: controlPrenatal.ciclos,
      ivsa: controlPrenatal.ivsa,
      gestas: controlPrenatal.gestas,
      partos: controlPrenatal.partos,
      cesareas: controlPrenatal.cesareas,
      abortos: controlPrenatal.abortos,
      fum: controlPrenatal.fum,
      fpp: controlPrenatal.fpp,
      metodoPlanificacionFamiliar: controlPrenatal.metodoPlanificacionFamiliar,
      eneroFecha: controlPrenatal.eneroFecha,
      eneroPeso: controlPrenatal.eneroPeso,
      eneroImc: controlPrenatal.eneroImc,
      eneroTia: controlPrenatal.eneroTia,
      eneroFcf: controlPrenatal.eneroFcf,
      eneroSdg: controlPrenatal.eneroSdg,
      eneroFondoUterino: controlPrenatal.eneroFondoUterino,
      febreroFecha: controlPrenatal.febreroFecha,
      febreroPeso: controlPrenatal.febreroPeso,
      febreroImc: controlPrenatal.febreroImc,
      febreroTia: controlPrenatal.febreroTia,
      febreroFcf: controlPrenatal.febreroFcf,
      febreroSdg: controlPrenatal.febreroSdg,
      febreroFondoUterino: controlPrenatal.febreroFondoUterino,
      marzoFecha: controlPrenatal.marzoFecha,
      marzoPeso: controlPrenatal.marzoPeso,
      marzoImc: controlPrenatal.marzoImc,
      marzoTia: controlPrenatal.marzoTia,
      marzoFcf: controlPrenatal.marzoFcf,
      marzoSdg: controlPrenatal.marzoSdg,
      marzoFondoUterino: controlPrenatal.marzoFondoUterino,
      abrilFecha: controlPrenatal.abrilFecha,
      abrilPeso: controlPrenatal.abrilPeso,
      abrilImc: controlPrenatal.abrilImc,
      abrilTia: controlPrenatal.abrilTia,
      abrilFcf: controlPrenatal.abrilFcf,
      abrilSdg: controlPrenatal.abrilSdg,
      abrilFondoUterino: controlPrenatal.abrilFondoUterino,
      mayoFecha: controlPrenatal.mayoFecha,
      mayoPeso: controlPrenatal.mayoPeso,
      mayoImc: controlPrenatal.mayoImc,
      mayoTia: controlPrenatal.mayoTia,
      mayoFcf: controlPrenatal.mayoFcf,
      mayoSdg: controlPrenatal.mayoSdg,
      mayoFondoUterino: controlPrenatal.mayoFondoUterino,
      junioFecha: controlPrenatal.junioFecha,
      junioPeso: controlPrenatal.junioPeso,
      junioImc: controlPrenatal.junioImc,
      junioTia: controlPrenatal.junioTia,
      junioFcf: controlPrenatal.junioFcf,
      junioSdg: controlPrenatal.junioSdg,
      junioFondoUterino: controlPrenatal.junioFondoUterino,
      julioFecha: controlPrenatal.julioFecha,
      julioPeso: controlPrenatal.julioPeso,
      julioImc: controlPrenatal.julioImc,
      julioTia: controlPrenatal.julioTia,
      julioFcf: controlPrenatal.julioFcf,
      julioSdg: controlPrenatal.julioSdg,
      julioFondoUterino: controlPrenatal.julioFondoUterino,
      agostoFecha: controlPrenatal.agostoFecha,
      agostoPeso: controlPrenatal.agostoPeso,
      agostoImc: controlPrenatal.agostoImc,
      agostoTia: controlPrenatal.agostoTia,
      agostoFcf: controlPrenatal.agostoFcf,
      agostoSdg: controlPrenatal.agostoSdg,
      agostoFondoUterino: controlPrenatal.agostoFondoUterino,
      septiembreFecha: controlPrenatal.septiembreFecha,
      septiembrePeso: controlPrenatal.septiembrePeso,
      septiembreImc: controlPrenatal.septiembreImc,
      septiembreTia: controlPrenatal.septiembreTia,
      septiembreFcf: controlPrenatal.septiembreFcf,
      septiembreSdg: controlPrenatal.septiembreSdg,
      septiembreFondoUterino: controlPrenatal.septiembreFondoUterino,
      octubreFecha: controlPrenatal.octubreFecha,
      octubrePeso: controlPrenatal.octubrePeso,
      octubreImc: controlPrenatal.octubreImc,
      octubreTia: controlPrenatal.octubreTia,
      octubreFcf: controlPrenatal.octubreFcf,
      octubreSdg: controlPrenatal.octubreSdg,
      octubreFondoUterino: controlPrenatal.octubreFondoUterino,
      noviembreFecha: controlPrenatal.noviembreFecha,
      noviembrePeso: controlPrenatal.noviembrePeso,
      noviembreImc: controlPrenatal.noviembreImc,
      noviembreTia: controlPrenatal.noviembreTia,
      noviembreFcf: controlPrenatal.noviembreFcf,
      noviembreSdg: controlPrenatal.noviembreSdg,
      noviembreFondoUterino: controlPrenatal.noviembreFondoUterino,
      diciembreFecha: controlPrenatal.diciembreFecha,
      diciembrePeso: controlPrenatal.diciembrePeso,
      diciembreImc: controlPrenatal.diciembreImc,
      diciembreTia: controlPrenatal.diciembreTia,
      diciembreFcf: controlPrenatal.diciembreFcf,
      diciembreSdg: controlPrenatal.diciembreSdg,
      diciembreFondoUterino: controlPrenatal.diciembreFondoUterino,
      observacionesPeso: controlPrenatal.observacionesPeso,
      observacionesImc: controlPrenatal.observacionesImc,
      observacionesTia: controlPrenatal.observacionesTia,
      observacionesFcf: controlPrenatal.observacionesFcf,
      observacionesSdg: controlPrenatal.observacionesSdg,
      observacionesFondoUterino: controlPrenatal.observacionesFondoUterino,
    };

    // Determinar footerFirmantesData según estado del documento
    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (controlPrenatal.estado === DocumentoEstado.FINALIZADO ||
        controlPrenatal.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (
          controlPrenatal.createdBy?._id || controlPrenatal.createdBy
        )?.toString() || userId;
      const finalizadorId =
        (
          controlPrenatal.finalizadoPor?._id || controlPrenatal.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        // Obtener datos de ambos firmantes
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
      // Si creador === finalizador, footerData queda undefined (formato simple)
    }
    // Si está en BORRADOR, footerData queda undefined (formato simple)

    // Determinar qué userId usar para obtener firmante (solo para formato simple o cuando creador === finalizador)
    const firmanteUserId =
      controlPrenatal.estado === DocumentoEstado.BORRADOR
        ? (
            controlPrenatal.createdBy?._id || controlPrenatal.createdBy
          )?.toString() || userId
        : controlPrenatal.estado === DocumentoEstado.FINALIZADO ||
            controlPrenatal.estado === DocumentoEstado.ANULADO
          ? (
              controlPrenatal.finalizadoPor?._id ||
              controlPrenatal.finalizadoPor
            )?.toString() || userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
        primerApellido: medicoFirmante.primerApellido || "",
        segundoApellido: medicoFirmante.segundoApellido || "",
        tituloProfesional: medicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional || "",
        especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo || "",
        numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista || "",
        nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional || "",
        firma: medicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        primerApellido: enfermeraFirmante.primerApellido || "",
        segundoApellido: enfermeraFirmante.segundoApellido || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante =
      await this.tecnicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        primerApellido: tecnicoFirmante.primerApellido || "",
        segundoApellido: tecnicoFirmante.segundoApellido || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(
      controlPrenatal.fechaInicioControlPrenatal,
    )
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Control Prenatal ${fecha}.pdf`;
    const rutaDirectorio = path.resolve(controlPrenatal.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);
    const docDefinition = controlPrenatalInforme(
      nombreEmpresa,
      datosTrabajador,
      datosControlPrenatal,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
      datosProveedorSalud,
      footerData,
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'controlPrenatal',
      controlPrenatalId,
    );
    return rutaCompleta;
  }

  async getInformeHistoriaOtologica(
    empresaId: string,
    trabajadorId: string,
    historiaOtologicaId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);
    const nombreEmpresa = empresa.nombreComercial;
    const trabajador = await this.trabajadoresService.findOne(trabajadorId);
    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };
    const historiaOtologica = await this.expedientesService.findDocument(
      'historiaOtologica',
      historiaOtologicaId,
    );
    const datosHistoriaOtologica = {
      fechaHistoriaOtologica: historiaOtologica.fechaHistoriaOtologica,
      dolorOido: historiaOtologica.dolorOido,
      supuracionOido: historiaOtologica.supuracionOido,
      mareoVertigo: historiaOtologica.mareoVertigo,
      zumbidoTinnitus: historiaOtologica.zumbidoTinnitus,
      perdidaAudicion: historiaOtologica.perdidaAudicion,
      oidoTapadoPlenitud: historiaOtologica.oidoTapadoPlenitud,
      otitisFrecuentesInfancia: historiaOtologica.otitisFrecuentesInfancia,
      cirugiasOido: historiaOtologica.cirugiasOido,
      traumatismoCranealBarotrauma:
        historiaOtologica.traumatismoCranealBarotrauma,
      usoAudifonos: historiaOtologica.usoAudifonos,
      historiaFamiliarHipoacusia: historiaOtologica.historiaFamiliarHipoacusia,
      meningitisInfeccionGraveInfancia:
        historiaOtologica.meningitisInfeccionGraveInfancia,
      diabetes: historiaOtologica.diabetes,
      enfermedadRenal: historiaOtologica.enfermedadRenal,
      medicamentosOtotoxicos: historiaOtologica.medicamentosOtotoxicos,
      trabajoAmbientesRuidosos: historiaOtologica.trabajoAmbientesRuidosos,
      tiempoExposicionLaboral: historiaOtologica.tiempoExposicionLaboral,
      usoProteccionAuditiva: historiaOtologica.usoProteccionAuditiva,
      musicaFuerteAudifonos: historiaOtologica.musicaFuerteAudifonos,
      armasFuegoPasatiemposRuidosos:
        historiaOtologica.armasFuegoPasatiemposRuidosos,
      servicioMilitar: historiaOtologica.servicioMilitar,
      alergias: historiaOtologica.alergias,
      resfriadoDiaPrueba: historiaOtologica.resfriadoDiaPrueba,
      otoscopiaOidoDerecho: historiaOtologica.otoscopiaOidoDerecho,
      otoscopiaOidoIzquierdo: historiaOtologica.otoscopiaOidoIzquierdo,
      resultadoCuestionario: historiaOtologica.resultadoCuestionario,
      resultadoCuestionarioPersonalizado:
        historiaOtologica.resultadoCuestionarioPersonalizado,
    };

    // Determinar footerFirmantesData según estado del documento
    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (historiaOtologica.estado === DocumentoEstado.FINALIZADO ||
        historiaOtologica.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (
          historiaOtologica.createdBy?._id || historiaOtologica.createdBy
        )?.toString() || userId;
      const finalizadorId =
        (
          historiaOtologica.finalizadoPor?._id ||
          historiaOtologica.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        // Obtener datos de ambos firmantes
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
      // Si creador === finalizador, footerData queda undefined (formato simple)
    }
    // Si está en BORRADOR, footerData queda undefined (formato simple)

    // Determinar qué userId usar para obtener firmante (solo para formato simple o cuando creador === finalizador)
    const firmanteUserId =
      historiaOtologica.estado === DocumentoEstado.BORRADOR
        ? (
            historiaOtologica.createdBy?._id || historiaOtologica.createdBy
          )?.toString() || userId
        : historiaOtologica.estado === DocumentoEstado.FINALIZADO ||
            historiaOtologica.estado === DocumentoEstado.ANULADO
          ? (
              historiaOtologica.finalizadoPor?._id ||
              historiaOtologica.finalizadoPor
            )?.toString() || userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
        primerApellido: medicoFirmante.primerApellido || "",
        segundoApellido: medicoFirmante.segundoApellido || "",
        tituloProfesional: medicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional || "",
        especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo || "",
        numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista || "",
        nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional || "",
        firma: medicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        primerApellido: enfermeraFirmante.primerApellido || "",
        segundoApellido: enfermeraFirmante.segundoApellido || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante =
      await this.tecnicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        primerApellido: tecnicoFirmante.primerApellido || "",
        segundoApellido: tecnicoFirmante.segundoApellido || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(
      historiaOtologica.fechaHistoriaOtologica,
    )
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Historia Otologica ${fecha}.pdf`;
    const rutaDirectorio = path.resolve(historiaOtologica.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);
    const docDefinition = historiaOtologicaInforme(
      nombreEmpresa,
      datosTrabajador,
      datosHistoriaOtologica,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
      datosProveedorSalud,
      footerData,
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'historiaOtologica',
      historiaOtologicaId,
    );
    return rutaCompleta;
  }

  async getInformePrevioEspirometria(
    empresaId: string,
    trabajadorId: string,
    previoEspirometriaId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);
    const nombreEmpresa = empresa.nombreComercial;
    const trabajador = await this.trabajadoresService.findOne(trabajadorId);
    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };
    const previoEspirometria = await this.expedientesService.findDocument(
      'previoEspirometria',
      previoEspirometriaId,
    );
    const datosPrevioEspirometria = {
      fechaPrevioEspirometria: previoEspirometria.fechaPrevioEspirometria,
      tabaquismo: previoEspirometria.tabaquismo,
      cigarrosSemana: previoEspirometria.cigarrosSemana,
      exposicionHumosBiomasa: previoEspirometria.exposicionHumosBiomasa,
      exposicionLaboralPolvos: previoEspirometria.exposicionLaboralPolvos,
      exposicionVaporesGasesIrritantes:
        previoEspirometria.exposicionVaporesGasesIrritantes,
      antecedentesTuberculosisInfeccionesRespiratorias:
        previoEspirometria.antecedentesTuberculosisInfeccionesRespiratorias,
      tosCronica: previoEspirometria.tosCronica,
      expectoracionFrecuente: previoEspirometria.expectoracionFrecuente,
      disnea: previoEspirometria.disnea,
      sibilancias: previoEspirometria.sibilancias,
      hemoptisis: previoEspirometria.hemoptisis,
      otrosSintomas: previoEspirometria.otrosSintomas,
      asma: previoEspirometria.asma,
      epocBronquitisCronica: previoEspirometria.epocBronquitisCronica,
      fibrosisPulmonar: previoEspirometria.fibrosisPulmonar,
      apneaSueno: previoEspirometria.apneaSueno,
      medicamentosActuales: previoEspirometria.medicamentosActuales,
      medicamentosActualesEspecificar:
        previoEspirometria.medicamentosActualesEspecificar,
      cirugiaReciente: previoEspirometria.cirugiaReciente,
      infeccionRespiratoriaActiva:
        previoEspirometria.infeccionRespiratoriaActiva,
      embarazoComplicado: previoEspirometria.embarazoComplicado,
      derramePleural: previoEspirometria.derramePleural,
      neumotorax: previoEspirometria.neumotorax,
      infartoAgudoAnginaInestable:
        previoEspirometria.infartoAgudoAnginaInestable,
      aneurismaAorticoConocido: previoEspirometria.aneurismaAorticoConocido,
      inestabilidadHemodinamicaGrave:
        previoEspirometria.inestabilidadHemodinamicaGrave,
      hipertensionIntracraneal: previoEspirometria.hipertensionIntracraneal,
      desprendimientoAgudoRetina: previoEspirometria.desprendimientoAgudoRetina,
      resultadoCuestionario: previoEspirometria.resultadoCuestionario,
      resultadoCuestionarioPersonalizado:
        previoEspirometria.resultadoCuestionarioPersonalizado,
    };

    // Determinar footerFirmantesData según estado del documento
    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (previoEspirometria.estado === DocumentoEstado.FINALIZADO ||
        previoEspirometria.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (
          previoEspirometria.createdBy?._id || previoEspirometria.createdBy
        )?.toString() || userId;
      const finalizadorId =
        (
          previoEspirometria.finalizadoPor?._id ||
          previoEspirometria.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        // Obtener datos de ambos firmantes
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
      // Si creador === finalizador, footerData queda undefined (formato simple)
    }
    // Si está en BORRADOR, footerData queda undefined (formato simple)

    // Determinar qué userId usar para obtener firmante (solo para formato simple o cuando creador === finalizador)
    const firmanteUserId =
      previoEspirometria.estado === DocumentoEstado.BORRADOR
        ? (
            previoEspirometria.createdBy?._id || previoEspirometria.createdBy
          )?.toString() || userId
        : previoEspirometria.estado === DocumentoEstado.FINALIZADO ||
            previoEspirometria.estado === DocumentoEstado.ANULADO
          ? (
              previoEspirometria.finalizadoPor?._id ||
              previoEspirometria.finalizadoPor
            )?.toString() || userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
        primerApellido: medicoFirmante.primerApellido || "",
        segundoApellido: medicoFirmante.segundoApellido || "",
        tituloProfesional: medicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional || "",
        especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo || "",
        numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista || "",
        nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional || "",
        firma: medicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        primerApellido: enfermeraFirmante.primerApellido || "",
        segundoApellido: enfermeraFirmante.segundoApellido || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante =
      await this.tecnicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        primerApellido: tecnicoFirmante.primerApellido || "",
        segundoApellido: tecnicoFirmante.segundoApellido || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(
      previoEspirometria.fechaPrevioEspirometria,
    )
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Previo Espirometria ${fecha}.pdf`;
    const rutaDirectorio = path.resolve(previoEspirometria.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);
    const docDefinition = previoEspirometriaInforme(
      nombreEmpresa,
      datosTrabajador,
      datosPrevioEspirometria,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
      datosProveedorSalud,
      footerFirmantesData,
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'previoEspirometria',
      previoEspirometriaId,
    );
    return rutaCompleta;
  }

  async getInformeReceta(
    empresaId: string,
    trabajadorId: string,
    recetaId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);
    const nombreEmpresa = empresa.nombreComercial;
    const trabajador = await this.trabajadoresService.findOne(trabajadorId);
    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };
    const receta = await this.expedientesService.findDocument(
      'receta',
      recetaId,
    );
    const datosReceta = {
      fechaReceta: receta.fechaReceta,
      tratamiento: receta.tratamiento,
      recomendaciones: receta.recomendaciones,
      indicaciones: receta.indicaciones,
    };

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(userId);
    const datosMedicoFirmante = medicoFirmante
      ? {
          nombre: medicoFirmante.nombre || '',
          universidad: medicoFirmante.universidad || '',
          tituloProfesional: medicoFirmante.tituloProfesional || '',
          numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional || '',
          especialistaSaludTrabajo:
            medicoFirmante.especialistaSaludTrabajo || '',
          numeroCedulaEspecialista:
            medicoFirmante.numeroCedulaEspecialista || '',
          nombreCredencialAdicional:
            medicoFirmante.nombreCredencialAdicional || '',
          numeroCredencialAdicional:
            medicoFirmante.numeroCredencialAdicional || '',
          firma:
            (medicoFirmante.firma as { data: string; contentType: string }) ||
            null,
        }
      : {
          nombre: '',
          universidad: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          especialistaSaludTrabajo: '',
          numeroCedulaEspecialista: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        primerApellido: enfermeraFirmante.primerApellido || "",
        segundoApellido: enfermeraFirmante.segundoApellido || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(receta.fechaReceta)
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Receta ${fecha}.pdf`;
    const rutaDirectorio = path.resolve(receta.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);
    const docDefinition = recetaInforme(
      nombreEmpresa,
      datosTrabajador,
      datosReceta,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosProveedorSalud,
      footerFirmantesData,
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    return rutaCompleta;
  }

  async getInformeEntrevistaPsicologica(
    empresaId: string,
    trabajadorId: string,
    entrevistaPsicologicaId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);

    const nombreEmpresa = empresa.nombreComercial;

    const trabajador = await this.trabajadoresService.findOne(trabajadorId);

    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const entrevistaPsicologica = await this.expedientesService.findDocument(
      'entrevistaPsicologica',
      entrevistaPsicologicaId,
    );

    const datosEntrevistaPsicologica = {
      fechaEntrevistaPsicologica:
        entrevistaPsicologica.fechaEntrevistaPsicologica,
      // I. Observación general (conductual)
      apariencia: entrevistaPsicologica.apariencia,
      actitudHaciaEvaluador: entrevistaPsicologica.actitudHaciaEvaluador,
      nivelCooperacion: entrevistaPsicologica.nivelCooperacion,
      contactoVisual: entrevistaPsicologica.contactoVisual,
      conductaMotora: entrevistaPsicologica.conductaMotora,
      // II. Estado de ánimo y afecto
      estadoAnimoPredominante: entrevistaPsicologica.estadoAnimoPredominante,
      afecto: entrevistaPsicologica.afecto,
      intensidadEmocional: entrevistaPsicologica.intensidadEmocional,
      // III. Pensamiento
      cursoPensamiento: entrevistaPsicologica.cursoPensamiento,
      alteracionesPensamiento: entrevistaPsicologica.alteracionesPensamiento,
      descripcionAlteracionesPensamiento:
        entrevistaPsicologica.descripcionAlteracionesPensamiento,
      // IV. Percepción
      alteracionesPerceptuales: entrevistaPsicologica.alteracionesPerceptuales,
      descripcionAlteracionesPerceptuales:
        entrevistaPsicologica.descripcionAlteracionesPerceptuales,
      // V. Cognición
      orientacion: entrevistaPsicologica.orientacion,
      atencionConcentracion: entrevistaPsicologica.atencionConcentracion,
      memoria: entrevistaPsicologica.memoria,
      // VI. Juicio y conciencia de estado
      juicio: entrevistaPsicologica.juicio,
      concienciaEstado: entrevistaPsicologica.concienciaEstado,
      // VII. Funcionamiento psicosocial
      relacionesInterpersonales:
        entrevistaPsicologica.relacionesInterpersonales,
      desempenoLaboralAutorreporte:
        entrevistaPsicologica.desempenoLaboralAutorreporte,
      manejoEstres: entrevistaPsicologica.manejoEstres,
      // VIII. Riesgo inmediato (crítico)
      ideacionSuicida: entrevistaPsicologica.ideacionSuicida,
      observacionesIdeacionSuicida:
        entrevistaPsicologica.observacionesIdeacionSuicida,
      // IX. Conclusion clínica
      conclusionClinica: entrevistaPsicologica.conclusionClinica,
    };

    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (entrevistaPsicologica.estado === DocumentoEstado.FINALIZADO ||
        entrevistaPsicologica.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (
          entrevistaPsicologica.createdBy?._id ||
          entrevistaPsicologica.createdBy
        )?.toString() || userId;
      const finalizadorId =
        (
          entrevistaPsicologica.finalizadoPor?._id ||
          entrevistaPsicologica.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
    }

    const firmanteUserId =
      entrevistaPsicologica.estado === DocumentoEstado.BORRADOR
        ? (
            entrevistaPsicologica.createdBy?._id ||
            entrevistaPsicologica.createdBy
          )?.toString() || userId
        : entrevistaPsicologica.estado === DocumentoEstado.FINALIZADO ||
            entrevistaPsicologica.estado === DocumentoEstado.ANULADO
          ? (
              entrevistaPsicologica.finalizadoPor?._id ||
              entrevistaPsicologica.finalizadoPor
            )?.toString() || userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
        primerApellido: medicoFirmante.primerApellido || "",
        segundoApellido: medicoFirmante.segundoApellido || "",
        tituloProfesional: medicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional || "",
        especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo || "",
        numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista || "",
        nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional || "",
        firma: medicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        primerApellido: enfermeraFirmante.primerApellido || "",
        segundoApellido: enfermeraFirmante.segundoApellido || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante =
      await this.tecnicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        primerApellido: tecnicoFirmante.primerApellido || "",
        segundoApellido: tecnicoFirmante.segundoApellido || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(
      entrevistaPsicologica.fechaEntrevistaPsicologica,
    )
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Entrevista Psicologica ${fecha}.pdf`;

    const rutaDirectorio = path.resolve(entrevistaPsicologica.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);

    const docDefinition = entrevistaPsicologicaInforme(
      nombreEmpresa,
      datosTrabajador,
      datosEntrevistaPsicologica,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
      datosProveedorSalud,
      footerData,
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'entrevistaPsicologica',
      entrevistaPsicologicaId,
    );

    return rutaCompleta;
  }

  async getInformeTrastornosEstadoAnimo(
    empresaId: string,
    trabajadorId: string,
    trastornosEstadoAnimoId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);

    const nombreEmpresa = empresa.nombreComercial;

    const trabajador = await this.trabajadoresService.findOne(trabajadorId);

    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const trastornosEstadoAnimo = await this.expedientesService.findDocument(
      'trastornosEstadoAnimo',
      trastornosEstadoAnimoId,
    );

    const datosTrastornosEstadoAnimo = {
      fechaTrastornosEstadoAnimo:
        trastornosEstadoAnimo.fechaTrastornosEstadoAnimo,
      p1ExaltadoComportamientoNoHabitualOMetidoProblemas:
        trastornosEstadoAnimo.p1ExaltadoComportamientoNoHabitualOMetidoProblemas,
      p1IrritableGritosPeleas: trastornosEstadoAnimo.p1IrritableGritosPeleas,
      p1MasSeguridadQueLoHabitual:
        trastornosEstadoAnimo.p1MasSeguridadQueLoHabitual,
      p1DormiaMenosSinNecesitarMasSueno:
        trastornosEstadoAnimo.p1DormiaMenosSinNecesitarMasSueno,
      p1HablabaMasOMasRapido: trastornosEstadoAnimo.p1HablabaMasOMasRapido,
      p1PensamientosAgolpados: trastornosEstadoAnimo.p1PensamientosAgolpados,
      p1DistraccionDificultadConcentracion:
        trastornosEstadoAnimo.p1DistraccionDificultadConcentracion,
      p1MasEnergiaQueLoHabitual:
        trastornosEstadoAnimo.p1MasEnergiaQueLoHabitual,
      p1MasActivoOMasCosasQueLoHabitual:
        trastornosEstadoAnimo.p1MasActivoOMasCosasQueLoHabitual,
      p1MasSocialExtrovertido: trastornosEstadoAnimo.p1MasSocialExtrovertido,
      p1MasApetitoSexual: trastornosEstadoAnimo.p1MasApetitoSexual,
      p1CosasExageradasRiesgosas:
        trastornosEstadoAnimo.p1CosasExageradasRiesgosas,
      p1GastoDineroProblemas: trastornosEstadoAnimo.p1GastoDineroProblemas,
      p2SituacionesMismoPeriodo:
        trastornosEstadoAnimo.p2SituacionesMismoPeriodo,
      p3NivelProblemaCausado: trastornosEstadoAnimo.p3NivelProblemaCausado,
      p4FamiliarDirectoBipolar: trastornosEstadoAnimo.p4FamiliarDirectoBipolar,
      p5DiagnosticoProfesionalBipolar:
        trastornosEstadoAnimo.p5DiagnosticoProfesionalBipolar,
    };

    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (trastornosEstadoAnimo.estado === DocumentoEstado.FINALIZADO ||
        trastornosEstadoAnimo.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (
          trastornosEstadoAnimo.createdBy?._id ||
          trastornosEstadoAnimo.createdBy
        )?.toString() || userId;
      const finalizadorId =
        (
          trastornosEstadoAnimo.finalizadoPor?._id ||
          trastornosEstadoAnimo.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
    }

    const firmanteUserId =
      trastornosEstadoAnimo.estado === DocumentoEstado.BORRADOR
        ? (
            trastornosEstadoAnimo.createdBy?._id ||
            trastornosEstadoAnimo.createdBy
          )?.toString() || userId
        : trastornosEstadoAnimo.estado === DocumentoEstado.FINALIZADO ||
            trastornosEstadoAnimo.estado === DocumentoEstado.ANULADO
          ? (
              trastornosEstadoAnimo.finalizadoPor?._id ||
              trastornosEstadoAnimo.finalizadoPor
            )?.toString() || userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
        primerApellido: medicoFirmante.primerApellido || "",
        segundoApellido: medicoFirmante.segundoApellido || "",
        tituloProfesional: medicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional || "",
        especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo || "",
        numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista || "",
        nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional || "",
        firma: medicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        primerApellido: enfermeraFirmante.primerApellido || "",
        segundoApellido: enfermeraFirmante.segundoApellido || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante =
      await this.tecnicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        primerApellido: tecnicoFirmante.primerApellido || "",
        segundoApellido: tecnicoFirmante.segundoApellido || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(
      trastornosEstadoAnimo.fechaTrastornosEstadoAnimo,
    )
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Trastornos Estado Animo ${fecha}.pdf`;

    const rutaDirectorio = path.resolve(trastornosEstadoAnimo.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);

    const docDefinition = trastornosEstadoAnimoInforme(
      nombreEmpresa,
      datosTrabajador,
      datosTrastornosEstadoAnimo,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
      datosProveedorSalud,
      footerData,
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'trastornosEstadoAnimo',
      trastornosEstadoAnimoId,
    );

    return rutaCompleta;
  }

  async getInformeCuestionarioProdromalBreve(
    empresaId: string,
    trabajadorId: string,
    cuestionarioProdromalBreveId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);

    const nombreEmpresa = empresa.nombreComercial;

    const trabajador = await this.trabajadoresService.findOne(trabajadorId);

    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const cuestionarioProdromalBreve =
      await this.expedientesService.findDocument(
        'cuestionarioProdromalBreve',
        cuestionarioProdromalBreveId,
      );

    const datosCuestionarioProdromalBreve = {
      fechaCuestionarioProdromalBreve:
        cuestionarioProdromalBreve.fechaCuestionarioProdromalBreve,
      p1: cuestionarioProdromalBreve.p1,
      p1GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p1GradoAcuerdoStatement,
      p2: cuestionarioProdromalBreve.p2,
      p2GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p2GradoAcuerdoStatement,
      p3: cuestionarioProdromalBreve.p3,
      p3GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p3GradoAcuerdoStatement,
      p4: cuestionarioProdromalBreve.p4,
      p4GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p4GradoAcuerdoStatement,
      p5: cuestionarioProdromalBreve.p5,
      p5GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p5GradoAcuerdoStatement,
      p6: cuestionarioProdromalBreve.p6,
      p6GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p6GradoAcuerdoStatement,
      p7: cuestionarioProdromalBreve.p7,
      p7GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p7GradoAcuerdoStatement,
      p8: cuestionarioProdromalBreve.p8,
      p8GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p8GradoAcuerdoStatement,
      p9: cuestionarioProdromalBreve.p9,
      p9GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p9GradoAcuerdoStatement,
      p10: cuestionarioProdromalBreve.p10,
      p10GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p10GradoAcuerdoStatement,
      p11: cuestionarioProdromalBreve.p11,
      p11GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p11GradoAcuerdoStatement,
      p12: cuestionarioProdromalBreve.p12,
      p12GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p12GradoAcuerdoStatement,
      p13: cuestionarioProdromalBreve.p13,
      p13GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p13GradoAcuerdoStatement,
      p14: cuestionarioProdromalBreve.p14,
      p14GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p14GradoAcuerdoStatement,
      p15: cuestionarioProdromalBreve.p15,
      p15GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p15GradoAcuerdoStatement,
      p16: cuestionarioProdromalBreve.p16,
      p16GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p16GradoAcuerdoStatement,
      p17: cuestionarioProdromalBreve.p17,
      p17GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p17GradoAcuerdoStatement,
      p18: cuestionarioProdromalBreve.p18,
      p18GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p18GradoAcuerdoStatement,
      p19: cuestionarioProdromalBreve.p19,
      p19GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p19GradoAcuerdoStatement,
      p20: cuestionarioProdromalBreve.p20,
      p20GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p20GradoAcuerdoStatement,
      p21: cuestionarioProdromalBreve.p21,
      p21GradoAcuerdoStatement:
        cuestionarioProdromalBreve.p21GradoAcuerdoStatement,
    };

    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (cuestionarioProdromalBreve.estado === DocumentoEstado.FINALIZADO ||
        cuestionarioProdromalBreve.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (
          cuestionarioProdromalBreve.createdBy?._id ||
          cuestionarioProdromalBreve.createdBy
        )?.toString() || userId;
      const finalizadorId =
        (
          cuestionarioProdromalBreve.finalizadoPor?._id ||
          cuestionarioProdromalBreve.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
    }

    const firmanteUserId =
      cuestionarioProdromalBreve.estado === DocumentoEstado.BORRADOR
        ? (
            cuestionarioProdromalBreve.createdBy?._id ||
            cuestionarioProdromalBreve.createdBy
          )?.toString() || userId
        : cuestionarioProdromalBreve.estado === DocumentoEstado.FINALIZADO ||
            cuestionarioProdromalBreve.estado === DocumentoEstado.ANULADO
          ? (
              cuestionarioProdromalBreve.finalizadoPor?._id ||
              cuestionarioProdromalBreve.finalizadoPor
            )?.toString() || userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
        primerApellido: medicoFirmante.primerApellido || "",
        segundoApellido: medicoFirmante.segundoApellido || "",
        tituloProfesional: medicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional || "",
        especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo || "",
        numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista || "",
        nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional || "",
        firma: medicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        primerApellido: enfermeraFirmante.primerApellido || "",
        segundoApellido: enfermeraFirmante.segundoApellido || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante =
      await this.tecnicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        primerApellido: tecnicoFirmante.primerApellido || "",
        segundoApellido: tecnicoFirmante.segundoApellido || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(
      cuestionarioProdromalBreve.fechaCuestionarioProdromalBreve,
    )
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Cuestionario Prodromal Breve ${fecha}.pdf`;

    const rutaDirectorio = path.resolve(cuestionarioProdromalBreve.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);

    const docDefinition = cuestionarioProdromalBreveInforme(
      nombreEmpresa,
      datosTrabajador,
      datosCuestionarioProdromalBreve,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
      datosProveedorSalud,
      footerData,
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'cuestionarioProdromalBreve',
      cuestionarioProdromalBreveId,
    );

    return rutaCompleta;
  }

  async getInformeTrastornoLimitePersonalidad(
    empresaId: string,
    trabajadorId: string,
    trastornoLimitePersonalidadId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);

    const nombreEmpresa = empresa.nombreComercial;

    const trabajador = await this.trabajadoresService.findOne(trabajadorId);

    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const trastornoLimitePersonalidad =
      await this.expedientesService.findDocument(
        'trastornoLimitePersonalidad',
        trastornoLimitePersonalidadId,
      );

    const datosTrastornoLimitePersonalidad = {
      fechaTrastornoLimitePersonalidad:
        trastornoLimitePersonalidad.fechaTrastornoLimitePersonalidad,
      relacionesCercanasDiscusionesRupturas:
        trastornoLimitePersonalidad.relacionesCercanasDiscusionesRupturas,
      autolesionIntentoSuicidio:
        trastornoLimitePersonalidad.autolesionIntentoSuicidio,
      impulsividadOtrosDosProblemas:
        trastornoLimitePersonalidad.impulsividadOtrosDosProblemas,
      extremadamenteMalHumor:
        trastornoLimitePersonalidad.extremadamenteMalHumor,
      enojadoFrecuenteActuaEnojadoSarcastico:
        trastornoLimitePersonalidad.enojadoFrecuenteActuaEnojadoSarcastico,
      desconfianzaOtrasPersonas:
        trastornoLimitePersonalidad.desconfianzaOtrasPersonas,
      sensacionIrrealidadEntornoIrreal:
        trastornoLimitePersonalidad.sensacionIrrealidadEntornoIrreal,
      vacioCronico: trastornoLimitePersonalidad.vacioCronico,
      faltaIdentidadQuienEs: trastornoLimitePersonalidad.faltaIdentidadQuienEs,
      esfuerzosEvitarAbandono:
        trastornoLimitePersonalidad.esfuerzosEvitarAbandono,
    };

    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (trastornoLimitePersonalidad.estado === DocumentoEstado.FINALIZADO ||
        trastornoLimitePersonalidad.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (
          trastornoLimitePersonalidad.createdBy?._id ||
          trastornoLimitePersonalidad.createdBy
        )?.toString() || userId;
      const finalizadorId =
        (
          trastornoLimitePersonalidad.finalizadoPor?._id ||
          trastornoLimitePersonalidad.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
    }

    const firmanteUserId =
      trastornoLimitePersonalidad.estado === DocumentoEstado.BORRADOR
        ? (
            trastornoLimitePersonalidad.createdBy?._id ||
            trastornoLimitePersonalidad.createdBy
          )?.toString() || userId
        : trastornoLimitePersonalidad.estado === DocumentoEstado.FINALIZADO ||
            trastornoLimitePersonalidad.estado === DocumentoEstado.ANULADO
          ? (
              trastornoLimitePersonalidad.finalizadoPor?._id ||
              trastornoLimitePersonalidad.finalizadoPor
            )?.toString() || userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
        primerApellido: medicoFirmante.primerApellido || "",
        segundoApellido: medicoFirmante.segundoApellido || "",
        tituloProfesional: medicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional || "",
        especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo || "",
        numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista || "",
        nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional || "",
        firma: medicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        primerApellido: enfermeraFirmante.primerApellido || "",
        segundoApellido: enfermeraFirmante.segundoApellido || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante =
      await this.tecnicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        primerApellido: tecnicoFirmante.primerApellido || "",
        segundoApellido: tecnicoFirmante.segundoApellido || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(
      trastornoLimitePersonalidad.fechaTrastornoLimitePersonalidad,
    )
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Trastorno Limite Personalidad ${fecha}.pdf`;

    const rutaDirectorio = path.resolve(trastornoLimitePersonalidad.rutaPDF);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);

    const docDefinition = trastornoLimitePersonalidadInforme(
      nombreEmpresa,
      datosTrabajador,
      datosTrastornoLimitePersonalidad,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
      datosProveedorSalud,
      footerData,
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'trastornoLimitePersonalidad',
      trastornoLimitePersonalidadId,
    );

    return rutaCompleta;
  }

  async getInformeDashboard(
    empresaId: string,
    trabajadorId: string,
    userId: string,
  ): Promise<Buffer> {
    const empresa = await this.empresasService.findOne(empresaId);
    const nombreEmpresa = empresa.nombreComercial;
    const trabajador = await this.trabajadoresService.findOne(trabajadorId);
    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(userId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
        primerApellido: medicoFirmante.primerApellido || "",
        segundoApellido: medicoFirmante.segundoApellido || "",
        tituloProfesional: medicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional || "",
        especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo || "",
        numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista || "",
        nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional || "",
        firma: medicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };
    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const docDefinition = dashboardInforme(
      nombreEmpresa,
      datosTrabajador,
      datosMedicoFirmante,
      datosProveedorSalud,
    );

    return this.printer.createPdfBuffer(docDefinition);
  }

  async getInformeEventoSeguimientoCardiometabolico(
    empresaId: string,
    trabajadorId: string,
    eventoSeguimientoCardiometabolicoId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);

    const nombreEmpresa = empresa.nombreComercial;

    const trabajador = await this.trabajadoresService.findOne(trabajadorId);

    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const eventoSeguimientoCardiometabolico =
      await this.expedientesService.findDocument(
        'eventoSeguimientoCardiometabolico',
        eventoSeguimientoCardiometabolicoId,
      );

    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (eventoSeguimientoCardiometabolico.estado ===
        DocumentoEstado.FINALIZADO ||
        eventoSeguimientoCardiometabolico.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (
          eventoSeguimientoCardiometabolico.createdBy?._id ||
          eventoSeguimientoCardiometabolico.createdBy
        )?.toString() || userId;
      const finalizadorId =
        (
          eventoSeguimientoCardiometabolico.finalizadoPor?._id ||
          eventoSeguimientoCardiometabolico.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
    }

    const firmanteUserId =
      eventoSeguimientoCardiometabolico.estado === DocumentoEstado.BORRADOR
        ? (
            eventoSeguimientoCardiometabolico.createdBy?._id ||
            eventoSeguimientoCardiometabolico.createdBy
          )?.toString() || userId
        : eventoSeguimientoCardiometabolico.estado ===
              DocumentoEstado.FINALIZADO ||
            eventoSeguimientoCardiometabolico.estado === DocumentoEstado.ANULADO
          ? (
              eventoSeguimientoCardiometabolico.finalizadoPor?._id ||
              eventoSeguimientoCardiometabolico.finalizadoPor
            )?.toString() || userId
          : userId;

    const datosEventoSeguimientoCardiometabolico = {
      fechaEventoSeguimientoCardiometabolico:
        eventoSeguimientoCardiometabolico.fechaEventoSeguimientoCardiometabolico,
      motivoSeguimiento: eventoSeguimientoCardiometabolico.motivoSeguimiento,
      diagnosticosActivos:
        eventoSeguimientoCardiometabolico.diagnosticosActivos,
      estadoCondiciones: eventoSeguimientoCardiometabolico.estadoCondiciones,
      signosVitales: eventoSeguimientoCardiometabolico.signosVitales,
      somatometria: eventoSeguimientoCardiometabolico.somatometria,
      laboratorio: eventoSeguimientoCardiometabolico.laboratorio,
      tratamientoActual: eventoSeguimientoCardiometabolico.tratamientoActual,
      adherenciaTerapeutica:
        eventoSeguimientoCardiometabolico.adherenciaTerapeutica,
      sintomasRelevantes: eventoSeguimientoCardiometabolico.sintomasRelevantes,
      riesgosActuales: eventoSeguimientoCardiometabolico.riesgosActuales,
      proximaRevisionSugerida:
        eventoSeguimientoCardiometabolico.proximaRevisionSugerida,
    };

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = this.mapMedicoFirmante(
      medicoFirmante
        ? {
            nombre: medicoFirmante.nombre,
            primerApellido: medicoFirmante.primerApellido,
            segundoApellido: medicoFirmante.segundoApellido,
            tituloProfesional: medicoFirmante.tituloProfesional,
            universidad: medicoFirmante.universidad,
            numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional,
            especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo,
            numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista,
            nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional,
            numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional,
            firma:
              (medicoFirmante.firma as { data: string; contentType: string }) ||
              null,
          }
        : null,
    );
    
    const enfermeraFirmante = await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        primerApellido: enfermeraFirmante.primerApellido || "",
        segundoApellido: enfermeraFirmante.segundoApellido || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };



    const tecnicoFirmante =
      await this.tecnicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        primerApellido: tecnicoFirmante.primerApellido || "",
        segundoApellido: tecnicoFirmante.segundoApellido || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(
      eventoSeguimientoCardiometabolico.fechaEventoSeguimientoCardiometabolico,
    )
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Evento Seguimiento Cardiometabolico ${fecha}.pdf`;

    const rutaDirectorio = path.resolve(
      eventoSeguimientoCardiometabolico.rutaPDF,
    );
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);

    const docDefinition = eventoSeguimientoCardiometabolicoInforme(
      nombreEmpresa,
      datosTrabajador,
      datosEventoSeguimientoCardiometabolico,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
      datosProveedorSalud,
      footerData,
    );
    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'eventoSeguimientoCardiometabolico',
      eventoSeguimientoCardiometabolicoId,
    );

    return rutaCompleta;
  }

  async getInformeLongitudinalCardiometabolico(
    empresaId: string,
    trabajadorId: string,
    informeLongitudinalCardiometabolicoId: string,
    userId: string,
    footerFirmantesData?: FooterFirmantesData,
  ): Promise<string> {
    const empresa = await this.empresasService.findOne(empresaId);

    const nombreEmpresa = empresa.nombreComercial;

    const trabajador = await this.trabajadoresService.findOne(trabajadorId);

    const datosTrabajador = {
      primerApellido: trabajador.primerApellido,
      segundoApellido: trabajador.segundoApellido,
      nombre: trabajador.nombre,
      nacimiento: convertirFechaADDMMAAAA(trabajador.fechaNacimiento),
      escolaridad: trabajador.escolaridad,
      edad: `${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años`,
      puesto: trabajador.puesto,
      sexo: trabajador.sexo,
      antiguedad: trabajador.fechaIngreso
        ? calcularAntiguedad(convertirFechaAAAAAMMDD(trabajador.fechaIngreso))
        : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const informeLongitudinalCardiometabolico =
      await this.expedientesService.findDocument(
        'informeLongitudinalCardiometabolico',
        informeLongitudinalCardiometabolicoId,
      );

    let footerData: FooterFirmantesData | undefined = footerFirmantesData;

    if (
      !footerData &&
      (informeLongitudinalCardiometabolico.estado ===
        DocumentoEstado.FINALIZADO ||
        informeLongitudinalCardiometabolico.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (
          informeLongitudinalCardiometabolico.createdBy?._id ||
          informeLongitudinalCardiometabolico.createdBy
        )?.toString() || userId;
      const finalizadorId =
        (
          informeLongitudinalCardiometabolico.finalizadoPor?._id ||
          informeLongitudinalCardiometabolico.finalizadoPor
        )?.toString() || userId;

      if (creadorId !== finalizadorId) {
        const elaborador = await this.obtenerDatosFirmante(creadorId);
        const finalizador = await this.obtenerDatosFirmante(finalizadorId);

        footerData = {
          elaborador,
          finalizador,
          esDocumentoFinalizado: true,
        };
      }
    }

    const firmanteUserId =
      informeLongitudinalCardiometabolico.estado === DocumentoEstado.BORRADOR
        ? (
            informeLongitudinalCardiometabolico.createdBy?._id ||
            informeLongitudinalCardiometabolico.createdBy
          )?.toString() || userId
        : informeLongitudinalCardiometabolico.estado ===
              DocumentoEstado.FINALIZADO ||
            informeLongitudinalCardiometabolico.estado ===
              DocumentoEstado.ANULADO
          ? (
              informeLongitudinalCardiometabolico.finalizadoPor?._id ||
              informeLongitudinalCardiometabolico.finalizadoPor
            )?.toString() || userId
          : userId;

    const datosInformeLongitudinalCardiometabolico = {
      fechaInformeLongitudinalCardiometabolico:
        informeLongitudinalCardiometabolico.fechaInformeLongitudinalCardiometabolico,
      periodoInicio: informeLongitudinalCardiometabolico.periodoInicio,
      periodoFin: informeLongitudinalCardiometabolico.periodoFin,
      numeroEventosIncluidos:
        informeLongitudinalCardiometabolico.numeroEventosIncluidos,
      numeroEventosValidos:
        informeLongitudinalCardiometabolico.numeroEventosValidos,
      numeroSeguimientosProgramados:
        informeLongitudinalCardiometabolico.numeroSeguimientosProgramados,
      numeroSeguimientosRealizados:
        informeLongitudinalCardiometabolico.numeroSeguimientosRealizados,
      numeroInasistencias:
        informeLongitudinalCardiometabolico.numeroInasistencias,
      numeroCancelaciones:
        informeLongitudinalCardiometabolico.numeroCancelaciones,
      numeroReprogramaciones:
        informeLongitudinalCardiometabolico.numeroReprogramaciones,
      porcentajeAsistencia:
        informeLongitudinalCardiometabolico.porcentajeAsistencia,
      consistenciaSeguimiento:
        informeLongitudinalCardiometabolico.consistenciaSeguimiento,
      datosFaltantesRelevantes:
        informeLongitudinalCardiometabolico.datosFaltantesRelevantes,
      eventosIncluidos: informeLongitudinalCardiometabolico.eventosIncluidos,
      seguimientosProgramadosIncluidos:
        informeLongitudinalCardiometabolico.seguimientosProgramadosIncluidos,
      resumenCondiciones:
        informeLongitudinalCardiometabolico.resumenCondiciones,
      eventosConcentrados:
        informeLongitudinalCardiometabolico.eventosConcentrados,
      seguimientosProgramadosConcentrados:
        informeLongitudinalCardiometabolico.seguimientosProgramadosConcentrados,
      resumenIndicadores:
        informeLongitudinalCardiometabolico.resumenIndicadores,
      nivelRiesgoLongitudinal:
        informeLongitudinalCardiometabolico.nivelRiesgoLongitudinal,
      tendenciaLongitudinal:
        informeLongitudinalCardiometabolico.tendenciaLongitudinal,
      interpretacionRiesgoLongitudinal:
        informeLongitudinalCardiometabolico.interpretacionRiesgoLongitudinal,
      contextoTerapeutico:
        informeLongitudinalCardiometabolico.contextoTerapeutico,
      graficaEvolucionGlucemica:
        informeLongitudinalCardiometabolico.graficaEvolucionGlucemica,
      graficaEvolucionPresionArterial:
        informeLongitudinalCardiometabolico.graficaEvolucionPresionArterial,
      graficaEvolucionPesoImc:
        informeLongitudinalCardiometabolico.graficaEvolucionPesoImc,
      graficaEvolucionPerfilLipidico:
        informeLongitudinalCardiometabolico.graficaEvolucionPerfilLipidico,
    };

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = this.mapMedicoFirmante(
      medicoFirmante
        ? {
            nombre: medicoFirmante.nombre,
            primerApellido: medicoFirmante.primerApellido,
            segundoApellido: medicoFirmante.segundoApellido,
            tituloProfesional: medicoFirmante.tituloProfesional,
            universidad: medicoFirmante.universidad,
            numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional,
            especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo,
            numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista,
            nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional,
            numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional,
            firma:
              (medicoFirmante.firma as { data: string; contentType: string }) ||
              null,
          }
        : null,
    );
    
    const enfermeraFirmante = await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        primerApellido: enfermeraFirmante.primerApellido || "",
        segundoApellido: enfermeraFirmante.segundoApellido || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };



    const tecnicoFirmante =
      await this.tecnicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        primerApellido: tecnicoFirmante.primerApellido || "",
        segundoApellido: tecnicoFirmante.segundoApellido || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(
      informeLongitudinalCardiometabolico.fechaInformeLongitudinalCardiometabolico,
    )
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Informe Longitudinal Cardiometabolico ${fecha}.pdf`;

    const rutaDirectorio = path.resolve(
      informeLongitudinalCardiometabolico.rutaPDF,
    );
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);

    const docDefinition = informeLongitudinalCardiometabolicoInforme(
      nombreEmpresa,
      datosTrabajador,
      datosInformeLongitudinalCardiometabolico,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
      datosProveedorSalud,
      footerData,
    );
    await this.printer.createPdf(docDefinition, rutaCompleta);
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'longitudinalCardiometabolico',
      informeLongitudinalCardiometabolicoId,
    );

    return rutaCompleta;
  }

  async eliminarInforme(filePath: string): Promise<void> {
    await this.filesService.deleteFile(filePath);
  }
}
