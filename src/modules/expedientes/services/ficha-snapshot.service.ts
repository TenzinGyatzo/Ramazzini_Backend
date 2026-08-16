import { Injectable } from '@nestjs/common';
import { EmpresasService } from '../../empresas/empresas.service';
import { TrabajadoresService } from '../../trabajadores/trabajadores.service';
import { MedicosFirmantesService } from '../../medicos-firmantes/medicos-firmantes.service';
import { EnfermerasFirmantesService } from '../../enfermeras-firmantes/enfermeras-firmantes.service';
import { TecnicosFirmantesService } from '../../tecnicos-firmantes/tecnicos-firmantes.service';
import {
  FichaSnapshot,
  FirmanteSnapshot,
} from '../schemas/ficha-snapshot.schema';

export interface CapturarFichaSnapshotArgs {
  trabajadorId: string;
  creadorId?: string | null;
  finalizadorId?: string | null;
}

@Injectable()
export class FichaSnapshotService {
  constructor(
    private readonly trabajadoresService: TrabajadoresService,
    private readonly empresasService: EmpresasService,
    private readonly medicosFirmantesService: MedicosFirmantesService,
    private readonly enfermerasFirmantesService: EnfermerasFirmantesService,
    private readonly tecnicosFirmantesService: TecnicosFirmantesService,
  ) {}

  async capturar(args: CapturarFichaSnapshotArgs): Promise<FichaSnapshot> {
    const trabajadorId = String(args.trabajadorId || '');
    if (!trabajadorId) {
      throw new Error('trabajadorId es requerido para capturar fichaSnapshot');
    }

    const { empresaId, canonicalTrabajadorId } =
      await this.trabajadoresService.resolveEmpresaIdForInforme(trabajadorId);

    const [trabajador, empresa] = await Promise.all([
      this.trabajadoresService.findOne(canonicalTrabajadorId, {
        includeRiesgos: false,
      }),
      this.empresasService.findOne(empresaId),
    ]);

    if (!trabajador || trabajador.fused) {
      throw new Error('Trabajador no encontrado para fichaSnapshot');
    }

    const creadorId = args.creadorId ? String(args.creadorId) : '';
    const finalizadorId = args.finalizadorId ? String(args.finalizadorId) : '';

    const firmanteIds = [...new Set([creadorId, finalizadorId].filter(Boolean))];
    const firmantesById = new Map<string, FirmanteSnapshot | null>();
    await Promise.all(
      firmanteIds.map(async (userId) => {
        firmantesById.set(userId, await this.obtenerDatosFirmante(userId));
      }),
    );

    return {
      trabajador: {
        nombre: trabajador.nombre || '',
        primerApellido: trabajador.primerApellido || '',
        segundoApellido: trabajador.segundoApellido || '',
        puesto: trabajador.puesto || '',
        escolaridad: trabajador.escolaridad || '',
        sexo: trabajador.sexo || '',
        estadoCivil: trabajador.estadoCivil || '',
        telefono: trabajador.telefono || '',
        numeroEmpleado: trabajador.numeroEmpleado,
        nss: trabajador.nss,
        curp: trabajador.curp,
        fechaNacimiento: trabajador.fechaNacimiento,
        fechaIngreso: trabajador.fechaIngreso ?? null,
        contactoEmergenciaNombre: trabajador.contactoEmergenciaNombre ?? '',
        contactoEmergenciaTelefono: trabajador.contactoEmergenciaTelefono ?? '',
      },
      empresa: {
        nombreComercial: empresa?.nombreComercial || '',
      },
      firmantes: {
        elaborador: creadorId ? (firmantesById.get(creadorId) ?? null) : null,
        finalizador: finalizadorId
          ? (firmantesById.get(finalizadorId) ?? null)
          : null,
      },
      capturadoEn: new Date(),
    };
  }

  async obtenerDatosFirmante(
    userId: string,
  ): Promise<FirmanteSnapshot | null> {
    if (!userId) {
      return null;
    }

    const medicoPromise = this.medicosFirmantesService.findOneByUserId(userId);
    const enfermeraPromise =
      this.enfermerasFirmantesService.findOneByUserId(userId);
    const tecnicoPromise = this.tecnicosFirmantesService.findOneByUserId(userId);

    const medico = await medicoPromise;
    if (medico?.nombre) {
      return {
        nombre: medico.nombre || '',
        primerApellido: medico.primerApellido || '',
        segundoApellido: medico.segundoApellido || '',
        tituloProfesional: medico.tituloProfesional || '',
        numeroCedulaProfesional: medico.numeroCedulaProfesional || '',
        especialistaSaludTrabajo: medico.especialistaSaludTrabajo || '',
        numeroCedulaEspecialista: medico.numeroCedulaEspecialista || '',
        nombreCredencialAdicional: medico.nombreCredencialAdicional || '',
        numeroCredencialAdicional: medico.numeroCredencialAdicional || '',
        nombreCredencialAdicional2: medico.nombreCredencialAdicional2 || '',
        numeroCredencialAdicional2: medico.numeroCredencialAdicional2 || '',
        universidad: medico.universidad || '',
        firma: (medico.firma as { data: string; contentType: string }) || null,
        tipo: 'medico',
      };
    }

    const enfermera = await enfermeraPromise;
    if (enfermera?.nombre) {
      return {
        nombre: enfermera.nombre || '',
        primerApellido: enfermera.primerApellido || '',
        segundoApellido: enfermera.segundoApellido || '',
        tituloProfesional: enfermera.tituloProfesional || '',
        numeroCedulaProfesional: enfermera.numeroCedulaProfesional || '',
        nombreCredencialAdicional: enfermera.nombreCredencialAdicional || '',
        numeroCredencialAdicional: enfermera.numeroCredencialAdicional || '',
        firma:
          (enfermera.firma as { data: string; contentType: string }) || null,
        sexo: enfermera.sexo || '',
        sexoCURP: enfermera.sexoCURP,
        tipo: 'enfermera',
      };
    }

    const tecnico = await tecnicoPromise;
    if (tecnico?.nombre) {
      return {
        nombre: tecnico.nombre || '',
        primerApellido: tecnico.primerApellido || '',
        segundoApellido: tecnico.segundoApellido || '',
        tituloProfesional: tecnico.tituloProfesional || '',
        numeroCedulaProfesional: tecnico.numeroCedulaProfesional || '',
        nombreCredencialAdicional: tecnico.nombreCredencialAdicional || '',
        numeroCredencialAdicional: tecnico.numeroCredencialAdicional || '',
        firma: (tecnico.firma as { data: string; contentType: string }) || null,
        sexo: tecnico.sexo || '',
        sexoCURP: tecnico.sexoCURP,
        tipo: 'tecnico',
      };
    }

    return null;
  }
}
