import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RegistrarDescargaArchivoClinicoDto {
  @ApiProperty({ description: 'ID del documento clínico o externo' })
  @IsMongoId()
  documentId: string;

  @ApiProperty({
    description:
      'Tipo de documento en camelCase de dominio (p. ej. historiaClinica, documentoExterno)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  documentType: string;

  @ApiProperty({ description: 'ID del trabajador dueño del documento' })
  @IsMongoId()
  trabajadorId: string;

  @ApiPropertyOptional({ description: 'Nombre de archivo ofrecido al usuario' })
  @IsOptional()
  @IsString()
  @MaxLength(260)
  filename?: string;

  @ApiPropertyOptional({ enum: ['pdf', 'image'] })
  @IsOptional()
  @IsIn(['pdf', 'image'])
  mediaKind?: 'pdf' | 'image';

  @ApiPropertyOptional({ enum: ['lista', 'visor', 'resultados-clinicos'] })
  @IsOptional()
  @IsIn(['lista', 'visor', 'resultados-clinicos'])
  origen?: 'lista' | 'visor' | 'resultados-clinicos';
}
