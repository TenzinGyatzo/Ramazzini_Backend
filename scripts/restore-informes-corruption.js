#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '../src/modules/informes/informes.service.ts',
);
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix getInformeAntidoping corrupted tail (aptitud body was merged in)
const antidopingCorruptStart =
  '    const proveedorInforme =\n      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({\n        userId,\n        trabajadorId: String(trabajadorId),\n        includeSemaforizacion: true,\n      });\n    const datosProveedorSalud = proveedorInforme.datos;\n\n    // Formatear la fecha para el nombre del archivo\n    const fecha = convertirFechaADDMMAAAA(aptitud.fechaAptitudPuesto)';

const antidopingFixedTail = `    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;

    const fecha = convertirFechaADDMMAAAA(antidoping.fechaAntidoping)`;

if (!content.includes('aptitud.fechaAptitudPuesto')) {
  console.error('Antidoping corruption marker not found — already fixed?');
  process.exit(1);
}

const antidopingEndMarker =
  "      'antidoping',\n      antidopingId,\n    );\n\n    return rutaCompleta; // Retorna la ruta del archivo generado\n  }\n\n  async getInformeConstanciaAptitud(";

const aptitudTailStart = content.indexOf(antidopingCorruptStart);
const aptitudTailEnd = content.indexOf(antidopingEndMarker);
if (aptitudTailStart === -1 || aptitudTailEnd === -1) {
  console.error('Could not locate antidoping/aptitud boundary');
  process.exit(1);
}

const aptitudTailChunk = content.slice(
  aptitudTailStart,
  aptitudTailEnd + "      'antidoping',\n      antidopingId,\n    );\n\n    return rutaCompleta; // Retorna la ruta del archivo generado\n  }\n\n".length,
);

// Extract aptitud-specific body (from fecha aptitud through filasTamizaje)
const aptitudBodyMatch = aptitudTailChunk.match(
  /const fecha = convertirFechaADDMMAAAA\(aptitud\.fechaAptitudPuesto\)[\s\S]*filasTamizajePsicologia,\n    \);/,
);
if (!aptitudBodyMatch) {
  console.error('Could not extract aptitud body from corrupt chunk');
  process.exit(1);
}
const aptitudPdfTail = aptitudBodyMatch[0];

const antidopingReplacement = `${antidopingFixedTail}
      .replace(/\\//g, '-')
      .replace(/\\\\/g, '-');
    const nombreArchivo = \`Antidoping \${fecha}.pdf\`;

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
      edad: \`\${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años\`,
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
          resultadosClinicosList,
          'TIPO_SANGRE',
        )
      : null;
    const nearestEKG = includeResultadosClinicos
      ? this.findMostRecentResultadoClinicoByTipo(
          resultadosClinicosList,
          'EKG',
          referenceYear,
        )
      : null;
    const nearestEspirometria = includeResultadosClinicos
      ? this.findMostRecentResultadoClinicoByTipo(
          resultadosClinicosList,
          'ESPIROMETRIA',
          referenceYear,
        )
      : null;
    const nearestRayosX = includeResultadosClinicos
      ? this.findMostRecentResultadoClinicoByTipo(
          resultadosClinicosList,
          'RAYOS_X',
          referenceYear,
        )
      : null;
    const nearestAnalisisLaboratorio = includeResultadosClinicos
      ? this.findMostRecentResultadoClinicoByTipo(
          resultadosClinicosList,
          'ANALISIS_LABORATORIO',
          referenceYear,
        )
      : null;

    const datosResultadoClinicoTipoSangre = nearestTipoSangre
      ? {
          fechaEstudio: nearestTipoSangre.fechaEstudio,
          tipoSangre: nearestTipoSangre.tipoSangre,
        }
      : null;
    const datosResultadoClinicoEKG = nearestEKG
      ? {
          fechaEstudio: nearestEKG.fechaEstudio,
          resultadoGlobal: nearestEKG.resultadoGlobal,
          hallazgoEspecifico: nearestEKG.hallazgoEspecifico,
          tipoAlteracionEKG: nearestEKG.tipoAlteracionEKG,
        }
      : null;
    const datosResultadoClinicoEspirometria = nearestEspirometria
      ? {
          fechaEstudio: nearestEspirometria.fechaEstudio,
          resultadoGlobal: nearestEspirometria.resultadoGlobal,
          hallazgoEspecifico: nearestEspirometria.hallazgoEspecifico,
          tipoAlteracionEspirometria: nearestEspirometria.tipoAlteracionEspirometria,
        }
      : null;
    const datosResultadoClinicoRayosX = nearestRayosX
      ? {
          fechaEstudio: nearestRayosX.fechaEstudio,
          resultadoGlobal: nearestRayosX.resultadoGlobal,
          hallazgoEspecifico: nearestRayosX.hallazgoEspecifico,
          tipoAlteracionRayosX: nearestRayosX.tipoAlteracionRayosX,
        }
      : null;
    const datosResultadoClinicoAnalisisLaboratorio = nearestAnalisisLaboratorio
      ? {
          fechaEstudio: nearestAnalisisLaboratorio.fechaEstudio,
          resultadoGlobal: nearestAnalisisLaboratorio.resultadoGlobal,
          hallazgoEspecifico: nearestAnalisisLaboratorio.hallazgoEspecifico,
          tipoAlteracionAnalisisLaboratorio:
            nearestAnalisisLaboratorio.tipoAlteracionAnalisisLaboratorio,
        }
      : null;

    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
        includeSemaforizacion: true,
      });
    const datosProveedorSalud = proveedorInforme.datos;

    ${aptitudPdfTail.replace(/aptitudPuestoInforme\([\s\S]*$/, '').trim()}

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
      datosProveedorSalud,
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

  async getInformeConstanciaAptitud(`;

content =
  content.slice(0, aptitudTailStart) +
  antidopingReplacement +
  content.slice(aptitudTailEnd + antidopingEndMarker.length - 'async getInformeConstanciaAptitud('.length);

// 2. Fix getInformeCertificado wrong ending (examenVista instead of certificado)
content = content.replace(
  `    const fecha = convertirFechaADDMMAAAA(examenVista.fechaExamenVista)
      .replace(/\\//g, '-')
      .replace(/\\\\/g, '-');
    const nombreArchivo = \`Examen Vista \${fecha}.pdf\`;

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
    await this.recordDelegatedPdfRegenerationIfNeeded(
      proveedorInforme,
      userId,
      'certificado',
      certificadoId,
    );

    return rutaCompleta;
  }

  async getInformeExploracionFisica(`,
  `    const fecha = convertirFechaADDMMAAAA(certificado.fechaCertificado)
      .replace(/\\//g, '-')
      .replace(/\\\\/g, '-');
    const nombreArchivo = \`Certificado \${fecha}.pdf\`;

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
      edad: \`\${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años\`,
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
      .replace(/\\//g, '-')
      .replace(/\\\\/g, '-');
    const nombreArchivo = \`Certificado Expedito \${fecha}.pdf\`;

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
      edad: \`\${calcularEdad(convertirFechaAAAAAMMDD(trabajador.fechaNacimiento))} años\`,
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
      .replace(/\\//g, '-')
      .replace(/\\\\/g, '-');
    const nombreArchivo = \`Examen Vista \${fecha}.pdf\`;

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

  async getInformeExploracionFisica(`,
);

// 3. Add helper method before getInformeAntidoping if missing
if (!content.includes('findMostRecentResultadoClinicoByTipo')) {
  content = content.replace(
    '  async getInformeAntidoping(',
    `  private findMostRecentResultadoClinicoByTipo(
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

  async getInformeAntidoping(`,
  );
}

fs.writeFileSync(filePath, content);
console.log('Restored informes.service.ts corruption fixes');
