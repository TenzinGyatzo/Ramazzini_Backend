import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trabajador } from '../trabajadores/schemas/trabajador.schema';
import { CreateSeguimientoProgramadoCardiometabolicoDto } from './dto/create-seguimiento-programado-cardiometabolico.dto';
import { UpdateSeguimientoProgramadoCardiometabolicoDto } from './dto/update-seguimiento-programado-cardiometabolico.dto';
import { SeguimientoProgramadoCardiometabolico } from './schemas/seguimiento-programado-cardiometabolico.schema';

/** Encadena poblaciones comunes sobre cualquier query `find*` de Mongoose. */
type PopulatableQuery = {
  populate: (
    opts:
      | string
      | { path?: string; select?: string }
      | Readonly<{ path?: string; select?: string }>,
  ) => PopulatableQuery;
  exec: () => Promise<unknown>;
};

@Injectable()
export class SeguimientoProgramadoCardiometabolicoService {
  constructor(
    @InjectModel(SeguimientoProgramadoCardiometabolico.name)
    private readonly seguimientoModel: Model<SeguimientoProgramadoCardiometabolico>,
    @InjectModel(Trabajador.name)
    private readonly trabajadorModel: Model<Trabajador>,
  ) {}

  private applyPopulates(query: unknown): PopulatableQuery {
    const q = query as PopulatableQuery;
    return q
      .populate({ path: 'createdBy', select: 'username' })
      .populate({ path: 'updatedBy', select: 'username' })
      .populate({
        path: 'idEventoClinico',
        select: 'fechaEventoSeguimientoCardiometabolico motivoSeguimiento',
      })
      .populate({
        path: 'idSeguimientoReprogramado',
        select: 'fechaProgramada estado',
      });
  }

  private async touchTrabajador(trabajadorId: string): Promise<void> {
    if (!trabajadorId) return;
    await this.trabajadorModel.findByIdAndUpdate(trabajadorId, {
      updatedAt: new Date(),
    });
  }

  async findByTrabajador(trabajadorId: string): Promise<SeguimientoProgramadoCardiometabolico[]> {
    const raw = await this.applyPopulates(
      this.seguimientoModel.find({ idTrabajador: trabajadorId }).sort({ fechaProgramada: -1 }),
    ).exec();

    return raw as SeguimientoProgramadoCardiometabolico[];
  }

  async findOne(trabajadorId: string, id: string): Promise<SeguimientoProgramadoCardiometabolico> {
    const doc = await this.applyPopulates(
      this.seguimientoModel.findOne({ _id: id, idTrabajador: trabajadorId }),
    ).exec();

    if (!doc) {
      throw new NotFoundException(
        'Seguimiento programado cardiometabólico no encontrado o no pertenece al trabajador',
      );
    }
    return doc as SeguimientoProgramadoCardiometabolico;
  }

  async create(
    trabajadorId: string,
    dto: CreateSeguimientoProgramadoCardiometabolicoDto,
  ): Promise<SeguimientoProgramadoCardiometabolico> {
    const created = new this.seguimientoModel({
      ...dto,
      idTrabajador: trabajadorId,
    });
    const saved = await created.save();
    await this.touchTrabajador(trabajadorId);

    const populated = await this.applyPopulates(this.seguimientoModel.findById(saved._id)).exec();

    if (!populated) {
      throw new NotFoundException('No se pudo recuperar el registro recién creado');
    }
    return populated as SeguimientoProgramadoCardiometabolico;
  }

  async update(
    trabajadorId: string,
    id: string,
    dto: UpdateSeguimientoProgramadoCardiometabolicoDto,
  ): Promise<SeguimientoProgramadoCardiometabolico> {
    await this.ensureExists(trabajadorId, id);

    const { updatedBy, motivo, ...rest } = dto;
    const setPayload = Object.fromEntries(
      Object.entries({ ...rest, updatedBy }).filter(([, value]) => value !== undefined),
    ) as Record<string, unknown>;

    if (motivo !== undefined && motivo !== null) {
      setPayload.motivo = motivo;
    }

    const updateDoc: Record<string, unknown> = { $set: setPayload };
    if (motivo === null) {
      updateDoc.$unset = { motivo: '' };
    }

    const updated = await this.seguimientoModel
      .findOneAndUpdate({ _id: id, idTrabajador: trabajadorId }, updateDoc, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(
        'Seguimiento programado cardiometabólico no encontrado o no pertenece al trabajador',
      );
    }

    await this.touchTrabajador(trabajadorId);

    const populated = await this.applyPopulates(this.seguimientoModel.findById(updated._id)).exec();

    if (!populated) {
      throw new NotFoundException('No se pudo recuperar el registro actualizado');
    }
    return populated as SeguimientoProgramadoCardiometabolico;
  }

  async remove(trabajadorId: string, id: string): Promise<void> {
    await this.ensureExists(trabajadorId, id);
    await this.seguimientoModel.deleteOne({ _id: id, idTrabajador: trabajadorId }).exec();
    await this.touchTrabajador(trabajadorId);
  }

  private async ensureExists(trabajadorId: string, id: string): Promise<void> {
    const exists = await this.seguimientoModel.exists({ _id: id, idTrabajador: trabajadorId });
    if (!exists) {
      throw new NotFoundException(
        'Seguimiento programado cardiometabólico no encontrado o no pertenece al trabajador',
      );
    }
  }
}
