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
import { lesionInforme } from './documents/lesion.informe';
import { dashboardInforme } from './documents/dashboard.informe';
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
import { CatalogType } from '../catalogs/interfaces/catalog-entry.interface';
import { DocumentoEstado } from '../expedientes/enums/documento-estado.enum';
import { ResultadosClinicosService } from '../resultados-clinicos/resultados-clinicos.service';

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
    lesion: 'Lesión',
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
    lesiones: 'Lesión',
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
  ) {}

  private mapMedicoFirmante(
    medicoFirmante: {
      nombre?: string;
      tituloProfesional?: string;
      universidad?: string;
      numeroCedulaProfesional?: string;
      especialistaSaludTrabajo?: string;
      numeroCedulaEspecialista?: string;
      nombreCredencialAdicional?: string;
      numeroCredencialAdicional?: string;
      firma?: { data: string; contentType: string } | null;
      [key: string]: any; // Permitir campos adicionales
    } | null,
  ) {
    if (!medicoFirmante) {
      return {
        nombre: '',
        tituloProfesional: '',
        universidad: '',
        numeroCedulaProfesional: '',
        especialistaSaludTrabajo: '',
        numeroCedulaEspecialista: '',
        nombreCredencialAdicional: '',
        numeroCredencialAdicional: '',
        firma: null,
      };
    }

    return {
      nombre: medicoFirmante.nombre || '',
      tituloProfesional: medicoFirmante.tituloProfesional || '',
      universidad: medicoFirmante.universidad || '',
      numeroCedulaProfesional: medicoFirmante.numeroCedulaProfesional || '',
      especialistaSaludTrabajo: medicoFirmante.especialistaSaludTrabajo || '',
      numeroCedulaEspecialista: medicoFirmante.numeroCedulaEspecialista || '',
      nombreCredencialAdicional: medicoFirmante.nombreCredencialAdicional || '',
      numeroCredencialAdicional: medicoFirmante.numeroCredencialAdicional || '',
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
        case 'lesion':
          return await this.getInformeLesion(
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
      case 'lesion':
        return await this.getInformeLesion(
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
    lesiones: 'lesion',
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
      lesion: 'fechaReporteLesion',
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
      await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
      ? {
          nombre: enfermeraFirmante.nombre || '',
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
          sexo: tecnicoFirmante.sexo || '',
          tituloProfesional: tecnicoFirmante.tituloProfesional || '',
          numeroCedulaProfesional:
            tecnicoFirmante.numeroCedulaProfesional || '',
          nombreCredencialAdicional:
            tecnicoFirmante.nombreCredencialAdicional || '',
          numeroCredencialAdicional:
            tecnicoFirmante.numeroCredencialAdicional || '',
          firma:
            (tecnicoFirmante.firma as { data: string; contentType: string }) ||
            null,
        }
      : {
          nombre: '',
          sexo: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    };
    const proveedorSalud = await this.proveedoresSaludService.findOne(
      datosUsuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
          estado: proveedorSalud.estado || '',
          municipio: proveedorSalud.municipio || '',
          codigoPostal: proveedorSalud.codigoPostal || '',
          direccion: proveedorSalud.direccion || '',
          telefono: proveedorSalud.telefono || '',
          correoElectronico: proveedorSalud.correoElectronico || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
          colorInforme: proveedorSalud.colorInforme || '#343A40',
        }
      : {
          nombre: '',
          pais: '',
          perfilProveedorSalud: '',
          logotipoEmpresa: null,
          estado: '',
          municipio: '',
          codigoPostal: '',
          direccion: '',
          telefono: '',
          correoElectronico: '',
          sitioWeb: '',
          colorInforme: '#343A40',
        };

    // Formatear la fecha para el nombre del archivo
    const fecha = convertirFechaADDMMAAAA(antidoping.fechaAntidoping)
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Antidoping ${fecha}.pdf`;

    // Obtener la ruta específica del documento
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
    // Generar y guardar el PDF
    try {
      await this.printer.createPdf(docDefinition, rutaCompleta);
    } catch (error) {
      console.error('[getInformeAntidoping] Error al generar el PDF:', error);
      throw error;
    }

    return rutaCompleta; // Retorna la ruta del archivo generado
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
      evaluacionAdicional6: aptitud.evaluacionAdicional6,
      fechaEvaluacionAdicional6: aptitud.fechaEvaluacionAdicional6,
      resultadosEvaluacionAdicional6: aptitud.resultadosEvaluacionAdicional6,
      aptitudPuesto: aptitud.aptitudPuesto,
      alteracionesSalud: aptitud.alteracionesSalud,
      resultados: aptitud.resultados,
      medidasPreventivas: aptitud.medidasPreventivas,
    };

    // Determinar footerFirmantesData según estado del documento
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
      aptitud.estado === DocumentoEstado.BORRADOR
        ? (aptitud.createdBy?._id || aptitud.createdBy)?.toString() || userId
        : aptitud.estado === DocumentoEstado.FINALIZADO ||
            aptitud.estado === DocumentoEstado.ANULADO
          ? (aptitud.finalizadoPor?._id || aptitud.finalizadoPor)?.toString() ||
            userId
          : userId;

    const historiasClinicas = await this.expedientesService.findDocuments(
      'historiaClinica',
      trabajadorId,
    );
    const nearestHistoriaClinica = historiasClinicas?.length
      ? findNearestDocument(
          historiasClinicas,
          aptitud.fechaAptitudPuesto,
          'fechaHistoriaClinica',
        )
      : null;
    const datosHistoriaClinica = nearestHistoriaClinica
      ? {
          fechaHistoriaClinica: nearestHistoriaClinica.fechaHistoriaClinica,
          resumenHistoriaClinica: nearestHistoriaClinica.resumenHistoriaClinica,
        }
      : null;

    const exploracionesFisicas = await this.expedientesService.findDocuments(
      'exploracionFisica',
      trabajadorId,
    );
    const nearestExploracionFisica = exploracionesFisicas?.length
      ? findNearestDocument(
          exploracionesFisicas,
          aptitud.fechaAptitudPuesto,
          'fechaExploracionFisica',
        )
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

    const examenesVista = await this.expedientesService.findDocuments(
      'examenVista',
      trabajadorId,
    );
    const nearestExamenVista = examenesVista?.length
      ? findNearestDocument(
          examenesVista,
          aptitud.fechaAptitudPuesto,
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

    const audiometrias = await this.expedientesService.findDocuments(
      'audiometria',
      trabajadorId,
    );
    const nearestAudiometria = audiometrias?.length
      ? findNearestDocument(
          audiometrias,
          aptitud.fechaAptitudPuesto,
          'fechaAudiometria',
        )
      : null;
    const datosAudiometria = nearestAudiometria
      ? {
          fechaAudiometria: nearestAudiometria.fechaAudiometria,
          diagnosticoAudiometria: nearestAudiometria.diagnosticoAudiometria,
          hipoacusiaBilateralCombinada:
            nearestAudiometria.hipoacusiaBilateralCombinada,
        }
      : null;

    const antidopings = await this.expedientesService.findDocuments(
      'antidoping',
      trabajadorId,
    );
    const nearestAntidoping = antidopings?.length
      ? findNearestDocument(
          antidopings,
          aptitud.fechaAptitudPuesto,
          'fechaAntidoping',
        )
      : null;
    const datosAntidoping = nearestAntidoping
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
          metilendioximetanfetamina:
            nearestAntidoping.metilendioximetanfetamina || null,
          ketamina: nearestAntidoping.ketamina || null,
        }
      : null;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const resultadosClinicos = includeResultadosClinicos
      ? await this.resultadosClinicosService.findByTrabajador(trabajadorId)
      : [];

    const findMostRecentResultadoClinico = (
      items: any[],
      tipoEstudio: string,
    ) =>
      items.find(
        (item) => item?.tipoEstudio === tipoEstudio && item?.fechaEstudio,
      ) || null;

    const nearestEKG = findMostRecentResultadoClinico(
      resultadosClinicos,
      'EKG',
    );
    const nearestEspirometria = findMostRecentResultadoClinico(
      resultadosClinicos,
      'ESPIROMETRIA',
    );
    const nearestTipoSangre = findMostRecentResultadoClinico(
      resultadosClinicos,
      'TIPO_SANGRE',
    );

    const datosResultadoClinicoEKG = nearestEKG
      ? {
          fechaEstudio: nearestEKG.fechaEstudio,
          resultadoGlobal: nearestEKG.resultadoGlobal,
          hallazgoEspecifico: nearestEKG.hallazgoEspecifico,
          tipoAlteracionPrincipal: nearestEKG.tipoAlteracionPrincipal,
        }
      : null;

    const datosResultadoClinicoEspirometria = nearestEspirometria
      ? {
          fechaEstudio: nearestEspirometria.fechaEstudio,
          resultadoGlobal: nearestEspirometria.resultadoGlobal,
          hallazgoEspecifico: nearestEspirometria.hallazgoEspecifico,
          tipoAlteracion: nearestEspirometria.tipoAlteracion,
        }
      : null;

    const datosResultadoClinicoTipoSangre = nearestTipoSangre
      ? {
          fechaEstudio: nearestTipoSangre.fechaEstudio,
          tipoSangre: nearestTipoSangre.tipoSangre,
        }
      : null;

    const datosMedicoFirmante = this.mapMedicoFirmante(
      medicoFirmante
        ? {
            nombre: medicoFirmante.nombre,
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

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    };

    const proveedorSalud = await this.proveedoresSaludService.findOne(
      datosUsuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
          estado: proveedorSalud.estado || '',
          municipio: proveedorSalud.municipio || '',
          codigoPostal: proveedorSalud.codigoPostal || '',
          direccion: proveedorSalud.direccion || '',
          telefono: proveedorSalud.telefono || '',
          correoElectronico: proveedorSalud.correoElectronico || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
          colorInforme: proveedorSalud.colorInforme || '#343A40',
          semaforizacionActivada:
            proveedorSalud.semaforizacionActivada || false,
        }
      : {
          nombre: '',
          pais: '',
          perfilProveedorSalud: '',
          logotipoEmpresa: null,
          estado: '',
          municipio: '',
          codigoPostal: '',
          direccion: '',
          telefono: '',
          correoElectronico: '',
          sitioWeb: '',
          colorInforme: '#343A40',
          semaforizacionActivada: false,
        };

    // Formatear la fecha para el nombre del archivo
    const fecha = convertirFechaADDMMAAAA(aptitud.fechaAptitudPuesto)
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Aptitud ${fecha}.pdf`;

    // Obtener la ruta específica del documento
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
      datosAntidoping,
      datosResultadoClinicoTipoSangre,
      datosResultadoClinicoEKG,
      datosResultadoClinicoEspirometria,
      datosMedicoFirmante,
      datosProveedorSalud,
      footerData,
    );

    // Generar y guardar el PDF
    await this.printer.createPdf(docDefinition, rutaCompleta);

    return rutaCompleta; // Retorna la ruta del archivo generado
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

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    };

    const proveedorSalud = await this.proveedoresSaludService.findOne(
      datosUsuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
          estado: proveedorSalud.estado || '',
          municipio: proveedorSalud.municipio || '',
          codigoPostal: proveedorSalud.codigoPostal || '',
          direccion: proveedorSalud.direccion || '',
          telefono: proveedorSalud.telefono || '',
          correoElectronico: proveedorSalud.correoElectronico || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
          colorInforme: proveedorSalud.colorInforme || '#343A40',
          semaforizacionActivada:
            proveedorSalud.semaforizacionActivada || false,
        }
      : {
          nombre: '',
          pais: '',
          perfilProveedorSalud: '',
          logotipoEmpresa: null,
          estado: '',
          municipio: '',
          codigoPostal: '',
          direccion: '',
          telefono: '',
          correoElectronico: '',
          sitioWeb: '',
          colorInforme: '#343A40',
          semaforizacionActivada: false,
        };

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
      datosProveedorSalud,
      footerData,
    );

    // Generar y guardar el PDF
    await this.printer.createPdf(docDefinition, rutaCompleta);

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
      await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
      ? {
          nombre: enfermeraFirmante.nombre || '',
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
          sexo: tecnicoFirmante.sexo || '',
          tituloProfesional: tecnicoFirmante.tituloProfesional || '',
          numeroCedulaProfesional:
            tecnicoFirmante.numeroCedulaProfesional || '',
          nombreCredencialAdicional:
            tecnicoFirmante.nombreCredencialAdicional || '',
          numeroCredencialAdicional:
            tecnicoFirmante.numeroCredencialAdicional || '',
          firma:
            (tecnicoFirmante.firma as { data: string; contentType: string }) ||
            null,
        }
      : {
          nombre: '',
          sexo: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    };

    const proveedorSalud = await this.proveedoresSaludService.findOne(
      datosUsuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
          estado: proveedorSalud.estado || '',
          municipio: proveedorSalud.municipio || '',
          codigoPostal: proveedorSalud.codigoPostal || '',
          direccion: proveedorSalud.direccion || '',
          telefono: proveedorSalud.telefono || '',
          correoElectronico: proveedorSalud.correoElectronico || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
          colorInforme: proveedorSalud.colorInforme || '#343A40',
          semaforizacionActivada:
            proveedorSalud.semaforizacionActivada || false,
        }
      : {
          nombre: '',
          pais: '',
          perfilProveedorSalud: '',
          logotipoEmpresa: null,
          estado: '',
          municipio: '',
          codigoPostal: '',
          direccion: '',
          telefono: '',
          correoElectronico: '',
          sitioWeb: '',
          colorInforme: '#343A40',
          semaforizacionActivada: false,
        };

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

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    };

    const proveedorSalud = await this.proveedoresSaludService.findOne(
      datosUsuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
          estado: proveedorSalud.estado || '',
          municipio: proveedorSalud.municipio || '',
          codigoPostal: proveedorSalud.codigoPostal || '',
          direccion: proveedorSalud.direccion || '',
          telefono: proveedorSalud.telefono || '',
          correoElectronico: proveedorSalud.correoElectronico || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
        }
      : {
          nombre: '',
          pais: '',
          perfilProveedorSalud: '',
          logotipoEmpresa: null,
          estado: '',
          municipio: '',
          codigoPostal: '',
          direccion: '',
          telefono: '',
          correoElectronico: '',
          sitioWeb: '',
        };

    const fecha = convertirFechaADDMMAAAA(certificado.fechaCertificado)
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Certificado ${fecha}.pdf`;

    if (!datosExploracionFisica) {
      throw new BadRequestException(
        'No se puede generar el certificado sin datos de exploración física.',
      );
    }

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

    const certificado = await this.expedientesService.findDocument(
      'certificadoExpedito',
      certificadoExpeditoId,
    );
    const datosCertificadoExpedito = {
      fechaCertificadoExpedito: certificado.fechaCertificadoExpedito,
      cuerpoCertificado: certificado.cuerpoCertificado,
      impedimentosFisicos: certificado.impedimentosFisicos,
      peso: certificado.peso,
      altura: certificado.altura,
      indiceMasaCorporal: certificado.indiceMasaCorporal,
      tensionArterialSistolica: certificado.tensionArterialSistolica,
      tensionArterialDiastolica: certificado.tensionArterialDiastolica,
      frecuenciaCardiaca: certificado.frecuenciaCardiaca,
      frecuenciaRespiratoria: certificado.frecuenciaRespiratoria,
      temperaturaCorporal: certificado.temperaturaCorporal,
      gradoSalud: certificado.gradoSalud,
      aptitudPuesto: certificado.aptitudPuesto,
      descripcionSobreAptitud: certificado.descripcionSobreAptitud,
      observaciones: certificado.observaciones,
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

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = this.mapMedicoFirmante(
      medicoFirmante
        ? {
            nombre: medicoFirmante.nombre,
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

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    };

    const proveedorSalud = await this.proveedoresSaludService.findOne(
      datosUsuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
          estado: proveedorSalud.estado || '',
          municipio: proveedorSalud.municipio || '',
          codigoPostal: proveedorSalud.codigoPostal || '',
          direccion: proveedorSalud.direccion || '',
          telefono: proveedorSalud.telefono || '',
          correoElectronico: proveedorSalud.correoElectronico || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
        }
      : {
          nombre: '',
          pais: '',
          perfilProveedorSalud: '',
          logotipoEmpresa: null,
          estado: '',
          municipio: '',
          codigoPostal: '',
          direccion: '',
          telefono: '',
          correoElectronico: '',
          sitioWeb: '',
        };

    const fecha = convertirFechaADDMMAAAA(certificado.fechaCertificadoExpedito)
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Certificado Expedito ${fecha}.pdf`;

    const rutaDirectorio = path.resolve(certificado.rutaPDF);
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

    const datosExamenVista = {
      fechaExamenVista: examenVista.fechaExamenVista,
      ojoIzquierdoCegueraTotal: examenVista.ojoIzquierdoCegueraTotal,
      ojoDerechoCegueraTotal: examenVista.ojoDerechoCegueraTotal,
      ojoIzquierdoLejanaCegueraTotal:
        examenVista.ojoIzquierdoLejanaCegueraTotal,
      ojoDerechoLejanaCegueraTotal: examenVista.ojoDerechoLejanaCegueraTotal,
      ojoIzquierdoCercanaCegueraTotal:
        examenVista.ojoIzquierdoCercanaCegueraTotal,
      ojoDerechoCercanaCegueraTotal: examenVista.ojoDerechoCercanaCegueraTotal,
      ojoIzquierdoLejanaSinCorreccion:
        examenVista.ojoIzquierdoLejanaSinCorreccion,
      ojoDerechoLejanaSinCorreccion: examenVista.ojoDerechoLejanaSinCorreccion,
      sinCorreccionLejanaInterpretacion:
        examenVista.sinCorreccionLejanaInterpretacion,
      requiereLentesUsoGeneral: examenVista.requiereLentesUsoGeneral,
      ojoIzquierdoCercanaSinCorreccion:
        examenVista.ojoIzquierdoCercanaSinCorreccion,
      ojoDerechoCercanaSinCorreccion:
        examenVista.ojoDerechoCercanaSinCorreccion,
      sinCorreccionCercanaInterpretacion:
        examenVista.sinCorreccionCercanaInterpretacion,
      requiereLentesParaLectura: examenVista.requiereLentesParaLectura,
      ojoIzquierdoLejanaConCorreccion:
        examenVista.ojoIzquierdoLejanaConCorreccion,
      ojoDerechoLejanaConCorreccion: examenVista.ojoDerechoLejanaConCorreccion,
      conCorreccionLejanaInterpretacion:
        examenVista.conCorreccionLejanaInterpretacion,
      ojoIzquierdoCercanaConCorreccion:
        examenVista.ojoIzquierdoCercanaConCorreccion,
      ojoDerechoCercanaConCorreccion:
        examenVista.ojoDerechoCercanaConCorreccion,
      conCorreccionCercanaInterpretacion:
        examenVista.conCorreccionCercanaInterpretacion,
      placasCorrectas: examenVista.placasCorrectas,
      porcentajeIshihara: examenVista.porcentajeIshihara,
      interpretacionIshihara: examenVista.interpretacionIshihara,
      testEstereopsis: examenVista.testEstereopsis,
      testCampoVisual: examenVista.testCampoVisual,
      coverTest: examenVista.coverTest,
      esferaOjoIzquierdo: examenVista.esferaOjoIzquierdo,
      cilindroOjoIzquierdo: examenVista.cilindroOjoIzquierdo,
      adicionOjoIzquierdo: examenVista.adicionOjoIzquierdo,
      esferaOjoDerecho: examenVista.esferaOjoDerecho,
      cilindroOjoDerecho: examenVista.cilindroOjoDerecho,
      adicionOjoDerecho: examenVista.adicionOjoDerecho,
      diagnosticoRecomendaciones: examenVista.diagnosticoRecomendaciones,
      antecedentes: examenVista.antecedentes,
      anamnesis: examenVista.anamnesis,
      utilizaAnteojos: examenVista.utilizaAnteojos,
    };

    // Determinar footerFirmantesData según estado del documento
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
        (
          examenVista.finalizadoPor?._id || examenVista.finalizadoPor
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
      examenVista.estado === DocumentoEstado.BORRADOR
        ? (examenVista.createdBy?._id || examenVista.createdBy)?.toString() ||
          userId
        : examenVista.estado === DocumentoEstado.FINALIZADO ||
            examenVista.estado === DocumentoEstado.ANULADO
          ? (
              examenVista.finalizadoPor?._id || examenVista.finalizadoPor
            )?.toString() || userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = this.mapMedicoFirmante(
      medicoFirmante
        ? {
            nombre: medicoFirmante.nombre,
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
      await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
      ? {
          nombre: enfermeraFirmante.nombre || '',
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
          sexo: tecnicoFirmante.sexo || '',
          tituloProfesional: tecnicoFirmante.tituloProfesional || '',
          numeroCedulaProfesional:
            tecnicoFirmante.numeroCedulaProfesional || '',
          nombreCredencialAdicional:
            tecnicoFirmante.nombreCredencialAdicional || '',
          numeroCredencialAdicional:
            tecnicoFirmante.numeroCredencialAdicional || '',
          firma:
            (tecnicoFirmante.firma as { data: string; contentType: string }) ||
            null,
        }
      : {
          nombre: '',
          sexo: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    };
    const proveedorSalud = await this.proveedoresSaludService.findOne(
      datosUsuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
          estado: proveedorSalud.estado || '',
          municipio: proveedorSalud.municipio || '',
          codigoPostal: proveedorSalud.codigoPostal || '',
          direccion: proveedorSalud.direccion || '',
          telefono: proveedorSalud.telefono || '',
          correoElectronico: proveedorSalud.correoElectronico || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
          colorInforme: proveedorSalud.colorInforme || '#343A40',
        }
      : {
          nombre: '',
          pais: '',
          perfilProveedorSalud: '',
          logotipoEmpresa: null,
          estado: '',
          municipio: '',
          codigoPostal: '',
          direccion: '',
          telefono: '',
          correoElectronico: '',
          sitioWeb: '',
          colorInforme: '#343A40',
        };

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
      datosExamenVista,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosTecnicoFirmante,
      datosProveedorSalud,
      footerData,
    );
    await this.printer.createPdf(docDefinition, rutaCompleta);

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
          nombre: medicoFirmante.nombre || '',
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
          nombre: enfermeraFirmante.nombre || '',
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
          sexo: tecnicoFirmante.sexo || '',
          tituloProfesional: tecnicoFirmante.tituloProfesional || '',
          numeroCedulaProfesional:
            tecnicoFirmante.numeroCedulaProfesional || '',
          nombreCredencialAdicional:
            tecnicoFirmante.nombreCredencialAdicional || '',
          numeroCredencialAdicional:
            tecnicoFirmante.numeroCredencialAdicional || '',
          firma:
            (tecnicoFirmante.firma as { data: string; contentType: string }) ||
            null,
        }
      : {
          nombre: '',
          sexo: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    };

    const proveedorSalud = await this.proveedoresSaludService.findOne(
      datosUsuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
          estado: proveedorSalud.estado || '',
          municipio: proveedorSalud.municipio || '',
          codigoPostal: proveedorSalud.codigoPostal || '',
          direccion: proveedorSalud.direccion || '',
          telefono: proveedorSalud.telefono || '',
          correoElectronico: proveedorSalud.correoElectronico || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
          colorInforme: proveedorSalud.colorInforme || '#343A40',
        }
      : {
          nombre: '',
          pais: '',
          perfilProveedorSalud: '',
          logotipoEmpresa: null,
          estado: '',
          municipio: '',
          codigoPostal: '',
          direccion: '',
          telefono: '',
          correoElectronico: '',
          sitioWeb: '',
          colorInforme: '#343A40',
        };

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
          nombre: medicoFirmante.nombre || '',
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
          nombre: enfermeraFirmante.nombre || '',
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
          sexo: tecnicoFirmante.sexo || '',
          tituloProfesional: tecnicoFirmante.tituloProfesional || '',
          numeroCedulaProfesional:
            tecnicoFirmante.numeroCedulaProfesional || '',
          nombreCredencialAdicional:
            tecnicoFirmante.nombreCredencialAdicional || '',
          numeroCredencialAdicional:
            tecnicoFirmante.numeroCredencialAdicional || '',
          firma:
            (tecnicoFirmante.firma as { data: string; contentType: string }) ||
            null,
        }
      : {
          nombre: '',
          sexo: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    };
    const proveedorSalud = await this.proveedoresSaludService.findOne(
      datosUsuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
          estado: proveedorSalud.estado || '',
          municipio: proveedorSalud.municipio || '',
          codigoPostal: proveedorSalud.codigoPostal || '',
          direccion: proveedorSalud.direccion || '',
          telefono: proveedorSalud.telefono || '',
          correoElectronico: proveedorSalud.correoElectronico || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
          colorInforme: proveedorSalud.colorInforme || '#343A40',
        }
      : {
          nombre: '',
          pais: '',
          perfilProveedorSalud: '',
          logotipoEmpresa: null,
          estado: '',
          municipio: '',
          codigoPostal: '',
          direccion: '',
          telefono: '',
          correoElectronico: '',
          sitioWeb: '',
          colorInforme: '#343A40',
        };

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

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = medicoFirmante
      ? {
          nombre: medicoFirmante.nombre || '',
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
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          especialistaSaludTrabajo: '',
          numeroCedulaEspecialista: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
      ? {
          nombre: enfermeraFirmante.nombre || '',
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
          sexo: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    };
    const proveedorSalud = await this.proveedoresSaludService.findOne(
      datosUsuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
          estado: proveedorSalud.estado || '',
          municipio: proveedorSalud.municipio || '',
          codigoPostal: proveedorSalud.codigoPostal || '',
          direccion: proveedorSalud.direccion || '',
          telefono: proveedorSalud.telefono || '',
          correoElectronico: proveedorSalud.correoElectronico || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
          colorInforme: proveedorSalud.colorInforme || '#343A40',
        }
      : {
          nombre: '',
          pais: '',
          perfilProveedorSalud: '',
          logotipoEmpresa: null,
          estado: '',
          municipio: '',
          codigoPostal: '',
          direccion: '',
          telefono: '',
          correoElectronico: '',
          sitioWeb: '',
          colorInforme: '#343A40',
        };

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
    const datosMedicoFirmante = medicoFirmante
      ? {
          nombre: medicoFirmante.nombre || '',
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
          nombre: enfermeraFirmante.nombre || '',
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
          sexo: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    };
    const proveedorSalud = await this.proveedoresSaludService.findOne(
      datosUsuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
          estado: proveedorSalud.estado || '',
          municipio: proveedorSalud.municipio || '',
          codigoPostal: proveedorSalud.codigoPostal || '',
          direccion: proveedorSalud.direccion || '',
          telefono: proveedorSalud.telefono || '',
          correoElectronico: proveedorSalud.correoElectronico || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
          colorInforme: proveedorSalud.colorInforme || '#343A40',
        }
      : {
          nombre: '',
          pais: '',
          perfilProveedorSalud: '',
          logotipoEmpresa: null,
          estado: '',
          municipio: '',
          codigoPostal: '',
          direccion: '',
          telefono: '',
          correoElectronico: '',
          sitioWeb: '',
          colorInforme: '#343A40',
        };

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
          nombre: medicoFirmante.nombre || '',
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
          nombre: enfermeraFirmante.nombre || '',
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
          sexo: tecnicoFirmante.sexo || '',
          tituloProfesional: tecnicoFirmante.tituloProfesional || '',
          numeroCedulaProfesional:
            tecnicoFirmante.numeroCedulaProfesional || '',
          nombreCredencialAdicional:
            tecnicoFirmante.nombreCredencialAdicional || '',
          numeroCredencialAdicional:
            tecnicoFirmante.numeroCredencialAdicional || '',
          firma:
            (tecnicoFirmante.firma as { data: string; contentType: string }) ||
            null,
        }
      : {
          nombre: '',
          sexo: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    };
    const proveedorSalud = await this.proveedoresSaludService.findOne(
      datosUsuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
          estado: proveedorSalud.estado || '',
          municipio: proveedorSalud.municipio || '',
          codigoPostal: proveedorSalud.codigoPostal || '',
          direccion: proveedorSalud.direccion || '',
          telefono: proveedorSalud.telefono || '',
          correoElectronico: proveedorSalud.correoElectronico || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
          colorInforme: proveedorSalud.colorInforme || '#343A40',
        }
      : {
          nombre: '',
          pais: '',
          perfilProveedorSalud: '',
          logotipoEmpresa: null,
          estado: '',
          municipio: '',
          codigoPostal: '',
          direccion: '',
          telefono: '',
          correoElectronico: '',
          sitioWeb: '',
          colorInforme: '#343A40',
        };

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
          nombre: medicoFirmante.nombre || '',
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
          nombre: enfermeraFirmante.nombre || '',
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
          sexo: tecnicoFirmante.sexo || '',
          tituloProfesional: tecnicoFirmante.tituloProfesional || '',
          numeroCedulaProfesional:
            tecnicoFirmante.numeroCedulaProfesional || '',
          nombreCredencialAdicional:
            tecnicoFirmante.nombreCredencialAdicional || '',
          numeroCredencialAdicional:
            tecnicoFirmante.numeroCredencialAdicional || '',
          firma:
            (tecnicoFirmante.firma as { data: string; contentType: string }) ||
            null,
        }
      : {
          nombre: '',
          sexo: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    };
    const proveedorSalud = await this.proveedoresSaludService.findOne(
      datosUsuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
          estado: proveedorSalud.estado || '',
          municipio: proveedorSalud.municipio || '',
          codigoPostal: proveedorSalud.codigoPostal || '',
          direccion: proveedorSalud.direccion || '',
          telefono: proveedorSalud.telefono || '',
          correoElectronico: proveedorSalud.correoElectronico || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
          colorInforme: proveedorSalud.colorInforme || '#343A40',
        }
      : {
          nombre: '',
          pais: '',
          perfilProveedorSalud: '',
          logotipoEmpresa: null,
          estado: '',
          municipio: '',
          codigoPostal: '',
          direccion: '',
          telefono: '',
          correoElectronico: '',
          sitioWeb: '',
          colorInforme: '#343A40',
        };

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
          nombre: medicoFirmante.nombre || '',
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
          nombre: enfermeraFirmante.nombre || '',
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
          sexo: tecnicoFirmante.sexo || '',
          tituloProfesional: tecnicoFirmante.tituloProfesional || '',
          numeroCedulaProfesional:
            tecnicoFirmante.numeroCedulaProfesional || '',
          nombreCredencialAdicional:
            tecnicoFirmante.nombreCredencialAdicional || '',
          numeroCredencialAdicional:
            tecnicoFirmante.numeroCredencialAdicional || '',
          firma:
            (tecnicoFirmante.firma as { data: string; contentType: string }) ||
            null,
        }
      : {
          nombre: '',
          sexo: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    };
    const proveedorSalud = await this.proveedoresSaludService.findOne(
      datosUsuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
          estado: proveedorSalud.estado || '',
          municipio: proveedorSalud.municipio || '',
          codigoPostal: proveedorSalud.codigoPostal || '',
          direccion: proveedorSalud.direccion || '',
          telefono: proveedorSalud.telefono || '',
          correoElectronico: proveedorSalud.correoElectronico || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
          colorInforme: proveedorSalud.colorInforme || '#343A40',
        }
      : {
          nombre: '',
          pais: '',
          perfilProveedorSalud: '',
          logotipoEmpresa: null,
          estado: '',
          municipio: '',
          codigoPostal: '',
          direccion: '',
          telefono: '',
          correoElectronico: '',
          sitioWeb: '',
          colorInforme: '#343A40',
        };

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
          nombre: enfermeraFirmante.nombre || '',
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
          sexo: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    };
    const proveedorSalud = await this.proveedoresSaludService.findOne(
      datosUsuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
          estado: proveedorSalud.estado || '',
          municipio: proveedorSalud.municipio || '',
          codigoPostal: proveedorSalud.codigoPostal || '',
          direccion: proveedorSalud.direccion || '',
          telefono: proveedorSalud.telefono || '',
          correoElectronico: proveedorSalud.correoElectronico || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
          colorInforme: proveedorSalud.colorInforme || '#343A40',
        }
      : {
          nombre: '',
          pais: '',
          perfilProveedorSalud: '',
          logotipoEmpresa: null,
          estado: '',
          municipio: '',
          codigoPostal: '',
          direccion: '',
          telefono: '',
          correoElectronico: '',
          sitioWeb: '',
          colorInforme: '#343A40',
        };

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

  async getInformeLesion(
    empresaId: string,
    trabajadorId: string,
    lesionId: string,
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
    const lesion = await this.expedientesService.findDocument(
      'lesion',
      lesionId,
    );

    // Resolver etiquetas de catálogos para el PDF
    let sitioOcurrenciaLabel: string | undefined;
    let tipoVialidadLabel: string | undefined;
    let tipoAsentamientoLabel: string | undefined;
    let agenteLesionLabel: string | undefined;
    let areaAnatomicaLabel: string | undefined;
    let consecuenciaGravedadLabel: string | undefined;
    let entidadLabel: string | undefined;
    let municipioLabel: string | undefined;
    let localidadLabel: string | undefined;

    try {
      if (lesion.sitioOcurrencia != null) {
        const e = await this.catalogsService.getCatalogEntry(
          CatalogType.SITIO_OCURRENCIA,
          String(lesion.sitioOcurrencia),
        );
        sitioOcurrenciaLabel = e?.description;
      }
      if (lesion.tipoVialidad != null) {
        const e = await this.catalogsService.getCatalogEntry(
          CatalogType.TIPO_VIALIDAD,
          String(lesion.tipoVialidad),
        );
        tipoVialidadLabel = e?.description;
      }
      if (lesion.tipoAsentamiento != null) {
        const e = await this.catalogsService.getCatalogEntry(
          CatalogType.TIPO_ASENTAMIENTO,
          String(lesion.tipoAsentamiento),
        );
        tipoAsentamientoLabel = e?.description;
      }
      if (lesion.agenteLesion != null && lesion.agenteLesion !== -1) {
        const e = await this.catalogsService.getCatalogEntry(
          CatalogType.AGENTE_LESION,
          String(lesion.agenteLesion),
        );
        agenteLesionLabel = e?.description;
      }
      if (lesion.areaAnatomica != null) {
        const e = await this.catalogsService.getCatalogEntry(
          CatalogType.AREA_ANATOMICA,
          String(lesion.areaAnatomica),
        );
        areaAnatomicaLabel = e?.description;
      }
      if (lesion.consecuenciaGravedad != null) {
        const e = await this.catalogsService.getCatalogEntry(
          CatalogType.CONSECUENCIA,
          String(lesion.consecuenciaGravedad),
        );
        consecuenciaGravedadLabel = e?.description;
      }
      if (lesion.entidadOcurrencia) {
        const e = this.catalogsService.getEstadoByCode(
          String(lesion.entidadOcurrencia).padStart(2, '0'),
        );
        entidadLabel = e?.description;
      }
      if (lesion.entidadOcurrencia && lesion.municipioOcurrencia) {
        const munCode = String(lesion.municipioOcurrencia).includes('-')
          ? String(lesion.municipioOcurrencia).split('-')[1]
          : lesion.municipioOcurrencia;
        const munList = this.catalogsService.getMunicipiosByEstado(
          String(lesion.entidadOcurrencia).padStart(2, '0'),
        );
        const m = munList.find(
          (x) => x.code === munCode || x.code === String(munCode),
        );
        municipioLabel = m?.description;
      }
      if (
        lesion.entidadOcurrencia &&
        lesion.municipioOcurrencia &&
        lesion.localidadOcurrencia
      ) {
        const munCode = String(lesion.municipioOcurrencia).includes('-')
          ? String(lesion.municipioOcurrencia).split('-')[1]
          : lesion.municipioOcurrencia;
        const locList = this.catalogsService.getLocalidadesByMunicipio(
          String(lesion.entidadOcurrencia).padStart(2, '0'),
          String(munCode),
        );
        const l = locList.find(
          (x) =>
            x.code === lesion.localidadOcurrencia ||
            x.code === String(lesion.localidadOcurrencia),
        );
        localidadLabel = l?.description;
      }
    } catch {
      // Si falla la resolución de catálogos, se usan los códigos
    }

    const datosLesion = {
      folio: lesion.folio,
      fechaReporteLesion: lesion.fechaReporteLesion,
      fechaEvento: lesion.fechaEvento,
      horaEvento: lesion.horaEvento,
      diaFestivo: lesion.diaFestivo,
      eventoRepetido: lesion.eventoRepetido,
      sitioOcurrencia: lesion.sitioOcurrencia,
      sitioOcurrenciaLabel,
      entidadOcurrencia: lesion.entidadOcurrencia,
      entidadLabel,
      municipioOcurrencia: lesion.municipioOcurrencia,
      municipioLabel,
      localidadOcurrencia: lesion.localidadOcurrencia,
      localidadLabel,
      otraLocalidad: lesion.otraLocalidad,
      codigoPostal: lesion.codigoPostal,
      tipoVialidad: lesion.tipoVialidad,
      tipoVialidadLabel,
      nombreVialidad: lesion.nombreVialidad,
      numeroExterior: lesion.numeroExterior,
      tipoAsentamiento: lesion.tipoAsentamiento,
      tipoAsentamientoLabel,
      nombreAsentamiento: lesion.nombreAsentamiento,
      intencionalidad: lesion.intencionalidad,
      agenteLesion: lesion.agenteLesion,
      agenteLesionLabel,
      especifique: lesion.especifique,
      tipoViolencia: lesion.tipoViolencia,
      numeroAgresores: lesion.numeroAgresores,
      parentescoAfectado: lesion.parentescoAfectado,
      sexoAgresor: lesion.sexoAgresor,
      edadAgresor: lesion.edadAgresor,
      agresorBajoEfectos: lesion.agresorBajoEfectos,
      lesionadoVehiculoMotor: lesion.lesionadoVehiculoMotor,
      usoEquipoSeguridad: lesion.usoEquipoSeguridad,
      equipoUtilizado: lesion.equipoUtilizado,
      especifiqueEquipo: lesion.especifiqueEquipo,
      sospechaBajoEfectosDe: lesion.sospechaBajoEfectosDe,
      atencionPreHospitalaria: lesion.atencionPreHospitalaria,
      tiempoTrasladoUH: lesion.tiempoTrasladoUH,
      fechaAtencion: lesion.fechaAtencion,
      horaAtencion: lesion.horaAtencion,
      servicioAtencion: lesion.servicioAtencion,
      especifiqueServicio: lesion.especifiqueServicio,
      tipoAtencion: lesion.tipoAtencion,
      areaAnatomica: lesion.areaAnatomica,
      areaAnatomicaLabel,
      especifiqueArea: lesion.especifiqueArea,
      consecuenciaGravedad: lesion.consecuenciaGravedad,
      consecuenciaGravedadLabel,
      especifiqueConsecuencia: lesion.especifiqueConsecuencia,
      codigoCIEAfeccionPrincipal: lesion.codigoCIEAfeccionPrincipal,
      descripcionAfeccionPrincipal: lesion.descripcionAfeccionPrincipal,
      codigoCIECausaExterna: lesion.codigoCIECausaExterna,
      causaExterna: lesion.causaExterna,
      afeccionPrincipalReseleccionada: lesion.afeccionPrincipalReseleccionada,
      afeccionesTratadas: lesion.afeccionesTratadas,
      responsableAtencion: (lesion as any).responsableAtencion,
      estado: lesion.estado,
    };

    let footerData: FooterFirmantesData | undefined = footerFirmantesData;
    if (
      !footerData &&
      (lesion.estado === DocumentoEstado.FINALIZADO ||
        lesion.estado === DocumentoEstado.ANULADO)
    ) {
      const creadorId =
        (lesion.createdBy?._id || lesion.createdBy)?.toString() || userId;
      const finalizadorId =
        (lesion.finalizadoPor?._id || lesion.finalizadoPor)?.toString() ||
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
      lesion.estado === DocumentoEstado.BORRADOR
        ? (lesion.createdBy?._id || lesion.createdBy)?.toString() || userId
        : lesion.estado === DocumentoEstado.FINALIZADO ||
            lesion.estado === DocumentoEstado.ANULADO
          ? (lesion.finalizadoPor?._id || lesion.finalizadoPor)?.toString() ||
            userId
          : userId;

    const medicoFirmante =
      await this.medicosFirmantesService.findOneByUserId(firmanteUserId);
    const datosMedicoFirmante = medicoFirmante
      ? {
          nombre: medicoFirmante.nombre || '',
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
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          especialistaSaludTrabajo: '',
          numeroCedulaEspecialista: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const enfermeraFirmante =
      await this.enfermerasFirmantesService.findOneByUserId(firmanteUserId);
    const datosEnfermeraFirmante = enfermeraFirmante
      ? {
          nombre: enfermeraFirmante.nombre || '',
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
          sexo: '',
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };

    const usuario = await this.usersService.findById(userId);
    const proveedorSalud = await this.proveedoresSaludService.findOne(
      usuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          direccion: proveedorSalud.direccion || '',
          municipio: proveedorSalud.municipio || '',
          estado: proveedorSalud.estado || '',
          telefono: proveedorSalud.telefono || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
        }
      : {
          nombre: '',
          pais: '',
          direccion: '',
          municipio: '',
          estado: '',
          telefono: '',
          sitioWeb: '',
          logotipoEmpresa: null,
        };

    const centroId = (
      trabajador.idCentroTrabajo?._id || trabajador.idCentroTrabajo
    )?.toString();
    const centro = centroId
      ? await this.centrosTrabajoService.findOne(centroId)
      : null;
    const trabajadorNombre = [
      trabajador.primerApellido ?? '',
      trabajador.segundoApellido ?? '',
      trabajador.nombre ?? '',
    ]
      .join(' ')
      .trim();
    const rutaBase = `expedientes-medicos/${nombreEmpresa}/${centro?.nombreCentro ?? 'SinCentro'}/${trabajadorNombre}_${trabajadorId}`;
    const fecha = convertirFechaADDMMAAAA(lesion.fechaAtencion)
      .replace(/\//g, '-')
      .replace(/\\/g, '-');
    const nombreArchivo = `Reporte Lesion ${fecha} ${lesion.folio}.pdf`;
    const rutaDirectorio = path.resolve(rutaBase);
    if (!fs.existsSync(rutaDirectorio)) {
      fs.mkdirSync(rutaDirectorio, { recursive: true });
    }

    const rutaCompleta = path.join(rutaDirectorio, nombreArchivo);
    const docDefinition = lesionInforme(
      nombreEmpresa,
      datosTrabajador,
      datosLesion,
      datosMedicoFirmante,
      datosEnfermeraFirmante,
      datosProveedorSalud,
      footerData,
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
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
          nombre: medicoFirmante.nombre || '',
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
          tituloProfesional: '',
          numeroCedulaProfesional: '',
          especialistaSaludTrabajo: '',
          numeroCedulaEspecialista: '',
          nombreCredencialAdicional: '',
          numeroCredencialAdicional: '',
          firma: null,
        };
    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    };
    const proveedorSalud = await this.proveedoresSaludService.findOne(
      datosUsuario.idProveedorSalud,
    );
    const datosProveedorSalud = proveedorSalud
      ? {
          nombre: proveedorSalud.nombre || '',
          pais: proveedorSalud.pais || '',
          perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || '',
          logotipoEmpresa:
            (proveedorSalud.logotipoEmpresa as {
              data: string;
              contentType: string;
            }) || null,
          estado: proveedorSalud.estado || '',
          municipio: proveedorSalud.municipio || '',
          codigoPostal: proveedorSalud.codigoPostal || '',
          direccion: proveedorSalud.direccion || '',
          telefono: proveedorSalud.telefono || '',
          correoElectronico: proveedorSalud.correoElectronico || '',
          sitioWeb: proveedorSalud.sitioWeb || '',
          colorInforme: proveedorSalud.colorInforme || '#343A40',
        }
      : {
          nombre: '',
          pais: '',
          perfilProveedorSalud: '',
          logotipoEmpresa: null,
          estado: '',
          municipio: '',
          codigoPostal: '',
          direccion: '',
          telefono: '',
          correoElectronico: '',
          sitioWeb: '',
          colorInforme: '#343A40',
        };

    const docDefinition = dashboardInforme(
      nombreEmpresa,
      datosTrabajador,
      datosMedicoFirmante,
      datosProveedorSalud,
    );

    return this.printer.createPdfBuffer(docDefinition);
  }

  async eliminarInforme(filePath: string): Promise<void> {
    await this.filesService.deleteFile(filePath);
  }
}
