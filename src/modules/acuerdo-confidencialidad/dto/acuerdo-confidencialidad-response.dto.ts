import { ApiProperty } from '@nestjs/swagger';

export class AcuerdoConfidencialidadStatusResponseDto {
  @ApiProperty()
  required: boolean;

  @ApiProperty()
  accepted: boolean;

  @ApiProperty({ required: false })
  currentVersion?: string;

  @ApiProperty({ required: false })
  agreementText?: string;

  @ApiProperty({ required: false })
  footerConsent?: string;
}

export class AcuerdoConfidencialidadAcceptResponseDto {
  @ApiProperty()
  accepted: boolean;

  @ApiProperty()
  versionAco: string;

  @ApiProperty()
  fechaHoraAceptacion: Date;
}
