import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/modules/users/users.service';
import { ProveedoresSaludService } from 'src/modules/proveedores-salud/proveedores-salud.service';
import { TrabajadoresService } from 'src/modules/trabajadores/trabajadores.service';
import { ExpedienteColaboracionService } from 'src/modules/expediente-colaboracion/expediente-colaboracion.service';
import {
  DatosProveedorSaludInforme,
  EMPTY_DATOS_PROVEEDOR_SALUD_INFORME,
  ResolveProveedorInformeResult,
} from '../types/proveedor-informe.types';
import { DocumentoEstado } from 'src/modules/expedientes/enums/documento-estado.enum';

@Injectable()
export class ProveedorInformeResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly proveedoresSaludService: ProveedoresSaludService,
    private readonly trabajadoresService: TrabajadoresService,
    private readonly expedienteColaboracionService: ExpedienteColaboracionService,
  ) {}

  async resolveDatosProveedorSaludParaInforme(opts: {
    userId: string;
    trabajadorId: string;
    includeSemaforizacion?: boolean;
  }): Promise<ResolveProveedorInformeResult> {
    const { userId, trabajadorId, includeSemaforizacion = false } = opts;

    const brandingOrigenId =
      await this.expedienteColaboracionService.resolveProveedorBranding(
        trabajadorId,
      );

    let proveedorBrandingId: string | null = null;
    let delegated = false;
    let colaboracionId: string | null = null;

    if (brandingOrigenId) {
      proveedorBrandingId = brandingOrigenId;
      delegated = true;
      const colaboracion =
        await this.expedienteColaboracionService.findActivaByTrabajadorDestino(
          trabajadorId,
        );
      colaboracionId = colaboracion ? String(colaboracion._id) : null;
    } else {
      const usuario = await this.usersService.findById(userId);
      proveedorBrandingId = usuario?.idProveedorSalud
        ? String(usuario.idProveedorSalud)
        : null;
    }

    if (!proveedorBrandingId) {
      return {
        datos: { ...EMPTY_DATOS_PROVEEDOR_SALUD_INFORME },
        delegated,
        proveedorBrandingId: null,
        colaboracionId,
      };
    }

    const proveedorSalud =
      await this.proveedoresSaludService.findOne(proveedorBrandingId);

    const datos = proveedorSalud
      ? this.mapProveedorToInformeDto(
          proveedorSalud as unknown as Record<string, unknown>,
          includeSemaforizacion,
        )
      : { ...EMPTY_DATOS_PROVEEDOR_SALUD_INFORME };

    return {
      datos,
      delegated,
      proveedorBrandingId,
      colaboracionId,
    };
  }

  resolveFirmanteUserIdFromDocument(
    document: {
      estado?: DocumentoEstado;
      createdBy?: { _id?: unknown } | unknown;
      finalizadoPor?: { _id?: unknown } | unknown;
    },
    fallbackUserId: string,
  ): string {
    const createdById = this.extractUserId(document.createdBy) ?? fallbackUserId;
    const finalizadoPorId =
      this.extractUserId(document.finalizadoPor) ?? fallbackUserId;

    if (document.estado === DocumentoEstado.BORRADOR) {
      return createdById;
    }

    if (
      document.estado === DocumentoEstado.FINALIZADO ||
      document.estado === DocumentoEstado.ANULADO
    ) {
      return finalizadoPorId;
    }

    return fallbackUserId;
  }

  private extractUserId(value: unknown): string | null {
    if (!value) {
      return null;
    }
    if (typeof value === 'object' && value !== null && '_id' in value) {
      const id = (value as { _id?: unknown })._id;
      return id ? String(id) : null;
    }
    return String(value);
  }

  private mapProveedorToInformeDto(
    proveedorSalud: Record<string, unknown>,
    includeSemaforizacion: boolean,
  ): DatosProveedorSaludInforme {
    const datos: DatosProveedorSaludInforme = {
      nombre: (proveedorSalud.nombre as string) || '',
      pais: (proveedorSalud.pais as string) || '',
      perfilProveedorSalud:
        (proveedorSalud.perfilProveedorSalud as string) || '',
      logotipoEmpresa:
        (proveedorSalud.logotipoEmpresa as {
          data: string;
          contentType: string;
        }) || null,
      estado: (proveedorSalud.estado as string) || '',
      municipio: (proveedorSalud.municipio as string) || '',
      codigoPostal: (proveedorSalud.codigoPostal as string) || '',
      direccion: (proveedorSalud.direccion as string) || '',
      telefono: (proveedorSalud.telefono as string) || '',
      correoElectronico: (proveedorSalud.correoElectronico as string) || '',
      sitioWeb: (proveedorSalud.sitioWeb as string) || '',
      colorInforme: (proveedorSalud.colorInforme as string) || '#343A40',
    };

    if (includeSemaforizacion) {
      datos.semaforizacionActivada =
        (proveedorSalud.semaforizacionActivada as boolean) || false;
    }

    return datos;
  }
}
