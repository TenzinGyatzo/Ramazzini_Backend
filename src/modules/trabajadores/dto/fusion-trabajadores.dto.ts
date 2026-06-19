import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class FusionarTrabajadoresDto {
  @ApiProperty({ description: 'ID del trabajador que conservará el expediente unificado' })
  @IsMongoId()
  trabajadorDestinoId: string;

  @ApiProperty({ description: 'ID del trabajador duplicado que será eliminado tras la fusión' })
  @IsMongoId()
  trabajadorFuenteId: string;

  @ApiProperty({ description: 'Confirmación explícita del usuario médico/administrativo' })
  @IsBoolean()
  confirmacion: boolean;

  @ApiPropertyOptional({ description: 'Número de empleado a conservar cuando hay conflicto (1-7 dígitos)' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(7)
  numeroEmpleadoResuelto?: string;

  @ApiPropertyOptional({ description: 'Migrar archivos PDF físicamente al directorio del destino' })
  @IsOptional()
  @IsBoolean()
  migrarArchivos?: boolean;
}

export class FusionPreviewQueryDto {
  @ApiProperty()
  @IsMongoId()
  destinoId: string;

  @ApiProperty()
  @IsMongoId()
  fuenteId: string;
}

export class DescartarDuplicadoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  motivo?: string;
}
