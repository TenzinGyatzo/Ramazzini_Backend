import { PartialType } from '@nestjs/mapped-types';
import { CreateEventoSeguimientoCardiometabolicoDto } from './create-evento-seguimiento-cardiometabolico.dto';

export class UpdateEventoSeguimientoCardiometabolicoDto extends PartialType(
  CreateEventoSeguimientoCardiometabolicoDto,
) {}
