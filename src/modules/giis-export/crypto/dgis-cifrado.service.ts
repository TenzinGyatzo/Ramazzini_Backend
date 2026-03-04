/**
 * GIIS: Cifrado mediante módulo oficial DGIS (cifrado.jar).
 * Compatible con SINBA 2.0. Ver Manual de Usuario de Cifrado DGIS (GOBI).
 *
 * Requiere: DGIS_CIFRADO_DIR con estructura:
 *   - {dir}/cifrado.jar
 *   - {dir}/keystore/transferencia.jks
 *   - Los .txt a cifrar se copian temporalmente en {dir}
 */

import { Injectable } from '@nestjs/common';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as iconv from 'iconv-lite';

@Injectable()
export class DgisCifradoService {
  private dgisDir: string | null = null;
  private mutex: Promise<void> = Promise.resolve();

  constructor() {
    const dir = process.env.DGIS_CIFRADO_DIR?.trim();
    if (dir && fs.existsSync(dir)) {
      const jarPath = path.join(dir, 'cifrado.jar');
      const keystorePath = path.join(dir, 'keystore', 'transferencia.jks');
      if (fs.existsSync(jarPath) && fs.existsSync(keystorePath)) {
        this.dgisDir = path.resolve(dir);
      }
    }
  }

  /**
   * Indica si el módulo DGIS está configurado y disponible.
   */
  isAvailable(): boolean {
    return this.dgisDir !== null;
  }

  /**
   * Cifra un archivo TXT usando cifrado.jar de DGIS.
   * Devuelve el contenido del archivo .CIF generado.
   *
   * @param txtFullPath - Ruta absoluta al archivo .txt
   * @param baseName - Nombre base sin extensión (ej. CEX-DFSSA-1611)
   * @returns Buffer con el contenido del .CIF
   */
  async encryptTxtToCif(
    txtFullPath: string,
    baseName: string,
  ): Promise<Buffer> {
    if (!this.dgisDir) {
      throw new Error(
        'DGIS_CIFRADO_DIR no configurado o no contiene cifrado.jar y keystore/transferencia.jks. Ver docs/nom-024/giis_encryption_spec.md.',
      );
    }

    const txtFileName = `${baseName}.txt`;
    const dgisTxtPath = path.join(this.dgisDir, txtFileName);
    const dgisCifPathUpper = path.join(this.dgisDir, `${baseName}.CIF`);
    const dgisCifPathLower = path.join(this.dgisDir, `${baseName}.cif`);

    const run = async (): Promise<Buffer> => {
      try {
        // El TXT se genera en UTF-8; cifrado.jar espera Windows-1252 (según especificación DGIS).
        const txtUtf8 = fs.readFileSync(txtFullPath, 'utf-8');
        const txtWin1252 = iconv.encode(txtUtf8, 'win1252');
        fs.writeFileSync(dgisTxtPath, txtWin1252);
      } catch (err) {
        throw new Error(
          `No se pudo preparar TXT para DGIS: ${(err as Error).message}`,
        );
      }

      // cifrado.jar espera 3 argumentos: archivo_entrada, directorio_keystore, (vacío).
      // El directorio se concatena con "transferencia.jks" para el keystore.
      // Salida: {nombre_base}.txt.cif en el directorio de trabajo.
      const dgisCifPathTxtCif = path.join(this.dgisDir, `${baseName}.txt.cif`);
      const result = spawnSync('java', [
        '-jar',
        'cifrado.jar',
        txtFileName,
        'keystore/',
        '',
      ], {
        cwd: this.dgisDir!,
        encoding: 'utf-8',
        timeout: 60000,
        windowsHide: true,
      });

      const stdout = (result.stdout ?? '').trim();
      const stderr = (result.stderr ?? '').trim();
      const exitCode = result.status ?? -1;

      if (exitCode !== 0) {
        throw new Error(
          `cifrado.jar falló (exit ${exitCode}). stdout: ${stdout || '(vacío)'}. stderr: ${stderr || '(vacío)'}. Verifique Java y estructura DGIS.`,
        );
      }

      const cifPath = fs.existsSync(dgisCifPathTxtCif)
        ? dgisCifPathTxtCif
        : fs.existsSync(dgisCifPathUpper)
          ? dgisCifPathUpper
          : fs.existsSync(dgisCifPathLower)
            ? dgisCifPathLower
            : null;
      if (!cifPath) {
        const diag = [stdout, stderr].filter(Boolean).join(' | ') || '(sin salida)';
        throw new Error(
          `cifrado.jar no generó archivo .CIF. Salida del JAR: ${diag}. Verifique formato y encoding del TXT (Windows-1252).`,
        );
      }

      const cifBuffer = fs.readFileSync(cifPath);

      try {
        fs.unlinkSync(dgisTxtPath);
        fs.unlinkSync(cifPath);
      } catch {
        // No crítico; limpieza opcional
      }

      return cifBuffer;
    };

    return new Promise((resolve, reject) => {
      this.mutex = this.mutex
        .then(() => run())
        .then(resolve)
        .catch(reject);
    });
  }
}
