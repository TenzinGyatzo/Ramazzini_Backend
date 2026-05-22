import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

const alcanceAclaracion = ['ACLARA', 'CORRIGE', 'COMPLEMENTA', 'INVALIDA'];
const impactoClinico = ['LEVE', 'MODERADO', 'SEVERO'];

export class CreateNotaAclaratoriaDto {
  @IsDate({ message: 'La fecha de la nota aclaratoria debe ser una fecha' })
  @Type(() => Date)
  @IsNotEmpty({
    message: 'La fecha de la nota aclaratoria no puede estar vacía',
  })
  fechaNotaAclaratoria: Date;

  @IsMongoId({ message: 'El id del documento origen debe ser un ObjectId' })
  @IsNotEmpty({ message: 'El id del documento origen no puede estar vacío' })
  documentoOrigenId: string;

  @IsString({ message: 'El tipo del documento origen debe ser un string' })
  @IsNotEmpty({ message: 'El tipo del documento origen no puede estar vacío' })
  documentoOrigenTipo: string;

  @IsString({ message: 'El nombre del documento origen debe ser un string' })
  @IsOptional()
  documentoOrigenNombre?: string;

  @IsDate({ message: 'La fecha del documento origen debe ser una fecha' })
  @Type(() => Date)
  @IsOptional()
  documentoOrigenFecha?: Date;

  @IsString({ message: 'El motivo de la aclaración debe ser un string' })
  @IsNotEmpty({ message: 'El motivo de la aclaración no puede estar vacío' })
  motivoAclaracion: string;

  @IsString({ message: 'La descripción de la aclaración debe ser un string' })
  @IsNotEmpty({
    message: 'La descripción de la aclaración no puede estar vacía',
  })
  descripcionAclaracion: string;

  @IsEnum(alcanceAclaracion, {
    message:
      'El alcance de la aclaración debe ser alguno de los siguientes: ' +
      alcanceAclaracion.join(', '),
  })
  @IsNotEmpty({ message: 'El alcance de la aclaración no puede estar vacío' })
  alcanceAclaracion: string;

  @IsEnum(impactoClinico, {
    message:
      'El impacto clínico debe ser alguno de los siguientes: ' + impactoClinico,
  })
  @IsNotEmpty({ message: 'El impacto clínico no puede estar vacío' })
  impactoClinico: string;

  @IsMongoId({ message: 'El id del trabajador debe ser un ObjectId' })
  @IsNotEmpty({ message: 'El id del trabajador no puede estar vacío' })
  idTrabajador: string;

  @IsString({ message: 'La ruta del PDF del informe debe ser un string' })
  @IsNotEmpty({ message: 'La ruta del PDF del informe no puede estar vacía' })
  rutaPDF: string;

  @IsMongoId({ message: 'El ID de "createdBy" no es válido' })
  @IsNotEmpty({ message: 'El ID de "createdBy" no puede estar vacío' })
  createdBy: string;

  @IsMongoId({ message: 'El ID de "updatedBy" no es válido' })
  @IsNotEmpty({ message: 'El ID de "updatedBy" no puede estar vacío' })
  updatedBy: string;
}
