import { PartialType } from '@nestjs/mapped-types';
import { CreateInformeLongitudinalAudiometricoDto } from './create-informe-longitudinal-audiometrico.dto';

export class UpdateInformeLongitudinalAudiometricoDto extends PartialType(
  CreateInformeLongitudinalAudiometricoDto,
) {}
