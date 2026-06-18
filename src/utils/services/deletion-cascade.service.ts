import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CentroTrabajo } from 'src/modules/centros-trabajo/entities/centros-trabajo.entity';
import { Trabajador } from 'src/modules/trabajadores/schemas/trabajador.schema';

@Injectable()
export class DeletionCascadeService {
  constructor(
    @InjectModel(CentroTrabajo.name)
    private readonly centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(Trabajador.name)
    private readonly trabajadorModel: Model<Trabajador>,
  ) {}

  async countCentrosByEmpresa(empresaId: string): Promise<number> {
    return this.centroTrabajoModel.countDocuments({ idEmpresa: empresaId }).exec();
  }

  async countTrabajadoresByCentro(centroId: string): Promise<number> {
    return this.trabajadorModel
      .countDocuments({ idCentroTrabajo: centroId })
      .exec();
  }
}
