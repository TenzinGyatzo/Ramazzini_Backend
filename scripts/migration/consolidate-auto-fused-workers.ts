#!/usr/bin/env npx ts-node
/**
 * One-shot migration: consolidate workers with idTrabajadorCanonico (legacy auto-fusion)
 * into physical merge (documents under canonical, duplicate deleted).
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/migration/consolidate-auto-fused-workers.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register scripts/migration/consolidate-auto-fused-workers.ts
 */

import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../../src/app.module';
import { TrabajadoresService } from '../../src/modules/trabajadores/trabajadores.service';
import { WorkerFusionService } from '../../src/modules/trabajadores/worker-fusion.service';
import { Trabajador } from '../../src/modules/trabajadores/schemas/trabajador.schema';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const trabajadorModel = app.get<Model<Trabajador>>(getModelToken(Trabajador.name));
  const trabajadoresService = app.get(TrabajadoresService);
  const workerFusionService = app.get(WorkerFusionService);

  const duplicates = await trabajadorModel
    .find({ idTrabajadorCanonico: { $exists: true, $ne: null } })
    .select('_id idTrabajadorCanonico idCentroTrabajo numeroEmpleado')
    .lean()
    .exec();

  const report: string[] = [
    'fuenteId,destinoId,estado,detalle',
  ];

  console.log(`Found ${duplicates.length} workers with idTrabajadorCanonico`);

  for (const dup of duplicates) {
    const fuenteId = (dup as any)._id.toString();
    const destinoId = (dup as any).idTrabajadorCanonico.toString();
    const centroId = (dup as any).idCentroTrabajo?.toString();

    if (!centroId) {
      report.push(`${fuenteId},${destinoId},SKIP,sin idCentroTrabajo`);
      continue;
    }

    const idEmpresa = await workerFusionService.getIdEmpresaFromCentro(centroId);
    if (!idEmpresa) {
      report.push(`${fuenteId},${destinoId},SKIP,sin idEmpresa`);
      continue;
    }

    if (dryRun) {
      report.push(`${fuenteId},${destinoId},DRY_RUN,pendiente`);
      continue;
    }

    try {
      const preview = await workerFusionService.getFusionPreview(destinoId, fuenteId);
      const payload: Parameters<TrabajadoresService['fusionarTrabajadores']>[0] = {
        trabajadorDestinoId: destinoId,
        trabajadorFuenteId: fuenteId,
        userId: 'system',
        idEmpresa,
        confirmacion: true,
        legacyAutoFusion: true,
      };

      if (preview.conflictos.numeroEmpleado) {
        payload.numeroEmpleadoResuelto =
          preview.destino.numeroEmpleado?.trim() ||
          preview.fuente.numeroEmpleado?.trim() ||
          undefined;
      }

      const result = await trabajadoresService.fusionarTrabajadores(payload);
      const migrated = Object.values(result.documentosMigradosPorColeccion ?? {}).reduce(
        (a, b) => a + b,
        0,
      );
      report.push(`${fuenteId},${destinoId},OK,docs=${migrated}`);
      console.log(`Merged ${fuenteId} -> ${destinoId} (${migrated} docs migrated)`);
    } catch (err: any) {
      const msg = (err?.message ?? String(err)).replace(/,/g, ';');
      report.push(`${fuenteId},${destinoId},ERROR,${msg}`);
      console.error(`Failed ${fuenteId} -> ${destinoId}:`, err?.message ?? err);
    }
  }

  const outPath = path.join(
    __dirname,
    `consolidate-auto-fused-report-${Date.now()}.csv`,
  );
  fs.writeFileSync(outPath, report.join('\n'), 'utf8');
  console.log(`Report written: ${outPath}`);

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
