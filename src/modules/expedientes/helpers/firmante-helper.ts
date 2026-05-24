/**
 * Helper functions for retrieving firmante information
 * NOM-024 GIIS-B015: Helper to get tipoPersonalId from user and prestador data for CEX.
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../../modules/users/schemas/user.schema';
import { MedicoFirmante } from '../../../modules/medicos-firmantes/schemas/medico-firmante.schema';
import { EnfermeraFirmante } from '../../../modules/enfermeras-firmantes/schemas/enfermera-firmante.schema';
import { TecnicoFirmante } from '../../../modules/tecnicos-firmantes/schemas/tecnico-firmante.schema';
import { CexCatalogResolver } from '../../catalogs/cex-catalog.resolver';
import { CexTipoPersonalRole } from '../../catalogs/config/cex-catalog-descriptions';

export interface PrestadorDataForCex {
  curp?: string;
  nombre: string;
  tipoPersonal: number;
  servicioAtencion: number;
  paisNacimiento?: number;
}

@Injectable()
export class FirmanteHelper {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel('MedicoFirmante')
    private medicoFirmanteModel: Model<MedicoFirmante>,
    @InjectModel('EnfermeraFirmante')
    private enfermeraFirmanteModel: Model<EnfermeraFirmante>,
    @InjectModel('TecnicoFirmante')
    private tecnicoFirmanteModel: Model<TecnicoFirmante>,
    private readonly cexCatalogResolver: CexCatalogResolver,
  ) {}

  private resolveTipoPersonalRole(
    especialistaSaludTrabajo?: string,
  ): CexTipoPersonalRole {
    return especialistaSaludTrabajo === 'Si'
      ? 'medicoEspecialista'
      : 'medicoGeneral';
  }

  private buildPrestadorData(
    firmante: {
      curp?: string;
      nombre?: string;
      paisNacimiento?: number;
    },
    role: CexTipoPersonalRole,
  ): PrestadorDataForCex {
    return {
      curp: firmante.curp,
      nombre: firmante.nombre ?? '',
      tipoPersonal: this.cexCatalogResolver.getTipoPersonalForRole(role),
      servicioAtencion: this.cexCatalogResolver.getServicioAtencionCex(),
      paisNacimiento: firmante.paisNacimiento,
    };
  }

  /**
   * Gets tipoPersonalId from user using discriminators (optimized lookup)
   * @param userId - User ID
   * @returns tipoPersonalId (number) or null if not found
   */
  async getTipoPersonalFromUser(userId: string): Promise<number | null> {
    try {
      const user = await this.userModel.findById(userId).lean();

      if (!user) {
        return null;
      }

      if (user.firmanteTipo && user.firmanteId) {
        return await this.getTipoPersonalFromFirmante(
          user.firmanteTipo,
          user.firmanteId.toString(),
        );
      }

      const [medico, enfermera, tecnico] = await Promise.all([
        this.medicoFirmanteModel.findOne({ idUser: userId }).lean(),
        this.enfermeraFirmanteModel.findOne({ idUser: userId }).lean(),
        this.tecnicoFirmanteModel.findOne({ idUser: userId }).lean(),
      ]);

      if (medico) {
        return this.cexCatalogResolver.getTipoPersonalForRole(
          this.resolveTipoPersonalRole(medico.especialistaSaludTrabajo),
        );
      }
      if (enfermera) {
        return (
          enfermera.tipoPersonalId ??
          this.cexCatalogResolver.getTipoPersonalForRole('enfermera')
        );
      }
      if (tecnico) {
        return tecnico.tipoPersonalId || null;
      }

      return null;
    } catch (error) {
      console.error('Error getting tipoPersonal from user:', error);
      return null;
    }
  }

  private async getTipoPersonalFromFirmante(
    firmanteTipo: string,
    firmanteId: string,
  ): Promise<number | null> {
    try {
      switch (firmanteTipo) {
        case 'MedicoFirmante': {
          const firmante = await this.medicoFirmanteModel
            .findById(firmanteId)
            .lean();
          if (!firmante) return null;
          return this.cexCatalogResolver.getTipoPersonalForRole(
            this.resolveTipoPersonalRole(firmante.especialistaSaludTrabajo),
          );
        }
        case 'EnfermeraFirmante': {
          const firmante = await this.enfermeraFirmanteModel
            .findById(firmanteId)
            .lean();
          return (
            firmante?.tipoPersonalId ??
            this.cexCatalogResolver.getTipoPersonalForRole('enfermera')
          );
        }
        case 'TecnicoFirmante': {
          const firmante = await this.tecnicoFirmanteModel
            .findById(firmanteId)
            .lean();
          return firmante?.tipoPersonalId ?? null;
        }
        default:
          return null;
      }
    } catch (error) {
      console.error('Error getting tipoPersonal from firmante:', error);
      return null;
    }
  }

  /**
   * Gets prestador data (curp, nombre, tipoPersonal, servicioAtencion) for CEX from user.
   * Only MedicoFirmante and EnfermeraFirmante are considered; TecnicoFirmante returns null.
   */
  async getPrestadorDataFromUser(
    userId: string,
  ): Promise<PrestadorDataForCex | null> {
    try {
      const user = await this.userModel.findById(userId).lean();
      if (!user) return null;

      if (user.firmanteTipo && user.firmanteId) {
        return this.getPrestadorDataFromFirmante(
          user.firmanteTipo,
          user.firmanteId.toString(),
        );
      }

      const [medico, enfermera] = await Promise.all([
        this.medicoFirmanteModel.findOne({ idUser: userId }).lean(),
        this.enfermeraFirmanteModel.findOne({ idUser: userId }).lean(),
      ]);
      if (medico) {
        return this.buildPrestadorData(
          medico as any,
          this.resolveTipoPersonalRole((medico as any).especialistaSaludTrabajo),
        );
      }
      if (enfermera) {
        return this.buildPrestadorData(enfermera as any, 'enfermera');
      }
      return null;
    } catch (error) {
      console.error('Error getting prestador data from user:', error);
      return null;
    }
  }

  private async getPrestadorDataFromFirmante(
    firmanteTipo: string,
    firmanteId: string,
  ): Promise<PrestadorDataForCex | null> {
    try {
      if (firmanteTipo === 'TecnicoFirmante') return null;

      if (firmanteTipo === 'MedicoFirmante') {
        const firmante = await this.medicoFirmanteModel
          .findById(firmanteId)
          .lean();
        if (!firmante) return null;
        return this.buildPrestadorData(
          firmante as any,
          this.resolveTipoPersonalRole((firmante as any).especialistaSaludTrabajo),
        );
      }

      if (firmanteTipo === 'EnfermeraFirmante') {
        const firmante = await this.enfermeraFirmanteModel
          .findById(firmanteId)
          .lean();
        if (!firmante) return null;
        return this.buildPrestadorData(firmante as any, 'enfermera');
      }

      return null;
    } catch (error) {
      console.error('Error getting prestador data from firmante:', error);
      return null;
    }
  }
}
