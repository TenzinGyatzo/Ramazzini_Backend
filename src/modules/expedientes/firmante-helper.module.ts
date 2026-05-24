import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FirmanteHelper } from './helpers/firmante-helper';
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
import { CatalogsModule } from '../catalogs/catalogs.module';

/**
 * Provides FirmanteHelper for resolving user -> firmante (medico/enfermera) data.
 * Used by GIIS export (CEX) to fill prestador fields from the note's firmante.
 */
@Module({
  imports: [
    CatalogsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: MedicoFirmante.name, schema: MedicoFirmanteSchema },
      { name: EnfermeraFirmante.name, schema: EnfermeraFirmanteSchema },
      { name: TecnicoFirmante.name, schema: TecnicoFirmanteSchema },
    ]),
  ],
  providers: [FirmanteHelper],
  exports: [FirmanteHelper],
})
export class FirmanteHelperModule {}
