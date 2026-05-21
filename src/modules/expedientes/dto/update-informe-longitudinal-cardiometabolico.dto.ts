import { PartialType } from '@nestjs/mapped-types';
import { CreateInformeLongitudinalCardiometabolicoDto } from './create-informe-longitudinal-cardiometabolico.dto';

export class UpdateInformeLongitudinalCardiometabolicoDto extends PartialType(CreateInformeLongitudinalCardiometabolicoDto) {}
