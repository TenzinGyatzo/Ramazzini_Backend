import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class MergeDocumentItemDto {
  @ApiProperty({ description: 'ID del documento' })
  @IsMongoId()
  documentId: string;

  @ApiProperty({
    description: 'Tipo de documento en camelCase de dominio',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  documentType: string;

  @ApiProperty({
    description:
      'Ruta relativa del archivo clínico (solo para merge/AuthZ; no se audita)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  filePath: string;
}

export class MergeDocumentsDto {
  @ApiProperty({ description: 'ID del trabajador' })
  @IsMongoId()
  trabajadorId: string;

  @ApiProperty({ type: [MergeDocumentItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => MergeDocumentItemDto)
  documents: MergeDocumentItemDto[];
}
