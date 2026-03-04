import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GIISExportService } from './giis-export.service';
import { GiisBatchService } from './giis-batch.service';
import { GiisSerializerService } from './giis-serializer.service';
import { GiisExportController } from './giis-export.controller';
import { GiisValidationService } from './validation/giis-validation.service';
import { GiisCryptoService } from './crypto/giis-crypto.service';
import { DgisCifradoService } from './crypto/dgis-cifrado.service';
import { GiisExportAuditService } from './giis-export-audit.service';
import { GiisBatch, GiisBatchSchema } from './schemas/giis-batch.schema';
import {
  GiisExportAudit,
  GiisExportAuditSchema,
} from './schemas/giis-export-audit.schema';
import { Lesion, LesionSchema } from '../expedientes/schemas/lesion.schema';
import {
  NotaMedica,
  NotaMedicaSchema,
} from '../expedientes/schemas/nota-medica.schema';
import {
  Trabajador,
  TrabajadorSchema,
} from '../trabajadores/schemas/trabajador.schema';
import {
  ProveedorSalud,
  ProveedorSaludSchema,
} from '../proveedores-salud/schemas/proveedor-salud.schema';
import {
  CentroTrabajo,
  CentroTrabajoSchema,
} from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa, EmpresaSchema } from '../empresas/schemas/empresa.schema';
import { ProveedoresSaludModule } from '../proveedores-salud/proveedores-salud.module';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { FirmanteHelperModule } from '../expedientes/firmante-helper.module';

/**
 * GIIS Export Module
 *
 * Provides transformation services for converting internal Ramazzini documents
 * to GIIS pipe-delimited format for NOM-024 compliance.
 *
 * CAPABILITIES:
 * - Transform Lesion documents to GIIS-B013 format
 * - Filter by MX providers only
 * - Date range filtering
 *
 * LIMITATIONS (by design):
 * - Does NOT implement file creation
 * - Does NOT implement encryption (3DES)
 * - Does NOT implement compression
 * - Does NOT implement scheduling/delivery
 *
 * These features are deferred to a future phase when DGIS requirements are finalized.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GiisBatch.name, schema: GiisBatchSchema },
      { name: GiisExportAudit.name, schema: GiisExportAuditSchema },
      { name: Lesion.name, schema: LesionSchema },
      { name: NotaMedica.name, schema: NotaMedicaSchema },
      { name: Trabajador.name, schema: TrabajadorSchema },
      { name: ProveedorSalud.name, schema: ProveedorSaludSchema },
      { name: CentroTrabajo.name, schema: CentroTrabajoSchema },
      { name: Empresa.name, schema: EmpresaSchema },
    ]),
    forwardRef(() => ProveedoresSaludModule),
    forwardRef(() => UsersModule),
    AuditModule,
    FirmanteHelperModule,
  ],
  controllers: [GiisExportController],
  providers: [
    GIISExportService,
    GiisBatchService,
    GiisSerializerService,
    GiisValidationService,
    GiisCryptoService,
    DgisCifradoService,
    GiisExportAuditService,
  ],
  exports: [
    GIISExportService,
    GiisBatchService,
    GiisSerializerService,
    GiisValidationService,
    GiisCryptoService,
    DgisCifradoService,
    GiisExportAuditService,
  ],
})
export class GIISExportModule {}
