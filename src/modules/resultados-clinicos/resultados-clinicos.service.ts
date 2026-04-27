import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResultadoClinico, ResultadoGlobal, TipoEstudio, TipoSangre } from './schemas/resultado-clinico.schema';
import { CreateResultadoClinicoDto } from './dto/create-resultado-clinico.dto';
import { UpdateResultadoClinicoDto } from './dto/update-resultado-clinico.dto';
import { DocumentoExterno } from '../expedientes/schemas/documento-externo.schema';

/** Campos de categoría paraguas; solo debe persistir el que corresponda a `tipoEstudio`. */
const TIPO_ALTERACION_FIELD_KEYS = [
  'tipoAlteracionEspirometria',
  'tipoAlteracionEKG',
  'tipoAlteracionRayosX',
  'tipoAlteracionAnalisisLaboratorio',
] as const;

function allowedTipoAlteracionKey(tipoEstudio: TipoEstudio): (typeof TIPO_ALTERACION_FIELD_KEYS)[number] | null {
  switch (tipoEstudio) {
    case TipoEstudio.ESPIROMETRIA:
      return 'tipoAlteracionEspirometria';
    case TipoEstudio.EKG:
      return 'tipoAlteracionEKG';
    case TipoEstudio.RAYOS_X:
      return 'tipoAlteracionRayosX';
    case TipoEstudio.ANALISIS_LABORATORIO:
      return 'tipoAlteracionAnalisisLaboratorio';
    default:
      return null;
  }
}

/** Quita del objeto cualquier `tipoAlteracion*` que no aplique a este `tipoEstudio`. */
function stripTipoAlteracionFieldsForTipoEstudio(
  tipoEstudio: TipoEstudio,
  data: Record<string, unknown>,
): void {
  const allowed = allowedTipoAlteracionKey(tipoEstudio);
  for (const key of TIPO_ALTERACION_FIELD_KEYS) {
    if (key !== allowed) {
      delete data[key];
    }
  }
  // No persistir arrays vacíos (Rayos X / laboratorio)
  if (allowed === 'tipoAlteracionRayosX') {
    const v = data['tipoAlteracionRayosX'];
    if (Array.isArray(v) && v.length === 0) {
      delete data['tipoAlteracionRayosX'];
    }
  }
  if (allowed === 'tipoAlteracionAnalisisLaboratorio') {
    const v = data['tipoAlteracionAnalisisLaboratorio'];
    if (Array.isArray(v) && v.length === 0) {
      delete data['tipoAlteracionAnalisisLaboratorio'];
    }
  }
}

/**
 * En updates vía `findByIdAndUpdate` no corre `pre('save')`: si llega `[]` en el campo permitido,
 * hay que quitar el `$set` y usar `$unset` para borrar la ruta en MongoDB.
 */
function applyEmptyArrayTipoAlteracionUnset(
  tipoEstudio: TipoEstudio,
  updateData: Record<string, any>,
): void {
  const allowed = allowedTipoAlteracionKey(tipoEstudio);
  const extraUnset: Record<string, 1> = {};

  if (allowed === 'tipoAlteracionRayosX') {
    const v = updateData['tipoAlteracionRayosX'];
    if (Array.isArray(v) && v.length === 0) {
      delete updateData['tipoAlteracionRayosX'];
      extraUnset['tipoAlteracionRayosX'] = 1;
    }
  }

  if (allowed === 'tipoAlteracionAnalisisLaboratorio') {
    const v = updateData['tipoAlteracionAnalisisLaboratorio'];
    if (Array.isArray(v) && v.length === 0) {
      delete updateData['tipoAlteracionAnalisisLaboratorio'];
      extraUnset['tipoAlteracionAnalisisLaboratorio'] = 1;
    }
  }

  if (Object.keys(extraUnset).length > 0) {
    updateData.$unset = { ...(updateData.$unset || {}), ...extraUnset };
  }
}

/** `$unset` para borrar en BD rutas de alteración que no corresponden al tipo de estudio (idempotente). */
function tipoAlteracionUnsetForTipoEstudio(tipoEstudio: TipoEstudio): Record<string, 1> {
  const allowed = allowedTipoAlteracionKey(tipoEstudio);
  const out: Record<string, 1> = {};
  for (const key of TIPO_ALTERACION_FIELD_KEYS) {
    if (key !== allowed) {
      out[key] = 1;
    }
  }
  return out;
}

@Injectable()
export class ResultadosClinicosService {
  constructor(
    @InjectModel(ResultadoClinico.name)
    private resultadoClinicoModel: Model<ResultadoClinico>,
    @InjectModel(DocumentoExterno.name)
    private documentoExternoModel: Model<DocumentoExterno>,
  ) {}

  async create(createDto: CreateResultadoClinicoDto): Promise<ResultadoClinico> {
    if (createDto.tipoEstudio !== TipoEstudio.TIPO_SANGRE && !createDto.resultadoGlobal) {
      throw new BadRequestException('El resultado global es requerido para estudios de gabinete.');
    }
    // Calcular año del estudio si no viene en el DTO
    const fechaEstudio = new Date(createDto.fechaEstudio);
    const anioEstudio = fechaEstudio.getFullYear();

    const docPayload: Record<string, unknown> = {
      ...createDto,
      anioEstudio,
    };
    stripTipoAlteracionFieldsForTipoEstudio(createDto.tipoEstudio, docPayload);

    const resultadoClinico = new this.resultadoClinicoModel(docPayload);

    return await resultadoClinico.save();
  }

  async findAll(): Promise<ResultadoClinico[]> {
    return await this.resultadoClinicoModel.find().exec();
  }

  async findByTrabajador(
    trabajadorId: string,
    tipoEstudio?: string,
  ): Promise<ResultadoClinico[]> {
    const query: any = { idTrabajador: trabajadorId };

    if (tipoEstudio) {
      query.tipoEstudio = tipoEstudio;
    }

    return await this.resultadoClinicoModel.find(query).sort({ fechaEstudio: -1 }).exec();
  }

  async findByTrabajadorGroupedByYear(
    trabajadorId: string,
  ): Promise<Record<number, ResultadoClinico[]>> {
    const resultados = await this.resultadoClinicoModel
      .find({ idTrabajador: trabajadorId })
      .populate({
        path: 'idDocumentoExterno',
        select: 'nombreDocumento fechaDocumento extension notasDocumento',
      })
      .sort({ fechaEstudio: -1 })
      .exec();

    // Agrupar por año
    const agrupados: Record<number, ResultadoClinico[]> = {};

    resultados.forEach((resultado) => {
      const anio = resultado.anioEstudio;
      if (!agrupados[anio]) {
        agrupados[anio] = [];
      }
      agrupados[anio].push(resultado);
    });

    return agrupados;
  }

  async findOne(id: string): Promise<ResultadoClinico> {
    const resultado = await this.resultadoClinicoModel.findById(id).exec();

    if (!resultado) {
      throw new NotFoundException(`Resultado clínico con ID ${id} no encontrado`);
    }

    return resultado;
  }

  async update(
    id: string,
    updateDto: UpdateResultadoClinicoDto,
  ): Promise<ResultadoClinico> {
    const existing = await this.resultadoClinicoModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException(`Resultado clínico con ID ${id} no encontrado`);
    }

    const updateData: any = { ...updateDto };
    stripTipoAlteracionFieldsForTipoEstudio(existing.tipoEstudio, updateData);
    applyEmptyArrayTipoAlteracionUnset(existing.tipoEstudio, updateData);

    // Recalcular año si se actualiza la fecha
    if (updateDto.fechaEstudio) {
      const fechaEstudio = new Date(updateDto.fechaEstudio);
      updateData.anioEstudio = fechaEstudio.getFullYear();
    }

    // Si el resultado global cambia a NORMAL o NO_CONCLUYENTE, eliminar campos de ANORMAL
    if (
      updateDto.resultadoGlobal &&
      updateDto.resultadoGlobal !== ResultadoGlobal.ANORMAL
    ) {
      updateData.$unset = {
        relevanciaClinica: 1,
        recomendacion: 1,
        tipoAlteracionEspirometria: 1,
        tipoAlteracionEKG: 1,
        tipoAlteracionRayosX: 1,
        tipoAlteracionAnalisisLaboratorio: 1,
      };

      // hallazgoEspecifico se conserva en NORMAL (texto "Especificar"); en NO_CONCLUYENTE el cliente envía '' si aplica
      delete updateData.relevanciaClinica;
      delete updateData.recomendacion;
      delete updateData.tipoAlteracionEspirometria;
      delete updateData.tipoAlteracionEKG;
      delete updateData.tipoAlteracionRayosX;
      delete updateData.tipoAlteracionAnalisisLaboratorio;
    }

    // No persistir `tipoAlteracion*` ajenos al tipo de estudio (limpia datos heredados o payloads extra)
    updateData.$unset = {
      ...(updateData.$unset || {}),
      ...tipoAlteracionUnsetForTipoEstudio(existing.tipoEstudio),
    };

    const resultado = await this.resultadoClinicoModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!resultado) {
      throw new NotFoundException(`Resultado clínico con ID ${id} no encontrado`);
    }

    return resultado;
  }

  async remove(id: string): Promise<boolean> {
    const resultado = await this.resultadoClinicoModel.findById(id).exec();

    if (!resultado) {
      throw new NotFoundException(`Resultado clínico con ID ${id} no encontrado`);
    }

    // Si tiene documento vinculado, limpiar la relación en el documento
    if (resultado.idDocumentoExterno) {
      await this.documentoExternoModel.findByIdAndUpdate(
        resultado.idDocumentoExterno,
        { $unset: { idResultadoClinico: '' } },
      ).exec();
    }

    await this.resultadoClinicoModel.findByIdAndDelete(id).exec();

    return true;
  }

  async vincularDocumento(
    resultadoId: string,
    documentoId: string,
  ): Promise<ResultadoClinico> {
    // Validar que existan ambos documentos
    const resultado = await this.resultadoClinicoModel.findById(resultadoId).exec();
    if (!resultado) {
      throw new NotFoundException(`Resultado clínico con ID ${resultadoId} no encontrado`);
    }

    const documento = await this.documentoExternoModel.findById(documentoId).exec();
    if (!documento) {
      throw new NotFoundException(`Documento externo con ID ${documentoId} no encontrado`);
    }

    // Verificar que pertenezcan al mismo trabajador
    if (resultado.idTrabajador.toString() !== documento.idTrabajador.toString()) {
      throw new BadRequestException('El resultado y el documento deben pertenecer al mismo trabajador');
    }

    // Si el resultado ya tiene un documento vinculado, limpiar la relación previa
    if (resultado.idDocumentoExterno) {
      await this.documentoExternoModel.findByIdAndUpdate(
        resultado.idDocumentoExterno,
        { $unset: { idResultadoClinico: '' } },
      ).exec();
    }

    // Si el documento ya tiene un resultado vinculado, limpiar la relación previa
    if (documento.idResultadoClinico) {
      await this.resultadoClinicoModel.findByIdAndUpdate(
        documento.idResultadoClinico,
        { $unset: { idDocumentoExterno: '' } },
      ).exec();
    }

    // Vincular en ambos lados
    resultado.idDocumentoExterno = documento._id as any;
    await resultado.save();

    if (
      resultado.tipoEstudio === TipoEstudio.EKG ||
      resultado.tipoEstudio === TipoEstudio.ESPIROMETRIA ||
      resultado.tipoEstudio === TipoEstudio.RAYOS_X ||
      resultado.tipoEstudio === TipoEstudio.ANALISIS_LABORATORIO
    ) {
      documento.notasDocumento = resultado.resultadoGlobal;
    } else if (resultado.tipoEstudio === TipoEstudio.TIPO_SANGRE) {
      const mapeoTipoSangre: Record<TipoSangre, string> = {
        [TipoSangre.A_POS]: 'A+',
        [TipoSangre.A_NEG]: 'A-',
        [TipoSangre.B_POS]: 'B+',
        [TipoSangre.B_NEG]: 'B-',
        [TipoSangre.AB_POS]: 'AB+',
        [TipoSangre.AB_NEG]: 'AB-',
        [TipoSangre.O_POS]: 'O+',
        [TipoSangre.O_NEG]: 'O-',
      };
      documento.notasDocumento = mapeoTipoSangre[resultado.tipoSangre] || resultado.tipoSangre;
    }

    documento.idResultadoClinico = resultado._id as any;
    await documento.save();

    return await this.resultadoClinicoModel
      .findById(resultadoId)
      .populate({
        path: 'idDocumentoExterno',
        select: 'nombreDocumento fechaDocumento extension notasDocumento',
      })
      .exec();
  }

  async desvincularDocumento(resultadoId: string): Promise<ResultadoClinico> {
    const resultado = await this.resultadoClinicoModel.findById(resultadoId).exec();

    if (!resultado) {
      throw new NotFoundException(`Resultado clínico con ID ${resultadoId} no encontrado`);
    }

    if (!resultado.idDocumentoExterno) {
      throw new BadRequestException('El resultado no tiene un documento vinculado');
    }

    // Limpiar la relación en el documento
    await this.documentoExternoModel.findByIdAndUpdate(
      resultado.idDocumentoExterno,
      { $unset: { idResultadoClinico: '' } },
    ).exec();

    // Limpiar la relación en el resultado
    resultado.idDocumentoExterno = undefined;
    await resultado.save();

    return resultado;
  }
}
