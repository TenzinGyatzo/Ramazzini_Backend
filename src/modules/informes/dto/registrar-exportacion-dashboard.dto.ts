import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsMongoId, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class RegistrarExportacionDashboardDto {
  @ApiProperty()
  @IsMongoId()
  empresaId: string;

  @ApiProperty({ description: 'Periodo del informe (ej. rango de fechas)' })
  @IsString()
  @IsNotEmpty()
  periodo: string;

  @ApiProperty({ description: 'Nombre del centro o "Todos"' })
  @IsString()
  @IsNotEmpty()
  centroTrabajo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  totalTrabajadores?: number;

  @ApiProperty({ enum: ['view', 'download'] })
  @IsIn(['view', 'download'])
  modo: 'view' | 'download';
}
