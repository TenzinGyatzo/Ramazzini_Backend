import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class VincularDocumentoDto {
  @ApiProperty({
    description: 'ID del documento externo a vincular',
    example: '60d9f70fc39b3c1b8f0d6c0d',
  })
  @IsMongoId({ message: 'El ID del documento externo debe ser un ObjectId válido' })
  @IsNotEmpty({ message: 'El ID del documento externo es requerido' })
  idDocumentoExterno: string;
}
