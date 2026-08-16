import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateMedicoFirmanteDto } from './create-medico-firmante.dto';

// Excluir folio: no modificable por el usuario (solo lectura)
export class UpdateMedicoFirmanteDto extends PartialType(
  OmitType(CreateMedicoFirmanteDto, ['folio'] as const),
) {}
