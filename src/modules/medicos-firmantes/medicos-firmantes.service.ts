import { Injectable, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { CreateMedicoFirmanteDto } from './dto/create-medico-firmante.dto';
import { UpdateMedicoFirmanteDto } from './dto/update-medico-firmante.dto';
import { InjectModel } from '@nestjs/mongoose';
import { MedicoFirmante } from './schemas/medico-firmante.schema';
import { Model } from 'mongoose';
import { normalizeMedicoFirmanteData, applyTrabajadorPersonNames } from 'src/utils/normalization';
import { User } from '../users/schemas/user.schema';
import { ProveedorSalud } from '../proveedores-salud/schemas/proveedor-salud.schema';
import { RegulatoryPolicyService } from 'src/utils/regulatory-policy.service';
import { validateFechaNacimientoFirmante } from '../expedientes/validators/date-validators';
import { CatalogsService } from '../catalogs/catalogs.service';
import { GeographyValidator } from '../catalogs/validators/geography.validator';
import {
  buildFirmanteRegulatoryPayload,
  validateFirmanteRegulatoryFields,
} from 'src/utils/firmante-regulatory-validation.util';
import { validateFirmanteIdentificationImmutable } from 'src/utils/firmante-identification-immutability.util';
import { assertValidPersonNameFields } from 'src/utils/name-validator.util';
import { generateFolioFromWorkerData } from 'src/utils/folio-generator.util';
import { ClinicalAttentionQueryService } from '../expedientes/services/clinical-attention-query.service';

@Injectable()
export class MedicosFirmantesService {
  constructor(
    @InjectModel(MedicoFirmante.name)
    private medicoFirmanteModel: Model<MedicoFirmante>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(ProveedorSalud.name)
    private proveedorSaludModel: Model<ProveedorSalud>,
    @Inject(forwardRef(() => RegulatoryPolicyService))
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
    private readonly catalogsService: CatalogsService,
    private readonly geographyValidator: GeographyValidator,
    private readonly clinicalAttentionQuery: ClinicalAttentionQueryService,
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
      buildFirmanteRegulatoryPayload(data),
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

  async create(createMedicoFirmanteDto: CreateMedicoFirmanteDto) {
    const normalizedDto = normalizeMedicoFirmanteData(createMedicoFirmanteDto);

    this.validateFechaNacimientoField(
      (normalizedDto as any).fechaNacimiento,
      true,
    );

    const policy = await this.getPolicyForUser(createMedicoFirmanteDto.idUser);
    applyTrabajadorPersonNames(
      normalizedDto as Record<string, unknown>,
      policy?.regime,
    );

    assertValidPersonNameFields(
      (normalizedDto as any).nombre,
      (normalizedDto as any).primerApellido,
      (normalizedDto as any).segundoApellido,
      policy?.regime,
    );

    await this.validateFirmanteSiresFields(
      normalizedDto as Record<string, unknown>,
      createMedicoFirmanteDto.idUser,
    );

    // NOM-024: Generar folio alfanumérico 18 caracteres (solo nuevos, no retroactivo)
    (normalizedDto as any).folio = generateFolioFromWorkerData({
      nombre: (normalizedDto as any).nombre,
      primerApellido: (normalizedDto as any).primerApellido,
      segundoApellido: (normalizedDto as any).segundoApellido,
      fechaNacimiento: (normalizedDto as any).fechaNacimiento,
      sexo: (normalizedDto as any).sexo,
    });

    const createdConfiguracionInforme = new this.medicoFirmanteModel(
      normalizedDto,
    );
    return createdConfiguracionInforme.save();
  }

  async findAll(): Promise<MedicoFirmante[]> {
    return this.medicoFirmanteModel.find().exec();
  }

  async findOne(id: string): Promise<MedicoFirmante> {
    const doc = await this.medicoFirmanteModel.findById(id).exec();
    return this.clinicalAttentionQuery.withFirmanteAttentionFlag(doc) as Promise<MedicoFirmante>;
  }

  async findOneByUserId(idUser: string): Promise<MedicoFirmante> {
    const doc = await this.medicoFirmanteModel.findOne({ idUser }).exec();
    return this.clinicalAttentionQuery.withFirmanteAttentionFlag(doc) as Promise<MedicoFirmante>;
  }

  async update(
    id: string,
    updateMedicoFirmanteDto: UpdateMedicoFirmanteDto,
  ): Promise<MedicoFirmante> {
    const normalizedDto = normalizeMedicoFirmanteData(updateMedicoFirmanteDto);

    const existing = await this.medicoFirmanteModel.findById(id).exec();

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
        updateMedicoFirmanteDto.idUser || existing.idUser?.toString();
      if (idUser) {
        const policy = await this.getPolicyForUser(idUser);
        if (policy) {
          const hasFinalizedClinicalDocument = policy.features
            .workerIdentificationImmutable
            ? await this.clinicalAttentionQuery.hasFinalizedClinicalDocumentByUser(
                idUser,
              )
            : false;
          validateFirmanteIdentificationImmutable(
            updateMedicoFirmanteDto as Record<string, unknown>,
            existing,
            policy,
            { hasFinalizedClinicalDocument },
          );
        }
        const merged = {
          ...(existing.toObject?.() ?? existing),
        };
        for (const key of Object.keys(updateMedicoFirmanteDto)) {
          if ((normalizedDto as Record<string, unknown>)[key] !== undefined) {
            merged[key] = (normalizedDto as Record<string, unknown>)[key];
          }
        }
        applyTrabajadorPersonNames(merged as Record<string, unknown>, policy?.regime);
        assertValidPersonNameFields(
          merged.nombre as string,
          merged.primerApellido as string,
          merged.segundoApellido as string,
          policy?.regime,
        );
        applyTrabajadorPersonNames(
          normalizedDto as Record<string, unknown>,
          policy?.regime,
        );
        await this.validateFirmanteSiresFields(
          merged as Record<string, unknown>,
          idUser,
        );

        // Backfill: firmantes previos sin folio lo reciben en el primer update
        if (!(existing as any).folio) {
          (normalizedDto as any).folio = generateFolioFromWorkerData({
            nombre: merged.nombre as string,
            primerApellido: merged.primerApellido as string,
            segundoApellido: merged.segundoApellido as string | undefined,
            fechaNacimiento: (merged.fechaNacimiento as Date) || fechaNacimientoToValidate,
            sexo: merged.sexo as string,
          });
        }
      }
    }

    return this.medicoFirmanteModel
      .findByIdAndUpdate(id, normalizedDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.medicoFirmanteModel.findByIdAndDelete(id).exec();
    return result !== null;
  }
}
