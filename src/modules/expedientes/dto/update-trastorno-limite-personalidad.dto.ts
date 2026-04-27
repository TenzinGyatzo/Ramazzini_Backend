import { PartialType } from '@nestjs/mapped-types';
import { CreateTrastornoLimitePersonalidadDto } from './create-trastorno-limite-personalidad.dto';

export class UpdateTrastornoLimitePersonalidadDto extends PartialType(CreateTrastornoLimitePersonalidadDto) {}
