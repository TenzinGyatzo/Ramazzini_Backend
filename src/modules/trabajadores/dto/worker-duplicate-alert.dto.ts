import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DuplicateWorkerSummaryDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  primerApellido: string;

  @ApiPropertyOptional()
  segundoApellido?: string;

  @ApiPropertyOptional()
  curp?: string;

  @ApiPropertyOptional()
  folio?: string;

  @ApiPropertyOptional()
  numeroEmpleado?: string;

  @ApiProperty()
  idCentroTrabajo: string;

  @ApiPropertyOptional()
  createdAt?: Date;
}

export class WorkerDuplicateAlertDto {
  @ApiProperty()
  _id: string;

  @ApiProperty({ type: DuplicateWorkerSummaryDto })
  trabajadorId: DuplicateWorkerSummaryDto | string;

  @ApiProperty({ type: DuplicateWorkerSummaryDto })
  candidatoId: DuplicateWorkerSummaryDto | string;

  @ApiProperty({ enum: ['CURP', 'FOLIO'] })
  criterio: 'CURP' | 'FOLIO';

  @ApiProperty({ enum: ['PENDIENTE', 'DESCARTADO', 'FUSIONADO'] })
  estado: 'PENDIENTE' | 'DESCARTADO' | 'FUSIONADO';

  @ApiPropertyOptional()
  createdAt?: Date;
}

export class PosibleDuplicadoResponseDto {
  @ApiProperty()
  trabajadorId: string;

  @ApiProperty({ enum: ['CURP', 'FOLIO'] })
  criterio: 'CURP' | 'FOLIO';

  @ApiProperty({ type: DuplicateWorkerSummaryDto })
  trabajador: DuplicateWorkerSummaryDto;

  @ApiPropertyOptional({ description: 'ID de alerta para descartar desde el alta' })
  alertId?: string;
}
