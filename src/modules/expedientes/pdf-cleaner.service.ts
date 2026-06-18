// src/modules/expedientes/pdf-cleaner.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { mt } from 'date-fns/locale';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EXPEDIENTES_DIR } from 'src/utils/expedientes-dir';

@Injectable()
export class PdfCleanerService {
  private readonly logger = new Logger(PdfCleanerService.name);

  private readonly basePath = EXPEDIENTES_DIR;

  // Tipos válidos de informes generados por Ramazzini
  private readonly tiposValidos = [
    'Antidoping',
    'Aptitud',
    'Audiometria',
    'Certificado Expedito',
    'Certificado',
    'Examen Vista',
    'Historia Clinica',
    'Exploracion Fisica',
    'Control Prenatal',
    'Nota Medica',
    'Constancia Aptitud',
    'Historia Otologica',
    'Previo Espirometria',
    'Receta',
    'Entrevista Psicologica',
    'Trastorno Limite Personalidad',
    'Cuestionario Prodromal Breve',
    'Trastornos Estado Animo',
    'Evento Seguimiento Cardiometabolico',
    'Informe Longitudinal Cardiometabolico',
  ];

  @Cron('0 3 * * *') // Modo prueba (cambiar a 0 3 * * * para producción)
  async handleCron() {
    this.logger.log('🔍 Buscando PDFs antiguos...');
    const archivosAntiguos = await this.buscarPDFsAntiguos(this.basePath);
    this.logger.log(`📂 Explorando: ${this.basePath}`);

    this.logger.log(`🔎 Candidatos encontrados: ${archivosAntiguos.length}`);
    for (const archivo of archivosAntiguos) {
      const { fullPath, sizeMB, createdAt } = archivo;
      this.logger.log(
        `🗂 ${fullPath} — ${sizeMB.toFixed(2)} MB — Creado: ${createdAt.toLocaleDateString()}`,
      );
    }
    if (!this.modoPrueba && archivosAntiguos.length > 0) {
      await this.eliminarYLoggearArchivos(archivosAntiguos);
    }
  }

  private readonly modoPrueba = false; // Cambia a true para pruebas locales

  private async buscarPDFsAntiguos(
    dir: string,
  ): Promise<{ fullPath: string; sizeMB: number; createdAt: Date }[]> {
    let resultados: { fullPath: string; sizeMB: number; createdAt: Date }[] =
      [];

    try {
      const elementos = await fs.readdir(dir, { withFileTypes: true });

      for (const el of elementos) {
        const fullPath = path.join(dir, el.name);
        // this.logger.log(`📄 Revisando archivo: ${el.name}`);

        if (el.isDirectory()) {
          const subresultados = await this.buscarPDFsAntiguos(fullPath);
          resultados = resultados.concat(subresultados);
        } else if (
          el.isFile() &&
          el.name.endsWith('.pdf') &&
          this.esInformeGeneradoPorRamazzini(el.name)
        ) {
          const stat = await fs.stat(fullPath);
          const createdAt = stat.mtime;
          // this.logger.log(`🕒 ${el.name} => mtime: ${createdAt.toLocaleString()}`);

          if (this.modoPrueba) {
            const edadEnDias = this.calcularDiasDesde(createdAt);
            // this.logger.log(`📅 ${el.name} => edad en días: ${edadEnDias.toFixed(1)}`);

            if (edadEnDias >= 0) {
              resultados.push({
                fullPath,
                sizeMB: stat.size / (1024 * 1024),
                createdAt,
              });
            }
          } else {
            const edadEnDias = this.calcularDiasDesde(createdAt);
            // this.logger.log(`📅 ${el.name} => edad en días: ${edadEnDias.toFixed(1)}`);

            if (edadEnDias >= 30) {
              // 30 días = aproximadamente 1 mes
              resultados.push({
                fullPath,
                sizeMB: stat.size / (1024 * 1024),
                createdAt,
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error recorriendo ${dir}: ${error.message}`);
    }

    return resultados;
  }

  private esInformeGeneradoPorRamazzini(nombre: string): boolean {
    return (
      this.tiposValidos.some((tipo) => nombre.startsWith(tipo + ' ')) &&
      /^.+ \d{2}-\d{2}-\d{4}\.pdf$/.test(nombre)
    );
  }

  private calcularDiasDesde(fecha: Date): number {
    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    return diffMs / (1000 * 60 * 60 * 24); // convertir de ms a días
  }

  private async eliminarYLoggearArchivos(
    archivos: { fullPath: string; sizeMB: number; createdAt: Date }[],
  ): Promise<void> {
    const logLines: string[] = [];
    let totalEliminados = 0;
    let espacioLiberadoMB = 0;

    for (const archivo of archivos) {
      try {
        await fs.unlink(archivo.fullPath);
        totalEliminados++;
        espacioLiberadoMB += archivo.sizeMB;

        const relativePath = path.relative(this.basePath, archivo.fullPath);
        const partes = relativePath.split(path.sep); // divide por '\', '/' según OS
        const lineaLog = `${partes.join(' | ')} — ${archivo.sizeMB.toFixed(2)} MB`;
        logLines.push(lineaLog);
        // this.logger.log(`🗑️  ${lineaLog}`);
      } catch (err) {
        this.logger.error(
          `❌ No se pudo eliminar ${archivo.fullPath}: ${err.message}`,
        );
      }
    }

    const resumen = `Eliminados: ${totalEliminados} archivos — ${espacioLiberadoMB.toFixed(2)} MB liberados`;
    logLines.push('');
    logLines.push(resumen);
    this.logger.log(`🧹 ${resumen}`);

    // Guardar en archivo local
    const logPath = path.resolve(
      'logs',
      `eliminados-${this.formatearFechaHoy()}.log`,
    );
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.writeFile(logPath, logLines.join('\n'), { flag: 'a' });
  }

  private formatearFechaHoy(): string {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    return `${dia}-${mes}-${anio}`;
  }
}
