import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FilesService } from './files.service';
import { ClinicalFilesService } from './clinical-files.service';
import { ClinicalFilesController } from './clinical-files.controller';
import { BrandingAssetsService } from './branding-assets.service';
import { BrandingAssetsController } from './branding-assets.controller';
import { OrganizationalAccessModule } from 'src/utils/organizational-access.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  MedicoFirmante,
  MedicoFirmanteSchema,
} from '../medicos-firmantes/schemas/medico-firmante.schema';
import {
  EnfermeraFirmante,
  EnfermeraFirmanteSchema,
} from '../enfermeras-firmantes/schemas/enfermera-firmante.schema';
import {
  TecnicoFirmante,
  TecnicoFirmanteSchema,
} from '../tecnicos-firmantes/schemas/tecnico-firmante.schema';
import {
  ProveedorSalud,
  ProveedorSaludSchema,
} from '../proveedores-salud/schemas/proveedor-salud.schema';

@Module({
  imports: [
    OrganizationalAccessModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: MedicoFirmante.name, schema: MedicoFirmanteSchema },
      { name: EnfermeraFirmante.name, schema: EnfermeraFirmanteSchema },
      { name: TecnicoFirmante.name, schema: TecnicoFirmanteSchema },
      { name: ProveedorSalud.name, schema: ProveedorSaludSchema },
    ]),
  ],
  controllers: [ClinicalFilesController, BrandingAssetsController],
  providers: [FilesService, ClinicalFilesService, BrandingAssetsService],
  exports: [FilesService, ClinicalFilesService, BrandingAssetsService],
})
export class FilesModule {}
