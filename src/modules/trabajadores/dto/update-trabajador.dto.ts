import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateTrabajadorDto } from './create-trabajador.dto';

// Excluir folio e idTrabajadorCanonico: no modificables por el usuario (solo lectura)
export class UpdateTrabajadorDto extends PartialType(
  OmitType(CreateTrabajadorDto, ['folio', 'idTrabajadorCanonico'] as const),
) {}
