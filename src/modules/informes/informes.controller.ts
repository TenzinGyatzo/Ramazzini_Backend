import { Controller, Get, Post, Param, Query, Body, Res } from '@nestjs/common';
import { InformesService } from './informes.service';
import { Response } from 'express';

@Controller('informes')
export class InformesController {
  constructor(private readonly informesService: InformesService) {}

  @Get('antidoping/:empresaId/:trabajadorId/:antidopingId/:userId')
  async getInformeAntidoping(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('antidopingId') antidopingId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
  
    try {
      const rutaPDF = await this.informesService.getInformeAntidoping(empresaId, trabajadorId, antidopingId, userId);
      return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
    } catch (error) {
      console.error('[getInformeAntidoping] Error al generar el informe antidoping:', error);
      return res.status(500).json({ message: 'Error al generar el informe antidoping', error });
    }
  }
  
  @Get('aptitud/:empresaId/:trabajadorId/:aptitudId/:userId')
  async getInformeAptitudPuesto(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('aptitudId') aptitudId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
    @Query('includeResultadosClinicos') includeResultadosClinicos?: string,
  ) {
    const rutaPDF = await this.informesService.getInformeAptitudPuesto(
      empresaId,
      trabajadorId,
      aptitudId,
      userId,
      includeResultadosClinicos !== 'false',
    );
    return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
  }

  @Get('audiometria/:empresaId/:trabajadorId/:audiometriaId/:userId')
  async getInformeAudiometria(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('audiometriaId') audiometriaId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
    @Query('grafica') graficaAudiometria?: string,
  ) {
    const rutaPDF = await this.informesService.getInformeAudiometria(empresaId, trabajadorId, audiometriaId, userId, graficaAudiometria);
    return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
  }

  @Post('audiometria/:empresaId/:trabajadorId/:audiometriaId/:userId')
  async getInformeAudiometriaWithGraph(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('audiometriaId') audiometriaId: string,
    @Param('userId') userId: string,
    @Body() body: { grafica?: string },
    @Res() res: Response,
  ) {    
    const rutaPDF = await this.informesService.getInformeAudiometria(empresaId, trabajadorId, audiometriaId, userId, body.grafica);
    return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
  }

  @Get('certificado/:empresaId/:trabajadorId/:certificadoId/:userId')
  async getInformeCertificado(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('certificadoId') certificadoId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const rutaPDF = await this.informesService.getInformeCertificado(empresaId, trabajadorId, certificadoId, userId);
    return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
  }

  @Get('certificadoExpedito/:empresaId/:trabajadorId/:certificadoExpeditoId/:userId')
  async getInformeCertificadoExpedito(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('certificadoExpeditoId') certificadoExpeditoId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const rutaPDF = await this.informesService.getInformeCertificadoExpedito(empresaId, trabajadorId, certificadoExpeditoId, userId);
    return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
  }

  @Get('examenVista/:empresaId/:trabajadorId/:examenVistaId/:userId')
  async getInformeExamenVista(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('examenVistaId') examenVistaId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const rutaPDF = await this.informesService.getInformeExamenVista(empresaId, trabajadorId, examenVistaId, userId);
    return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
  }

  @Get('exploracionFisica/:empresaId/:trabajadorId/:exploracionFisicaId/:userId')
  async getInformeExploracionFisica(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('exploracionFisicaId') exploracionFisicaId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const rutaPDF = await this.informesService.getInformeExploracionFisica(empresaId, trabajadorId, exploracionFisicaId, userId);
    return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
  }

  @Get('historiaClinica/:empresaId/:trabajadorId/:historiaClinicaId/:userId')
  async getInformeHistoriaClinica(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('historiaClinicaId') historiaClinicaId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const rutaPDF = await this.informesService.getInformeHistoriaClinica(empresaId, trabajadorId, historiaClinicaId, userId);
    return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
  }

  @Get('notaMedica/:empresaId/:trabajadorId/:notaMedicaId/:userId')
  async getInformeNotaMedica(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('notaMedicaId') notaMedicaId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
  
    try {
      const rutaPDF = await this.informesService.getInformeNotaMedica(empresaId, trabajadorId, notaMedicaId, userId);
      return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
    } catch (error) {
      console.error('[getInformeNotaMedica] Error al generar el informe nota médica:', error);
      throw error;
    }
  }

  // Cuestionarios
    
  @Get('constanciaAptitud/:empresaId/:trabajadorId/:constanciaAptitudId/:userId')
  async getInformeConstanciaAptitud(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('constanciaAptitudId') constanciaAptitudId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const rutaPDF = await this.informesService.getInformeConstanciaAptitud(empresaId, trabajadorId, constanciaAptitudId, userId);
    return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
  }

  @Get('controlPrenatal/:empresaId/:trabajadorId/:controlPrenatalId/:userId')
  async getInformeControlPrenatal(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('controlPrenatalId') controlPrenatalId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
  
    try {
      const rutaPDF = await this.informesService.getInformeControlPrenatal(empresaId, trabajadorId, controlPrenatalId, userId);
      return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
    } catch (error) {
      console.error('[getInformeControlPrenatal] Error al generar el informe control prenatal:', error);
      throw error;
    }
  }

  @Get('historiaOtologica/:empresaId/:trabajadorId/:historiaOtologicaId/:userId')
  async getInformeHistoriaOtologica(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('historiaOtologicaId') historiaOtologicaId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
  
    try {
      const rutaPDF = await this.informesService.getInformeHistoriaOtologica(empresaId, trabajadorId, historiaOtologicaId, userId);
      return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
    } catch (error) {
      console.error('[getInformeHistoriaOtologica] Error al generar el informe historia otologica:', error);
      throw error;
    }
  }

  @Get('previoEspirometria/:empresaId/:trabajadorId/:previoEspirometriaId/:userId')
  async getInformePrevioEspirometria(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('previoEspirometriaId') previoEspirometriaId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
  
    try {
      const rutaPDF = await this.informesService.getInformePrevioEspirometria(empresaId, trabajadorId, previoEspirometriaId, userId);
      return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
    } catch (error) {
      console.error('[getInformePrevioEspirometria] Error al generar el informe previo espirometria:', error);
      throw error;
    }
  }

  @Get('dashboard/ver/:empresaId/:trabajadorId/:userId')
  async getInformeDashboard(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.informesService.getInformeDashboard(
        empresaId,
        trabajadorId,
        userId,
      );
  
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="NotaMedica.pdf"',
        'Content-Length': buffer.length,
      });
  
      res.end(buffer);
    } catch (error) {
      console.error('[getInformeDashboard] Error al generar el informe del dashboard:', error);
      res.status(500).json({ message: 'Error al generar el PDF' });
    }
  }

  @Get('dashboard/descargar/:empresaId/:trabajadorId/:userId')
  async descargarInformeDashboard(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.informesService.getInformeDashboard(empresaId, trabajadorId, userId);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="NotaMedica.pdf"',
        'Content-Length': buffer.length,
      });

      res.end(buffer);
    } catch (error) {
      console.error('[descargarInformeDashboard] Error al generar el PDF:', error);
      res.status(500).json({ message: 'Error al generar el informe' });
    }
  }

  @Get('receta/:empresaId/:trabajadorId/:recetaId/:userId')
  async getInformeReceta(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('recetaId') recetaId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
  
    try {
      const rutaPDF = await this.informesService.getInformeReceta(empresaId, trabajadorId, recetaId, userId);
      return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
    } catch (error) {
      console.error('[getInformeReceta] Error al generar el informe receta:', error);
      throw error;
    }
  }

  // Cuestionarios psicologicos
  @Get('entrevistaPsicologica/:empresaId/:trabajadorId/:entrevistaPsicologicaId/:userId')
  async getInformeEntrevistaPsicologica(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('entrevistaPsicologicaId') entrevistaPsicologicaId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const rutaPDF = await this.informesService.getInformeEntrevistaPsicologica(empresaId, trabajadorId, entrevistaPsicologicaId, userId);
    return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
  }

  @Get('trastornosEstadoAnimo/:empresaId/:trabajadorId/:trastornosEstadoAnimoId/:userId')
  async getInformeTrastornosEstadoAnimo(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('trastornosEstadoAnimoId') trastornosEstadoAnimoId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const rutaPDF = await this.informesService.getInformeTrastornosEstadoAnimo(empresaId, trabajadorId, trastornosEstadoAnimoId, userId);
    return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
  }

  @Get('cuestionarioProdromalBreve/:empresaId/:trabajadorId/:cuestionarioProdromalBreveId/:userId')
  async getInformeCuestionarioProdromalBreve(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('cuestionarioProdromalBreveId') cuestionarioProdromalBreveId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const rutaPDF = await this.informesService.getInformeCuestionarioProdromalBreve(empresaId, trabajadorId, cuestionarioProdromalBreveId, userId);
    return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
  }

  @Get('trastornoLimitePersonalidad/:empresaId/:trabajadorId/:trastornoLimitePersonalidadId/:userId')
  async getInformeTrastornoLimitePersonalidad(
    @Param('empresaId') empresaId: string,
    @Param('trabajadorId') trabajadorId: string,
    @Param('trastornoLimitePersonalidadId') trastornoLimitePersonalidadId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const rutaPDF = await this.informesService.getInformeTrastornoLimitePersonalidad(empresaId, trabajadorId, trastornoLimitePersonalidadId, userId);
    return res.status(200).json({ message: 'PDF generado exitosamente', ruta: rutaPDF });
  }
}
