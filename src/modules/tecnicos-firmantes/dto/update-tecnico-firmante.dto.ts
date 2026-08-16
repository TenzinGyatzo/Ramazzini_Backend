import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateTecnicoFirmanteDto } from './create-tecnico-firmante.dto';

// Excluir folio: no modificable por el usuario (solo lectura)
export class UpdateTecnicoFirmanteDto extends PartialType(
  OmitType(CreateTecnicoFirmanteDto, ['folio'] as const),
) {}
