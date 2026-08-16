import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateEnfermeraFirmanteDto } from './create-enfermera-firmante.dto';

// Excluir folio: no modificable por el usuario (solo lectura)
export class UpdateEnfermeraFirmanteDto extends PartialType(
  OmitType(CreateEnfermeraFirmanteDto, ['folio'] as const),
) {}
