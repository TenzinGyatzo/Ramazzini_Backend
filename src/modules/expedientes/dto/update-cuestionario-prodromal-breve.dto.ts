import { PartialType } from '@nestjs/mapped-types';
import { CreateCuestionarioProdromalBreveDto } from './create-cuestionario-prodromal-breve.dto';

export class UpdateCuestionarioProdromalBreveDto extends PartialType(CreateCuestionarioProdromalBreveDto) {}
