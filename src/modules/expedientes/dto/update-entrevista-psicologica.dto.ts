import { PartialType } from '@nestjs/mapped-types';
import { CreateEntrevistaPsicologicaDto } from './create-entrevista-psicologica.dto';

export class UpdateEntrevistaPsicologicaDto extends PartialType(CreateEntrevistaPsicologicaDto) {}
