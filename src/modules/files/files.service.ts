import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';

export type DeleteFileResult = 'deleted' | 'missing';

@Injectable()
export class FilesService {
  /**
   * Elimina un archivo de forma idempotente: si no existe (ENOENT),
   * se considera éxito (`missing`). Otros errores de FS se propagan.
   */
  async deleteFile(filePath: string): Promise<DeleteFileResult> {
    try {
      await fs.unlink(filePath);
      return 'deleted';
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return 'missing';
      }
      throw new Error(`No se pudo eliminar el archivo: ${filePath}`);
    }
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const fsSync = require('fs').promises;
    await fsSync.rename(oldPath, newPath);
  }
}
