import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ClinicalFilesService } from '../files/clinical-files.service';

const MAX_FILES_PER_MERGE = 50;

@Injectable()
export class DocumentMergerService {
  constructor(private readonly clinicalFilesService: ClinicalFilesService) {}

  async mergeFiles(userId: string, filePaths: string[]): Promise<Buffer> {
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      throw new BadRequestException('Se requiere al menos un archivo para fusionar');
    }

    if (filePaths.length > MAX_FILES_PER_MERGE) {
      throw new BadRequestException(
        `No se pueden fusionar más de ${MAX_FILES_PER_MERGE} archivos a la vez`,
      );
    }

    const resolvedPaths: string[] = [];
    for (const filePath of filePaths) {
      const absolutePath =
        await this.clinicalFilesService.assertClinicalFileAccessibleForUser(
          userId,
          filePath,
        );
      resolvedPaths.push(absolutePath);
    }

    try {
      const mergedPdf = await PDFDocument.create();

      const letterWidth = 612;
      const letterHeight = 792;

      for (const absolutePath of resolvedPaths) {
        const fileExt = path.extname(absolutePath).toLowerCase();
        const fileBytes = await fs.readFile(absolutePath);

        if (fileExt === '.pdf') {
          const pdf = await PDFDocument.load(fileBytes);
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          pages.forEach((page) => mergedPdf.addPage(page));
        } else if (['.jpg', '.jpeg', '.png'].includes(fileExt)) {
          const image =
            fileExt === '.png'
              ? await mergedPdf.embedPng(fileBytes)
              : await mergedPdf.embedJpg(fileBytes);

          const scale = Math.min(
            letterWidth / image.width,
            letterHeight / image.height,
          );
          const scaledWidth = image.width * scale;
          const scaledHeight = image.height * scale;

          const page = mergedPdf.addPage([letterWidth, letterHeight]);

          const x = (letterWidth - scaledWidth) / 2;
          const y = (letterHeight - scaledHeight) / 2;

          page.drawImage(image, {
            x,
            y,
            width: scaledWidth,
            height: scaledHeight,
          });
        } else {
          throw new BadRequestException('Tipo de archivo no soportado');
        }
      }

      return Buffer.from(await mergedPdf.save());
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('No se pudieron fusionar los archivos');
    }
  }
}
