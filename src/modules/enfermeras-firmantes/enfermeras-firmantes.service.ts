import { Injectable, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { CreateEnfermeraFirmanteDto } from './dto/create-enfermera-firmante.dto';
import { UpdateEnfermeraFirmanteDto } from './dto/update-enfermera-firmante.dto';
import { InjectModel } from '@nestjs/mongoose';
import { EnfermeraFirmante } from './schemas/enfermera-firmante.schema';
import { Model } from 'mongoose';
import { normalizeEnfermeraFirmanteData } from 'src/utils/normalization';
import { User } from '../users/schemas/user.schema';
import { ProveedorSalud } from '../proveedores-salud/schemas/proveedor-salud.schema';
import { RegulatoryPolicyService } from 'src/utils/regulatory-policy.service';
import { validateFechaNacimientoFirmante } from '../expedientes/validators/date-validators';
import { CatalogsService } from '../catalogs/catalogs.service';
import { GeographyValidator } from '../catalogs/validators/geography.validator';
import { validateFirmanteRegulatoryFields } from 'src/utils/firmante-regulatory-validation.util';

@Injectable()
export class EnfermerasFirmantesService {
  constructor(
    @InjectModel(EnfermeraFirmante.name)
    private enfermeraFirmanteModel: Model<EnfermeraFirmante>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(ProveedorSalud.name)
    private proveedorSaludModel: Model<ProveedorSalud>,
    @Inject(forwardRef(() => RegulatoryPolicyService))
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
    private readonly catalogsService: CatalogsService,
    private readonly geographyValidator: GeographyValidator,
  ) {}

  private async getPolicyForUser(idUser: string) {
    const user = await this.userModel.findById(idUser).exec();
    if (!user?.idProveedorSalud) {
      return null;
    }
    return this.regulatoryPolicyService.getRegulatoryPolicy(
      user.idProveedorSalud,
    );
  }

  private async validateFirmanteSiresFields(
    data: Record<string, unknown>,
    idUser: string,
  ): Promise<void> {
    if (data.paisNacimiento == null || Number.isNaN(Number(data.paisNacimiento))) {
      throw new BadRequestException('El país de nacimiento es obligatorio');
    }

    const policy = await this.getPolicyForUser(idUser);
    if (!policy) {
      return;
    }

    await validateFirmanteRegulatoryFields(
      policy,
      {
        paisNacimiento: data.paisNacimiento as number | undefined,
        entidadNacimiento: data.entidadNacimiento as string | undefined,
        entidadResidencia: data.entidadResidencia as string | undefined,
        municipioResidencia: data.municipioResidencia as string | undefined,
        localidadResidencia: data.localidadResidencia as string | undefined,
        curp: data.curp as string | undefined,
        fechaNacimiento: data.fechaNacimiento as Date | undefined,
        sexo: data.sexo as string | undefined,
        nombre: data.nombre as string | undefined,
      },
      this.catalogsService,
      this.geographyValidator,
    );
  }

  private validateFechaNacimientoField(
    fechaNacimiento: Date | undefined,
    isCreate: boolean,
  ): void {
    if (!fechaNacimiento) {
      if (isCreate) {
        throw new BadRequestException(
          'La fecha de nacimiento es obligatoria',
        );
      }
      return;
    }
    validateFechaNacimientoFirmante(fechaNacimiento);
  }

  async create(createEnfermeraFirmanteDto: CreateEnfermeraFirmanteDto) {
    const normalizedDto = normalizeEnfermeraFirmanteData(
      createEnfermeraFirmanteDto,
    );

    this.validateFechaNacimientoField(
      (normalizedDto as any).fechaNacimiento,
      true,
    );

    await this.validateFirmanteSiresFields(
      normalizedDto as Record<string, unknown>,
      createEnfermeraFirmanteDto.idUser,
    );

    const createdConfiguracionInforme = new this.enfermeraFirmanteModel(
      normalizedDto,
    );
    return createdConfiguracionInforme.save();
  }

  async findAll(): Promise<EnfermeraFirmante[]> {
    return this.enfermeraFirmanteModel.find().exec();
  }

  async findOne(id: string): Promise<EnfermeraFirmante> {
    return this.enfermeraFirmanteModel.findById(id).exec();
  }

  async findOneByUserId(idUser: string): Promise<EnfermeraFirmante> {
    return this.enfermeraFirmanteModel.findOne({ idUser }).exec();
  }

  async update(
    id: string,
    updateEnfermeraFirmanteDto: UpdateEnfermeraFirmanteDto,
  ): Promise<EnfermeraFirmante> {
    const normalizedDto = normalizeEnfermeraFirmanteData(
      updateEnfermeraFirmanteDto,
    );

    const existing = await this.enfermeraFirmanteModel.findById(id).exec();

    const fechaNacimientoToValidate =
      (normalizedDto as any).fechaNacimiento !== undefined
        ? (normalizedDto as any).fechaNacimiento
        : (existing as any)?.fechaNacimiento;

    if ((normalizedDto as any).fechaNacimiento !== undefined) {
      this.validateFechaNacimientoField(
        (normalizedDto as any).fechaNacimiento,
        false,
      );
    } else if (!fechaNacimientoToValidate) {
      throw new BadRequestException(
        'La fecha de nacimiento es obligatoria',
      );
    }

    if (existing) {
      const idUser =
        updateEnfermeraFirmanteDto.idUser || existing.idUser?.toString();
      if (idUser) {
        const merged = {
          ...(existing.toObject?.() ?? existing),
          ...normalizedDto,
        };
        await this.validateFirmanteSiresFields(
          merged as Record<string, unknown>,
          idUser,
        );
      }
    }

    return this.enfermeraFirmanteModel
      .findByIdAndUpdate(id, normalizedDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.enfermeraFirmanteModel
      .findByIdAndDelete(id)
      .exec();
    return result !== null;
  }
}
