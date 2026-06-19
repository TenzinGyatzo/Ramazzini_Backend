import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CreateRiesgosTrabajoDto } from './dto/create-riesgos-trabajo.dto';
import { UpdateRiesgosTrabajoDto } from './dto/update-riesgos-trabajo.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RiesgoTrabajo } from './schemas/riesgo-trabajo.schema';
import { WorkerFusionService } from '../trabajadores/worker-fusion.service';

@Injectable()
export class RiesgosTrabajoService {
  constructor(
    @InjectModel(RiesgoTrabajo.name)
    private RiesgoTrabajoModel: Model<RiesgoTrabajo>,
    @Inject(forwardRef(() => WorkerFusionService))
    private workerFusionService: WorkerFusionService,
  ) {}

  async create(createRiesgosTrabajoDto: CreateRiesgosTrabajoDto) {
    try {
      if (createRiesgosTrabajoDto.idTrabajador) {
        createRiesgosTrabajoDto.idTrabajador =
          await this.workerFusionService.getCanonicalTrabajadorId(
            createRiesgosTrabajoDto.idTrabajador,
          );
      }
      const riesgoTrabajo = new this.RiesgoTrabajoModel(
        createRiesgosTrabajoDto,
      );
      const savedRiesgoTrabajo = await riesgoTrabajo.save();
      return savedRiesgoTrabajo;
    } catch (error) {
      console.error('Error al guardar el riesgo de trabajo:', error);
      throw new Error('Error al guardar el riesgo de trabajo');
    }
  }

  async findAll() {
    try {
      return await this.RiesgoTrabajoModel.find().exec();
    } catch (error) {
      console.error('Error al buscar los riesgos de trabajo:', error);
      throw new Error('Error al buscar los riesgos de trabajo');
    }
  }

  async findOne(id: string) {
    try {
      const riesgoTrabajo = await this.RiesgoTrabajoModel.findById(id).exec();
      if (!riesgoTrabajo) {
        throw new Error('Riesgo de trabajo no encontrado');
      }
      return riesgoTrabajo;
    } catch (error) {
      console.error('Error al buscar el riesgo de trabajo:', error);
      throw new Error('Error al buscar el riesgo de trabajo');
    }
  }

  async update(id: string, updateRiesgosTrabajoDto: UpdateRiesgosTrabajoDto) {
    try {
      const originalDoc = await this.RiesgoTrabajoModel.findById(id).lean();
      if (!originalDoc) {
        throw new Error('Riesgo de trabajo no encontrado');
      }

      // Determinar qué campos se deben eliminar (los que existían antes y ya no están en el DTO)
      const keysToUnset = {};
      for (const key in originalDoc) {
        if (
          key !== '_id' &&
          key !== '__v' &&
          key !== 'updatedAt' && // <-- evita conflicto
          !(key in updateRiesgosTrabajoDto)
        ) {
          keysToUnset[key] = '';
        }
      }

      const updatedRiesgoTrabajo =
        await this.RiesgoTrabajoModel.findByIdAndUpdate(
          id,
          {
            $set: updateRiesgosTrabajoDto,
            $unset: keysToUnset,
          },
          { new: true },
        ).exec();

      if (!updatedRiesgoTrabajo) {
        throw new Error('Riesgo de trabajo no encontrado');
      }

      return updatedRiesgoTrabajo;
    } catch (error) {
      console.error('Error al actualizar el riesgo de trabajo:', error);
      throw new Error('Error al actualizar el riesgo de trabajo');
    }
  }

  async remove(id: string) {
    try {
      const deletedRiesgoTrabajo =
        await this.RiesgoTrabajoModel.findByIdAndDelete(id).exec();
      if (!deletedRiesgoTrabajo) {
        throw new Error('Riesgo de trabajo no encontrado');
      }
      return deletedRiesgoTrabajo;
    } catch (error) {
      console.error('Error al eliminar el riesgo de trabajo:', error);
      throw new Error('Error al eliminar el riesgo de trabajo');
    }
  }
}
