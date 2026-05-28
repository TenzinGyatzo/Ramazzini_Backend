import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TecnicoFirmante } from './schemas/tecnico-firmante.schema';
import { CreateTecnicoFirmanteDto } from './dto/create-tecnico-firmante.dto';
import { UpdateTecnicoFirmanteDto } from './dto/update-tecnico-firmante.dto';
import { normalizeTecnicoFirmanteData } from 'src/utils/normalization';

@Injectable()
export class TecnicosFirmantesService {
  constructor(@InjectModel(TecnicoFirmante.name) private tecnicoModel: Model<TecnicoFirmante>) {}

  async create(dto: CreateTecnicoFirmanteDto) {
    // Reusar normalización similar a enfermera
    const normalized = normalizeTecnicoFirmanteData(dto);
    const created = new this.tecnicoModel(normalized);
    return created.save();
  }

  async findAll(): Promise<TecnicoFirmante[]> {
    return this.tecnicoModel.find().exec();
  }

  async findOne(id: string): Promise<TecnicoFirmante> {
    return this.tecnicoModel.findById(id).exec();
  }

  async findOneByUserId(idUser: string): Promise<TecnicoFirmante> {
    return this.tecnicoModel.findOne({ idUser }).exec();
  }

  async update(id: string, dto: UpdateTecnicoFirmanteDto): Promise<TecnicoFirmante> {
    const normalized = normalizeTecnicoFirmanteData(dto);
    return this.tecnicoModel.findByIdAndUpdate(id, normalized, { new: true }).exec();
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.tecnicoModel.findByIdAndDelete(id).exec();
    return result !== null;
  }
}


