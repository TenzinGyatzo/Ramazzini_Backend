import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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

  @ApiPropertyOptional({
    description: 'Keys de columnas incluidas en el Excel generado en el cliente',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @IsString({ each: true })
  columnKeys?: string[];

  @ApiPropertyOptional({ description: 'Cantidad de columnas exportadas' })
  @IsOptional()
  @IsInt()
  @Min(0)
  columnCount?: number;

  @ApiPropertyOptional({
    description:
      'Si el usuario activó en el modal “Mostrar columnas vacías” (UI; no altera el Excel por sí solo)',
  })
  @IsOptional()
  @IsBoolean()
  showEmptyColumns?: boolean;
}
