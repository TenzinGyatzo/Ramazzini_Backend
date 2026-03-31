// Servicios para la generación de informes en PDF
import { BadRequestException, Injectable } from '@nestjs/common';
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
import { ResultadosClinicosService } from '../resultados-clinicos/resultados-clinicos.service';

@Injectable()
export class InformesService {
  constructor(
    private readonly printer: PrinterService,
    private readonly empresasService: EmpresasService,
    private readonly trabajadoresService: TrabajadoresService,
    private readonly expedientesService: ExpedientesService,
    private readonly filesService: FilesService,
    private readonly usersService: UsersService,
    private readonly medicosFirmantesService: MedicosFirmantesService,
    private readonly enfermerasFirmantesService: EnfermerasFirmantesService,
    private readonly proveedoresSaludService: ProveedoresSaludService,
    private readonly tecnicosFirmantesService: TecnicosFirmantesService,
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

  async getInformeAntidoping(
    empresaId: string,
    trabajadorId: string,
    antidopingId: string,
    userId: string,
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
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

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
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
            firma: (medicoFirmante.firma as { data: string; contentType: string }) || null,
          }
        : null,
    );

    const enfermeraFirmante = await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante = await this.tecnicosFirmantesService.findOneByUserId(userId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const usuario = await this.usersService.findById(userId);
     const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 
    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
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
          ojoIzquierdoLejanaCegueraTotal: nearestExamenVista.ojoIzquierdoLejanaCegueraTotal,
          ojoDerechoLejanaCegueraTotal: nearestExamenVista.ojoDerechoLejanaCegueraTotal,
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
          hipoacusiaBilateralCombinada: nearestAudiometria.hipoacusiaBilateralCombinada,
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
          metilendioximetanfetamina: nearestAntidoping.metilendioximetanfetamina || null,
          ketamina: nearestAntidoping.ketamina || null,
        }
      : null;

    const resultadosClinicos = includeResultadosClinicos
      ? await this.resultadosClinicosService.findByTrabajador(trabajadorId)
      : [];

    const findMostRecentResultadoClinico = (items: any[], tipoEstudio: string) =>
      items.find((item) => item?.tipoEstudio === tipoEstudio && item?.fechaEstudio) || null;

    const nearestEKG = findMostRecentResultadoClinico(resultadosClinicos, 'EKG');
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

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
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
            firma: (medicoFirmante.firma as { data: string; contentType: string }) || null,
          }
        : null,
    );

    const usuario = await this.usersService.findById(userId);
     const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 

    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
        semaforizacionActivada: proveedorSalud.semaforizacionActivada || false,
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
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

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
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
            firma: (medicoFirmante.firma as { data: string; contentType: string }) || null,
          }
        : null,
    );

    const usuario = await this.usersService.findById(userId);
     const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 

    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
        semaforizacionActivada: proveedorSalud.semaforizacionActivada || false,
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
        semaforizacionActivada: false,
      };

    // Formatear la fecha para el nombre del archivo
    const fecha = convertirFechaADDMMAAAA(constanciaAptitud.fechaConstanciaAptitud)
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
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

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
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
            firma: (medicoFirmante.firma as { data: string; contentType: string }) || null,
          }
        : null,
    );

    const enfermeraFirmante = await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante = await this.tecnicosFirmantesService.findOneByUserId(userId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const usuario = await this.usersService.findById(userId);
     const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 

    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
        semaforizacionActivada: proveedorSalud.semaforizacionActivada || false,
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
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
      fechaExploracionFisica: nearestExploracionFisica.fechaExploracionFisica,
      peso: nearestExploracionFisica.peso,
      altura: nearestExploracionFisica.altura,
      indiceMasaCorporal: nearestExploracionFisica.indiceMasaCorporal,
      categoriaIMC: nearestExploracionFisica.categoriaIMC,
      circunferenciaCintura: nearestExploracionFisica.circunferenciaCintura,
      categoriaCircunferenciaCintura:
        nearestExploracionFisica.categoriaCircunferenciaCintura,
      tensionArterialSistolica: nearestExploracionFisica.tensionArterialSistolica,
      tensionArterialDiastolica: nearestExploracionFisica.tensionArterialDiastolica,
      categoriaTensionArterial: nearestExploracionFisica.categoriaTensionArterial,
      frecuenciaCardiaca: nearestExploracionFisica.frecuenciaCardiaca,
      categoriaFrecuenciaCardiaca:
        nearestExploracionFisica.categoriaFrecuenciaCardiaca,
      frecuenciaRespiratoria: nearestExploracionFisica.frecuenciaRespiratoria,
      categoriaFrecuenciaRespiratoria:
        nearestExploracionFisica.categoriaFrecuenciaRespiratoria,
      saturacionOxigeno: nearestExploracionFisica.saturacionOxigeno,
      categoriaSaturacionOxigeno: nearestExploracionFisica.categoriaSaturacionOxigeno,
      craneoCara: nearestExploracionFisica.craneoCara,
      ojos: nearestExploracionFisica.ojos,
      oidos: nearestExploracionFisica.oidos,
      nariz: nearestExploracionFisica.nariz,
      boca: nearestExploracionFisica.boca,
      cuello: nearestExploracionFisica.cuello,
      hombros: nearestExploracionFisica.hombros,
      codos: nearestExploracionFisica.codos,
      manos: nearestExploracionFisica.manos,
      reflejosOsteoTendinososSuperiores: nearestExploracionFisica.reflejosOsteoTendinososSuperiores,
      vascularESuperiores: nearestExploracionFisica.vascularESuperiores,
      torax: nearestExploracionFisica.torax,
      abdomen: nearestExploracionFisica.abdomen,
      cadera: nearestExploracionFisica.cadera,
      rodillas: nearestExploracionFisica.rodillas,
      tobillosPies: nearestExploracionFisica.tobillosPies,
      reflejosOsteoTendinososInferiores: nearestExploracionFisica.reflejosOsteoTendinososInferiores,
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
      resumenExploracionFisica: nearestExploracionFisica.resumenExploracionFisica,
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
          ojoIzquierdoLejanaCegueraTotal: nearestExamenVista.ojoIzquierdoLejanaCegueraTotal,
          ojoDerechoLejanaCegueraTotal: nearestExamenVista.ojoDerechoLejanaCegueraTotal,
          ojoIzquierdoCercanaCegueraTotal: nearestExamenVista.ojoIzquierdoCercanaCegueraTotal,
          ojoDerechoCercanaCegueraTotal: nearestExamenVista.ojoDerechoCercanaCegueraTotal,
          ojoIzquierdoLejanaSinCorreccion:
            nearestExamenVista.ojoIzquierdoLejanaSinCorreccion,
          ojoDerechoLejanaSinCorreccion: nearestExamenVista.ojoDerechoLejanaSinCorreccion,
          sinCorreccionLejanaInterpretacion:
            nearestExamenVista.sinCorreccionLejanaInterpretacion,
          requiereLentesUsoGeneral: nearestExamenVista.requiereLentesUsoGeneral,
          ojoIzquierdoCercanaSinCorreccion:
            nearestExamenVista.ojoIzquierdoCercanaSinCorreccion,
          ojoDerechoCercanaSinCorreccion:
            nearestExamenVista.ojoDerechoCercanaSinCorreccion,
          sinCorreccionCercanaInterpretacion:
            nearestExamenVista.sinCorreccionCercanaInterpretacion,
          requiereLentesParaLectura: nearestExamenVista.requiereLentesParaLectura,
          ojoIzquierdoLejanaConCorreccion:
            nearestExamenVista.ojoIzquierdoLejanaConCorreccion,
          ojoDerechoLejanaConCorreccion: nearestExamenVista.ojoDerechoLejanaConCorreccion,
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

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
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
            firma: (medicoFirmante.firma as { data: string; contentType: string }) || null,
          }
        : null,
    );

    const usuario = await this.usersService.findById(userId);
     const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 

    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
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
    );
    await this.printer.createPdf(docDefinition, rutaCompleta);

    return rutaCompleta;
  }

  async getInformeCertificadoExpedito(
    empresaId: string,
    trabajadorId: string,
    certificadoExpeditoId: string,
    userId: string,
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
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

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
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
            firma: (medicoFirmante.firma as { data: string; contentType: string }) || null,
          }
        : null,
    );

    const usuario = await this.usersService.findById(userId);
     const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 

    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
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
    );
    await this.printer.createPdf(docDefinition, rutaCompleta);

    return rutaCompleta;
  }

  async getInformeExamenVista(
    empresaId: string,
    trabajadorId: string,
    examenVistaId: string,
    userId: string,
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
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
      ojoIzquierdoLejanaCegueraTotal: examenVista.ojoIzquierdoLejanaCegueraTotal,
      ojoDerechoLejanaCegueraTotal: examenVista.ojoDerechoLejanaCegueraTotal,
      ojoIzquierdoCercanaCegueraTotal: examenVista.ojoIzquierdoCercanaCegueraTotal,
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

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
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
            firma: (medicoFirmante.firma as { data: string; contentType: string }) || null,
          }
        : null,
    );
    
    const enfermeraFirmante = await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante = await this.tecnicosFirmantesService.findOneByUserId(userId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const usuario = await this.usersService.findById(userId);
     const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 
    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
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
    );
    await this.printer.createPdf(docDefinition, rutaCompleta);

    return rutaCompleta;
  }

  async getInformeExploracionFisica(
    empresaId: string,
    trabajadorId: string,
    exploracionFisicaId: string,
    userId: string,
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
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
      reflejosOsteoTendinososSuperiores: exploracionFisica.reflejosOsteoTendinososSuperiores,
      vascularESuperiores: exploracionFisica.vascularESuperiores,
      torax: exploracionFisica.torax,
      abdomen: exploracionFisica.abdomen,
      cadera: exploracionFisica.cadera,
      rodillas: exploracionFisica.rodillas,
      tobillosPies: exploracionFisica.tobillosPies,
      reflejosOsteoTendinososInferiores: exploracionFisica.reflejosOsteoTendinososInferiores,
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

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
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
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante = await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante = await this.tecnicosFirmantesService.findOneByUserId(userId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const usuario = await this.usersService.findById(userId);
     const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 

    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
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
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);

    return rutaCompleta;
  }

  async getInformeHistoriaClinica(
    empresaId: string,
    trabajadorId: string,
    historiaClinicaId: string,
    userId: string,
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
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

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
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
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante = await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante = await this.tecnicosFirmantesService.findOneByUserId(userId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const usuario = await this.usersService.findById(userId);
     const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 
    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
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
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);

    return rutaCompleta;
  }

  async getInformeNotaMedica(empresaId: string, trabajadorId: string, notaMedicaId: string, userId: string): Promise<string> {
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };
    const notaMedica = await this.expedientesService.findDocument('notaMedica', notaMedicaId);
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
      diagnostico: notaMedica.diagnostico,
      tratamiento: notaMedica.tratamiento,
      recomendaciones: notaMedica.recomendaciones,
      observaciones: notaMedica.observaciones,
    };

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
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
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante = await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 
    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
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
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    return rutaCompleta;
  }

  async getInformeControlPrenatal(empresaId: string, trabajadorId: string, controlPrenatalId: string, userId: string): Promise<string> {
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };
    const controlPrenatal = await this.expedientesService.findDocument('controlPrenatal', controlPrenatalId);
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

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
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
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante = await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante = await this.tecnicosFirmantesService.findOneByUserId(userId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 
    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
      };

    const fecha = convertirFechaADDMMAAAA(controlPrenatal.fechaInicioControlPrenatal)
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
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    return rutaCompleta;
  }

  async getInformeHistoriaOtologica(empresaId: string, trabajadorId: string, historiaOtologicaId: string, userId: string): Promise<string> {
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };
    const historiaOtologica = await this.expedientesService.findDocument('historiaOtologica', historiaOtologicaId);
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
      traumatismoCranealBarotrauma: historiaOtologica.traumatismoCranealBarotrauma,
      usoAudifonos: historiaOtologica.usoAudifonos,
      historiaFamiliarHipoacusia: historiaOtologica.historiaFamiliarHipoacusia,
      meningitisInfeccionGraveInfancia: historiaOtologica.meningitisInfeccionGraveInfancia,
      diabetes: historiaOtologica.diabetes,
      enfermedadRenal: historiaOtologica.enfermedadRenal,
      medicamentosOtotoxicos: historiaOtologica.medicamentosOtotoxicos,
      trabajoAmbientesRuidosos: historiaOtologica.trabajoAmbientesRuidosos,
      tiempoExposicionLaboral: historiaOtologica.tiempoExposicionLaboral,
      usoProteccionAuditiva: historiaOtologica.usoProteccionAuditiva,
      musicaFuerteAudifonos: historiaOtologica.musicaFuerteAudifonos,
      armasFuegoPasatiemposRuidosos: historiaOtologica.armasFuegoPasatiemposRuidosos,
      servicioMilitar: historiaOtologica.servicioMilitar,
      alergias: historiaOtologica.alergias,
      resfriadoDiaPrueba: historiaOtologica.resfriadoDiaPrueba,
      otoscopiaOidoDerecho: historiaOtologica.otoscopiaOidoDerecho,
      otoscopiaOidoIzquierdo: historiaOtologica.otoscopiaOidoIzquierdo,
      resultadoCuestionario: historiaOtologica.resultadoCuestionario,
      resultadoCuestionarioPersonalizado: historiaOtologica.resultadoCuestionarioPersonalizado,
    };

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
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
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante = await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante = await this.tecnicosFirmantesService.findOneByUserId(userId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 
    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
      };

    const fecha = convertirFechaADDMMAAAA(historiaOtologica.fechaHistoriaOtologica)
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
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    return rutaCompleta;
  }

  async getInformePrevioEspirometria(empresaId: string, trabajadorId: string, previoEspirometriaId: string, userId: string): Promise<string> {
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };
    const previoEspirometria = await this.expedientesService.findDocument('previoEspirometria', previoEspirometriaId);
    const datosPrevioEspirometria = {
      fechaPrevioEspirometria: previoEspirometria.fechaPrevioEspirometria,
      tabaquismo: previoEspirometria.tabaquismo,
      cigarrosSemana: previoEspirometria.cigarrosSemana,
      exposicionHumosBiomasa: previoEspirometria.exposicionHumosBiomasa,
      exposicionLaboralPolvos: previoEspirometria.exposicionLaboralPolvos,
      exposicionVaporesGasesIrritantes: previoEspirometria.exposicionVaporesGasesIrritantes,
      antecedentesTuberculosisInfeccionesRespiratorias: previoEspirometria.antecedentesTuberculosisInfeccionesRespiratorias,
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
      medicamentosActualesEspecificar: previoEspirometria.medicamentosActualesEspecificar,
      cirugiaReciente: previoEspirometria.cirugiaReciente,
      infeccionRespiratoriaActiva: previoEspirometria.infeccionRespiratoriaActiva,
      embarazoComplicado: previoEspirometria.embarazoComplicado,
      derramePleural: previoEspirometria.derramePleural,
      neumotorax: previoEspirometria.neumotorax,
      infartoAgudoAnginaInestable: previoEspirometria.infartoAgudoAnginaInestable,
      aneurismaAorticoConocido: previoEspirometria.aneurismaAorticoConocido,
      inestabilidadHemodinamicaGrave: previoEspirometria.inestabilidadHemodinamicaGrave,
      hipertensionIntracraneal: previoEspirometria.hipertensionIntracraneal,
      desprendimientoAgudoRetina: previoEspirometria.desprendimientoAgudoRetina,
      resultadoCuestionario: previoEspirometria.resultadoCuestionario,
      resultadoCuestionarioPersonalizado: previoEspirometria.resultadoCuestionarioPersonalizado,
    };

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
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
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante = await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante = await this.tecnicosFirmantesService.findOneByUserId(userId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 
    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
      };

    const fecha = convertirFechaADDMMAAAA(previoEspirometria.fechaPrevioEspirometria)
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
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    return rutaCompleta;
  }

  async getInformeReceta(empresaId: string, trabajadorId: string, recetaId: string, userId: string): Promise<string> {
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };
    const receta = await this.expedientesService.findDocument('receta', recetaId);
    const datosReceta = {
      fechaReceta: receta.fechaReceta,
      tratamiento: receta.tratamiento,
      recomendaciones: receta.recomendaciones,
      indicaciones: receta.indicaciones,
    };

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
        universidad: medicoFirmante.universidad || "",
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
        universidad: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante = await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 
    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
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
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);
    return rutaCompleta;
  }

  async getInformeEntrevistaPsicologica(
    empresaId: string,
    trabajadorId: string,
    entrevistaPsicologicaId: string,
    userId: string,
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
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
      fechaEntrevistaPsicologica: entrevistaPsicologica.fechaEntrevistaPsicologica,
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
      descripcionAlteracionesPensamiento: entrevistaPsicologica.descripcionAlteracionesPensamiento,
      // IV. Percepción
      alteracionesPerceptuales: entrevistaPsicologica.alteracionesPerceptuales,
      descripcionAlteracionesPerceptuales: entrevistaPsicologica.descripcionAlteracionesPerceptuales,
      // V. Cognición
      orientacion: entrevistaPsicologica.orientacion,
      atencionConcentracion: entrevistaPsicologica.atencionConcentracion,
      memoria: entrevistaPsicologica.memoria,
      // VI. Juicio y conciencia de estado
      juicio: entrevistaPsicologica.juicio,
      concienciaEstado: entrevistaPsicologica.concienciaEstado,
      // VII. Funcionamiento psicosocial
      relacionesInterpersonales: entrevistaPsicologica.relacionesInterpersonales,
      desempenoLaboralAutorreporte: entrevistaPsicologica.desempenoLaboralAutorreporte,
      manejoEstres: entrevistaPsicologica.manejoEstres,
      // VIII. Riesgo inmediato (crítico)
      ideacionSuicida: entrevistaPsicologica.ideacionSuicida,
      observacionesIdeacionSuicida: entrevistaPsicologica.observacionesIdeacionSuicida,
      // IX. Conclusion clínica 
      conclusionClinica: entrevistaPsicologica.conclusionClinica,
    };

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
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
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante = await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante = await this.tecnicosFirmantesService.findOneByUserId(userId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const usuario = await this.usersService.findById(userId);
     const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 
    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
      };

    const fecha = convertirFechaADDMMAAAA(entrevistaPsicologica.fechaEntrevistaPsicologica)
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
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);

    return rutaCompleta;
  }

  async getInformeTrastornosEstadoAnimo(
    empresaId: string,
    trabajadorId: string,
    trastornosEstadoAnimoId: string,
    userId: string,
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
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
      fechaTrastornosEstadoAnimo: trastornosEstadoAnimo.fechaTrastornosEstadoAnimo,
      p1ExaltadoComportamientoNoHabitualOMetidoProblemas: trastornosEstadoAnimo.p1ExaltadoComportamientoNoHabitualOMetidoProblemas,
      p1IrritableGritosPeleas: trastornosEstadoAnimo.p1IrritableGritosPeleas,
      p1MasSeguridadQueLoHabitual: trastornosEstadoAnimo.p1MasSeguridadQueLoHabitual,
      p1DormiaMenosSinNecesitarMasSueno: trastornosEstadoAnimo.p1DormiaMenosSinNecesitarMasSueno,
      p1HablabaMasOMasRapido: trastornosEstadoAnimo.p1HablabaMasOMasRapido,
      p1PensamientosAgolpados: trastornosEstadoAnimo.p1PensamientosAgolpados,
      p1DistraccionDificultadConcentracion: trastornosEstadoAnimo.p1DistraccionDificultadConcentracion,
      p1MasEnergiaQueLoHabitual: trastornosEstadoAnimo.p1MasEnergiaQueLoHabitual,
      p1MasActivoOMasCosasQueLoHabitual: trastornosEstadoAnimo.p1MasActivoOMasCosasQueLoHabitual,
      p1MasSocialExtrovertido: trastornosEstadoAnimo.p1MasSocialExtrovertido,
      p1MasApetitoSexual: trastornosEstadoAnimo.p1MasApetitoSexual,
      p1CosasExageradasRiesgosas: trastornosEstadoAnimo.p1CosasExageradasRiesgosas,
      p1GastoDineroProblemas: trastornosEstadoAnimo.p1GastoDineroProblemas,
      p2SituacionesMismoPeriodo: trastornosEstadoAnimo.p2SituacionesMismoPeriodo,
      p3NivelProblemaCausado: trastornosEstadoAnimo.p3NivelProblemaCausado,
      p4FamiliarDirectoBipolar: trastornosEstadoAnimo.p4FamiliarDirectoBipolar,
      p5DiagnosticoProfesionalBipolar: trastornosEstadoAnimo.p5DiagnosticoProfesionalBipolar,
    };

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
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
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante = await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante = await this.tecnicosFirmantesService.findOneByUserId(userId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const usuario = await this.usersService.findById(userId);
     const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 
    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
      };

    const fecha = convertirFechaADDMMAAAA(trastornosEstadoAnimo.fechaTrastornosEstadoAnimo)
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
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);

    return rutaCompleta;
  }

  async getInformeCuestionarioProdromalBreve(
    empresaId: string,
    trabajadorId: string,
    cuestionarioProdromalBreveId: string,
    userId: string,
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const cuestionarioProdromalBreve = await this.expedientesService.findDocument(
      'cuestionarioProdromalBreve',
      cuestionarioProdromalBreveId,
    );

    const datosCuestionarioProdromalBreve = {
      fechaCuestionarioProdromalBreve: cuestionarioProdromalBreve.fechaCuestionarioProdromalBreve,
      p1: cuestionarioProdromalBreve.p1,
      p1GradoAcuerdoStatement: cuestionarioProdromalBreve.p1GradoAcuerdoStatement,
      p2: cuestionarioProdromalBreve.p2,
      p2GradoAcuerdoStatement: cuestionarioProdromalBreve.p2GradoAcuerdoStatement,
      p3: cuestionarioProdromalBreve.p3,
      p3GradoAcuerdoStatement: cuestionarioProdromalBreve.p3GradoAcuerdoStatement,
      p4: cuestionarioProdromalBreve.p4,
      p4GradoAcuerdoStatement: cuestionarioProdromalBreve.p4GradoAcuerdoStatement,
      p5: cuestionarioProdromalBreve.p5,
      p5GradoAcuerdoStatement: cuestionarioProdromalBreve.p5GradoAcuerdoStatement,
      p6: cuestionarioProdromalBreve.p6,
      p6GradoAcuerdoStatement: cuestionarioProdromalBreve.p6GradoAcuerdoStatement,
      p7: cuestionarioProdromalBreve.p7,
      p7GradoAcuerdoStatement: cuestionarioProdromalBreve.p7GradoAcuerdoStatement,
      p8: cuestionarioProdromalBreve.p8,
      p8GradoAcuerdoStatement: cuestionarioProdromalBreve.p8GradoAcuerdoStatement,
      p9: cuestionarioProdromalBreve.p9,
      p9GradoAcuerdoStatement: cuestionarioProdromalBreve.p9GradoAcuerdoStatement,
      p10: cuestionarioProdromalBreve.p10,
      p10GradoAcuerdoStatement: cuestionarioProdromalBreve.p10GradoAcuerdoStatement,
      p11: cuestionarioProdromalBreve.p11,
      p11GradoAcuerdoStatement: cuestionarioProdromalBreve.p11GradoAcuerdoStatement,
      p12: cuestionarioProdromalBreve.p12,
      p12GradoAcuerdoStatement: cuestionarioProdromalBreve.p12GradoAcuerdoStatement,
      p13: cuestionarioProdromalBreve.p13,
      p13GradoAcuerdoStatement: cuestionarioProdromalBreve.p13GradoAcuerdoStatement,
      p14: cuestionarioProdromalBreve.p14,
      p14GradoAcuerdoStatement: cuestionarioProdromalBreve.p14GradoAcuerdoStatement,
      p15: cuestionarioProdromalBreve.p15,
      p15GradoAcuerdoStatement: cuestionarioProdromalBreve.p15GradoAcuerdoStatement,
      p16: cuestionarioProdromalBreve.p16,
      p16GradoAcuerdoStatement: cuestionarioProdromalBreve.p16GradoAcuerdoStatement,
      p17: cuestionarioProdromalBreve.p17,
      p17GradoAcuerdoStatement: cuestionarioProdromalBreve.p17GradoAcuerdoStatement,
      p18: cuestionarioProdromalBreve.p18,
      p18GradoAcuerdoStatement: cuestionarioProdromalBreve.p18GradoAcuerdoStatement,
      p19: cuestionarioProdromalBreve.p19,
      p19GradoAcuerdoStatement: cuestionarioProdromalBreve.p19GradoAcuerdoStatement,
      p20: cuestionarioProdromalBreve.p20,
      p20GradoAcuerdoStatement: cuestionarioProdromalBreve.p20GradoAcuerdoStatement,
      p21: cuestionarioProdromalBreve.p21,
      p21GradoAcuerdoStatement: cuestionarioProdromalBreve.p21GradoAcuerdoStatement,
    };

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
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
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante = await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante = await this.tecnicosFirmantesService.findOneByUserId(userId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const usuario = await this.usersService.findById(userId);
     const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 
    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
      };

    const fecha = convertirFechaADDMMAAAA(cuestionarioProdromalBreve.fechaCuestionarioProdromalBreve)
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
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);

    return rutaCompleta;
  }

  async getInformeTrastornoLimitePersonalidad(
    empresaId: string,
    trabajadorId: string,
    trastornoLimitePersonalidadId: string,
    userId: string,
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const trastornoLimitePersonalidad = await this.expedientesService.findDocument(
      'trastornoLimitePersonalidad',
      trastornoLimitePersonalidadId,
    );

    const datosTrastornoLimitePersonalidad = {
      fechaTrastornoLimitePersonalidad: trastornoLimitePersonalidad.fechaTrastornoLimitePersonalidad,
      relacionesCercanasDiscusionesRupturas: trastornoLimitePersonalidad.relacionesCercanasDiscusionesRupturas,
      autolesionIntentoSuicidio: trastornoLimitePersonalidad.autolesionIntentoSuicidio,
      impulsividadOtrosDosProblemas: trastornoLimitePersonalidad.impulsividadOtrosDosProblemas,
      extremadamenteMalHumor: trastornoLimitePersonalidad.extremadamenteMalHumor,
      enojadoFrecuenteActuaEnojadoSarcastico: trastornoLimitePersonalidad.enojadoFrecuenteActuaEnojadoSarcastico,
      desconfianzaOtrasPersonas: trastornoLimitePersonalidad.desconfianzaOtrasPersonas,
      sensacionIrrealidadEntornoIrreal: trastornoLimitePersonalidad.sensacionIrrealidadEntornoIrreal,
      vacioCronico: trastornoLimitePersonalidad.vacioCronico,
      faltaIdentidadQuienEs: trastornoLimitePersonalidad.faltaIdentidadQuienEs,
      esfuerzosEvitarAbandono: trastornoLimitePersonalidad.esfuerzosEvitarAbandono,
    };

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
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
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const enfermeraFirmante = await this.enfermerasFirmantesService.findOneByUserId(userId);
    const datosEnfermeraFirmante = enfermeraFirmante
    ? {
        nombre: enfermeraFirmante.nombre || "",
        sexo: enfermeraFirmante.sexo || "",
        tituloProfesional: enfermeraFirmante.tituloProfesional || "",
        numeroCedulaProfesional: enfermeraFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: enfermeraFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: enfermeraFirmante.numeroCredencialAdicional || "",
        firma: enfermeraFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const tecnicoFirmante = await this.tecnicosFirmantesService.findOneByUserId(userId);
    const datosTecnicoFirmante = tecnicoFirmante
    ? {
        nombre: tecnicoFirmante.nombre || "",
        sexo: tecnicoFirmante.sexo || "",
        tituloProfesional: tecnicoFirmante.tituloProfesional || "",
        numeroCedulaProfesional: tecnicoFirmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: tecnicoFirmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: tecnicoFirmante.numeroCredencialAdicional || "",
        firma: tecnicoFirmante.firma as { data: string; contentType: string } || null,
      }
    : {
        nombre: "",
        sexo: "",
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };

    const usuario = await this.usersService.findById(userId);
     const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 
    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
      };

    const fecha = convertirFechaADDMMAAAA(trastornoLimitePersonalidad.fechaTrastornoLimitePersonalidad)
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
    );

    await this.printer.createPdf(docDefinition, rutaCompleta);

    return rutaCompleta;
  }

  async getInformeDashboard(empresaId: string, trabajadorId: string, userId: string): Promise<Buffer> {
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
      antiguedad: trabajador.fechaIngreso ? calcularAntiguedad(
        convertirFechaAAAAAMMDD(trabajador.fechaIngreso),
      ) : '-',
      telefono: trabajador.telefono,
      estadoCivil: trabajador.estadoCivil,
      numeroEmpleado: trabajador.numeroEmpleado,
      nss: trabajador.nss,
      curp: trabajador.curp,
    };

    const medicoFirmante = await this.medicosFirmantesService.findOneByUserId(userId);
    const datosMedicoFirmante = medicoFirmante
    ? {
        nombre: medicoFirmante.nombre || "",
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
        tituloProfesional: "",
        numeroCedulaProfesional: "",
        especialistaSaludTrabajo: "",
        numeroCedulaEspecialista: "",
        nombreCredencialAdicional: "",
        numeroCredencialAdicional: "",
        firma: null,
      };
    const usuario = await this.usersService.findById(userId);
    const datosUsuario = {
      idProveedorSalud: usuario.idProveedorSalud,
    } 
    const proveedorSalud = await this.proveedoresSaludService.findOne(datosUsuario.idProveedorSalud);
    const datosProveedorSalud = proveedorSalud
    ? {
        nombre: proveedorSalud.nombre || "",
        pais: proveedorSalud.pais || "",
        perfilProveedorSalud: proveedorSalud.perfilProveedorSalud || "",
        logotipoEmpresa: proveedorSalud.logotipoEmpresa as { data: string; contentType: string } || null,
        estado: proveedorSalud.estado || "",
        municipio: proveedorSalud.municipio || "",
        codigoPostal: proveedorSalud.codigoPostal || "",
        direccion: proveedorSalud.direccion || "",
        telefono: proveedorSalud.telefono || "",
        correoElectronico: proveedorSalud.correoElectronico || "",
        sitioWeb: proveedorSalud.sitioWeb || "",
        colorInforme: proveedorSalud.colorInforme || "#343A40",
      }
    : {
        nombre: "",
        pais: "",
        perfilProveedorSalud: "",
        logotipoEmpresa: null,
        estado: "",
        municipio: "",
        codigoPostal: "",
        direccion: "",
        telefono: "",
        correoElectronico: "",
        sitioWeb: "",
        colorInforme: "#343A40",
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

