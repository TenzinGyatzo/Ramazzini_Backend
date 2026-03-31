import { PartialType } from '@nestjs/mapped-types';
import { CreateTrastornosEstadoAnimoDto } from './create-trastornos-estado-animo.dto';

export class UpdateTrastornosEstadoAnimoDto extends PartialType(CreateTrastornosEstadoAnimoDto) {}
