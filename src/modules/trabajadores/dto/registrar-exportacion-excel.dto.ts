import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class RegistrarExportacionExcelDto {
  @ApiProperty({ description: 'Número de filas exportadas' })
  @IsInt()
  @Min(0)
  rowCount: number;

  @ApiProperty({ description: 'Nombre del archivo generado' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiPropertyOptional({ description: 'Si la exportación aplicó filtros del listado' })
  @IsOptional()
  @IsBoolean()
  filtered?: boolean;
}
