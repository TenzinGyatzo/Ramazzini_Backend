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

/** Códigos DGIS tipo personal (CEX): 2 = Médico general, 4 = Médico especialista, 6 = Enfermera */
export const TIPO_PERSONAL_CEX_MEDICO_GENERAL = 2;
export const TIPO_PERSONAL_CEX_MEDICO_ESPECIALISTA = 4;
export const TIPO_PERSONAL_CEX_ENFERMERA = 6;

export interface PrestadorDataForCex {
  curp?: string;
  nombre: string;
  tipoPersonal: number;
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
  ) {}

  /**
   * Gets tipoPersonalId from user using discriminators (optimized lookup)
   * @param userId - User ID
   * @returns tipoPersonalId (number) or null if not found
   */
  async getTipoPersonalFromUser(userId: string): Promise<number | null> {
    try {
      // 1. Obtener User con firmanteTipo/firmanteId
      const user = await this.userModel.findById(userId).lean();

      if (!user) {
        return null;
      }

      // 2. Si tiene discriminadores, usar lookup optimizado
      if (user.firmanteTipo && user.firmanteId) {
        return await this.getTipoPersonalFromFirmante(
          user.firmanteTipo,
          user.firmanteId.toString(),
        );
      }

      // 3. Fallback: buscar en los 3 modelos (compatibilidad hacia atrás)
      const [medico, enfermera, tecnico] = await Promise.all([
        this.medicoFirmanteModel.findOne({ idUser: userId }).lean(),
        this.enfermeraFirmanteModel.findOne({ idUser: userId }).lean(),
        this.tecnicoFirmanteModel.findOne({ idUser: userId }).lean(),
      ]);

      if (medico) {
        return medico.tipoPersonalId || null;
      }
      if (enfermera) {
        return enfermera.tipoPersonalId || null;
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

  /**
   * Gets tipoPersonalId from firmante by type and ID
   * @param firmanteTipo - Type of firmante ('MedicoFirmante', 'EnfermeraFirmante', 'TecnicoFirmante')
   * @param firmanteId - Firmante ID
   * @returns tipoPersonalId (number) or null if not found
   */
  private async getTipoPersonalFromFirmante(
    firmanteTipo: string,
    firmanteId: string,
  ): Promise<number | null> {
    try {
      let firmante: any = null;

      switch (firmanteTipo) {
        case 'MedicoFirmante':
          firmante = await this.medicoFirmanteModel.findById(firmanteId).lean();
          break;
        case 'EnfermeraFirmante':
          firmante = await this.enfermeraFirmanteModel
            .findById(firmanteId)
            .lean();
          break;
        case 'TecnicoFirmante':
          firmante = await this.tecnicoFirmanteModel
            .findById(firmanteId)
            .lean();
          break;
        default:
          return null;
      }

      return firmante?.tipoPersonalId || null;
    } catch (error) {
      console.error('Error getting tipoPersonal from firmante:', error);
      return null;
    }
  }

  /**
   * Gets prestador data (curp, nombre, tipoPersonal) for CEX from user.
   * Only MedicoFirmante and EnfermeraFirmante are considered; TecnicoFirmante returns null.
   * tipoPersonal: Medico con especialistaSaludTrabajo "Si" → 4, "No" o sin campo → 2; Enfermera → 6.
   * @param userId - User ID (e.g. finalizadoPor or updatedBy of NotaMedica)
   * @returns PrestadorDataForCex or null if user has no firmante or is TecnicoFirmante
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
        const tipoPersonal =
          (medico as any).especialistaSaludTrabajo === 'Si'
            ? TIPO_PERSONAL_CEX_MEDICO_ESPECIALISTA
            : TIPO_PERSONAL_CEX_MEDICO_GENERAL;
        return {
          curp: (medico as any).curp,
          nombre: (medico as any).nombre ?? '',
          tipoPersonal,
        };
      }
      if (enfermera) {
        return {
          curp: (enfermera as any).curp,
          nombre: (enfermera as any).nombre ?? '',
          tipoPersonal: TIPO_PERSONAL_CEX_ENFERMERA,
        };
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
        const tipoPersonal =
          (firmante as any).especialistaSaludTrabajo === 'Si'
            ? TIPO_PERSONAL_CEX_MEDICO_ESPECIALISTA
            : TIPO_PERSONAL_CEX_MEDICO_GENERAL;
        return {
          curp: (firmante as any).curp,
          nombre: (firmante as any).nombre ?? '',
          tipoPersonal,
        };
      }

      if (firmanteTipo === 'EnfermeraFirmante') {
        const firmante = await this.enfermeraFirmanteModel
          .findById(firmanteId)
          .lean();
        if (!firmante) return null;
        return {
          curp: (firmante as any).curp,
          nombre: (firmante as any).nombre ?? '',
          tipoPersonal: TIPO_PERSONAL_CEX_ENFERMERA,
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting prestador data from firmante:', error);
      return null;
    }
  }
}
