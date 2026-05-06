import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import {
  EstadoSeguimientoProgramadoCardiometabolico,
  MotivoSeguimientoProgramadoCardiometabolico,
} from '../enums/seguimiento-programado-cardiometabolico.enum';

export class UpdateSeguimientoProgramadoCardiometabolicoDto {
  @IsOptional()
  @IsDate({ message: 'fechaProgramada debe ser una fecha válida' })
  @Type(() => Date)
  fechaProgramada?: Date;

  @IsOptional()
  @IsEnum(EstadoSeguimientoProgramadoCardiometabolico, {
    message: 'estado no válido',
  })
  estado?: EstadoSeguimientoProgramadoCardiometabolico;

  @IsOptional()
  @IsMongoId({ message: 'idEventoClinico debe ser un ObjectId válido' })
  idEventoClinico?: string;

  @IsOptional()
  @IsDate({ message: 'fechaReprogramada debe ser una fecha válida' })
  @Type(() => Date)
  fechaReprogramada?: Date;

  @IsOptional()
  @IsMongoId({ message: 'idSeguimientoReprogramado debe ser un ObjectId válido' })
  idSeguimientoReprogramado?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  /** Enviar `null` para quitar el motivo guardado. */
  @IsOptional()
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsEnum(MotivoSeguimientoProgramadoCardiometabolico, { message: 'motivo no válido' })
  motivo?: MotivoSeguimientoProgramadoCardiometabolico | null;

  @IsMongoId({ message: 'updatedBy debe ser un ObjectId válido' })
  @IsNotEmpty({ message: 'updatedBy es requerido' })
  updatedBy: string;
}
