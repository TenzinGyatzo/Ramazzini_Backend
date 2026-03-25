import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateResultadoClinicoDto } from './create-resultado-clinico.dto';

export class UpdateResultadoClinicoDto extends PartialType(
  OmitType(CreateResultadoClinicoDto, ['tipoEstudio'] as const)
) {
  // tipoEstudio está explícitamente omitido para que no pueda ser modificado después de la creación
}
