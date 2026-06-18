import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User } from './entities/user.entity';
import { UserSchema } from './schemas/user.schema';
import { EmailsModule } from '../emails/emails.module';
import { ProveedorSaludSchema } from '../proveedores-salud/schemas/proveedor-salud.schema';
// Importar esquemas de expedientes
import { HistoriaClinicaSchema } from '../expedientes/schemas/historia-clinica.schema';
import { AptitudPuestoSchema } from '../expedientes/schemas/aptitud-puesto.schema';
import { ExploracionFisicaSchema } from '../expedientes/schemas/exploracion-fisica.schema';
import { ExamenVistaSchema } from '../expedientes/schemas/examen-vista.schema';
import { AudiometriaSchema } from '../expedientes/schemas/audiometria.schema';
import { AntidopingSchema } from '../expedientes/schemas/antidoping.schema';
import { NotaMedicaSchema } from '../expedientes/schemas/nota-medica.schema';
import { DocumentoExternoSchema } from '../expedientes/schemas/documento-externo.schema';
import { CentrosTrabajoModule } from '../centros-trabajo/centros-trabajo.module';
import { RefreshSession, RefreshSessionSchema } from './schemas/refresh-session.schema';
import { RefreshTokenService } from './refresh-token.service';
import { DeletionAuthModule } from 'src/utils/deletion-auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: 'ProveedorSalud', schema: ProveedorSaludSchema },
      { name: 'HistoriaClinica', schema: HistoriaClinicaSchema },
      { name: 'AptitudPuesto', schema: AptitudPuestoSchema },
      { name: 'ExploracionFisica', schema: ExploracionFisicaSchema },
      { name: 'ExamenVista', schema: ExamenVistaSchema },
      { name: 'Audiometria', schema: AudiometriaSchema },
      { name: 'Antidoping', schema: AntidopingSchema },
      { name: 'NotaMedica', schema: NotaMedicaSchema },
      { name: 'DocumentoExterno', schema: DocumentoExternoSchema },
      { name: RefreshSession.name, schema: RefreshSessionSchema },
    ]),
    EmailsModule,  // Importa el módulo que exporta el EmailsService
    forwardRef(() => CentrosTrabajoModule),
    DeletionAuthModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, RefreshTokenService],
  exports: [UsersService, RefreshTokenService],
})
export class UsersModule {}
