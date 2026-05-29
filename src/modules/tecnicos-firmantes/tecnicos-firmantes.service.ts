import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TecnicoFirmante } from './schemas/tecnico-firmante.schema';
import { CreateTecnicoFirmanteDto } from './dto/create-tecnico-firmante.dto';
import { UpdateTecnicoFirmanteDto } from './dto/update-tecnico-firmante.dto';
import { normalizeTecnicoFirmanteData } from 'src/utils/normalization';
import { User } from '../users/schemas/user.schema';
import { ProveedorSalud } from '../proveedores-salud/schemas/proveedor-salud.schema';
import { RegulatoryPolicyService } from 'src/utils/regulatory-policy.service';
import { validateCurpByPolicy } from 'src/utils/curp-policy-validator.util';

@Injectable()
export class TecnicosFirmantesService {
  constructor(
    @InjectModel(TecnicoFirmante.name)
    private tecnicoModel: Model<TecnicoFirmante>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(ProveedorSalud.name)
    private proveedorSaludModel: Model<ProveedorSalud>,
    @Inject(forwardRef(() => RegulatoryPolicyService))
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
  ) {}

  /**
   * Validate CURP based on regulatory policy
   * Uses Policy Layer to determine if CURP is required or optional
   */
  private async validateCURPByPolicy(
    curp: string | undefined,
    idUser: string,
  ): Promise<void> {
    const user = await this.userModel.findById(idUser).exec();
    if (!user || !user.idProveedorSalud) {
      return;
    }

    const policy = await this.regulatoryPolicyService.getRegulatoryPolicy(
      user.idProveedorSalud,
    );

    validateCurpByPolicy(curp, policy);
  }

  async create(dto: CreateTecnicoFirmanteDto) {
    const normalized = normalizeTecnicoFirmanteData(dto);

    await this.validateCURPByPolicy((normalized as any).curp, dto.idUser);

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

  async update(
    id: string,
    dto: UpdateTecnicoFirmanteDto,
  ): Promise<TecnicoFirmante> {
    const normalized = normalizeTecnicoFirmanteData(dto);

    const existing = await this.tecnicoModel.findById(id).exec();
    if (existing) {
      const idUser = dto.idUser || existing.idUser?.toString();
      if (idUser) {
        const curpToValidate =
          (normalized as any).curp !== undefined
            ? (normalized as any).curp
            : (existing as any).curp;
        await this.validateCURPByPolicy(curpToValidate, idUser);
      }
    }

    return this.tecnicoModel
      .findByIdAndUpdate(id, normalized, { new: true })
      .exec();
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.tecnicoModel.findByIdAndDelete(id).exec();
    return result !== null;
  }
}
