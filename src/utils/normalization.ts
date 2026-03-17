import { CreateEmpresaDto } from 'src/modules/empresas/dto/create-empresa.dto';
import { UpdateEmpresaDto } from 'src/modules/empresas/dto/update-empresa.dto';
import { CreateCentrosTrabajoDto } from 'src/modules/centros-trabajo/dto/create-centros-trabajo.dto';
import { UpdateCentrosTrabajoDto } from 'src/modules/centros-trabajo/dto/update-centros-trabajo.dto';
import { CreateTrabajadorDto } from 'src/modules/trabajadores/dto/create-trabajador.dto';
import { UpdateTrabajadorDto } from 'src/modules/trabajadores/dto/update-trabajador.dto';
import { CreateProveedoresSaludDto } from 'src/modules/proveedores-salud/dto/create-proveedores-salud.dto';
import { UpdateProveedoresSaludDto } from 'src/modules/proveedores-salud/dto/update-proveedores-salud.dto';
import { CreateMedicoFirmanteDto } from 'src/modules/medicos-firmantes/dto/create-medico-firmante.dto';
import { UpdateMedicoFirmanteDto } from 'src/modules/medicos-firmantes/dto/update-medico-firmante.dto';
import { CreateEnfermeraFirmanteDto } from 'src/modules/enfermeras-firmantes/dto/create-enfermera-firmante.dto';
import { UpdateEnfermeraFirmanteDto } from 'src/modules/enfermeras-firmantes/dto/update-enfermera-firmante.dto';

export function normalizeEmpresaData(dto: CreateEmpresaDto | UpdateEmpresaDto) {
  // Normalizar RFC: eliminar espacios y convertir a mayúsculas
  // Mantener separadores (guiones, puntos, guiones bajos) para flexibilidad
  const normalizeRFC = dto.RFC
    ? dto.RFC.trim().toUpperCase().replace(/\s+/g, '')
    : undefined;

  return {
    ...dto,
    nombreComercial: dto.nombreComercial?.trim(),
    razonSocial: dto.razonSocial?.trim(),
    RFC: normalizeRFC,
    giroDeEmpresa: dto.giroDeEmpresa?.trim(),
    logotipoEmpresa: dto.logotipoEmpresa
      ? {
          data: dto.logotipoEmpresa.data.trim(),
          contentType: dto.logotipoEmpresa.contentType.trim(),
        }
      : undefined,
  };
}

export function normalizeCentroTrabajoData(
  dto: CreateCentrosTrabajoDto | UpdateCentrosTrabajoDto,
) {
  return {
    ...dto,
    nombreCentro: dto.nombreCentro?.trim(),
    direccionCentro: dto.direccionCentro?.trim(),
    codigoPostal: dto.codigoPostal?.trim(),
    estado: dto.estado?.trim(),
    municipio: dto.municipio?.trim(),
    idEmpresa: dto.idEmpresa?.trim(),
    createdBy: dto.createdBy?.trim(),
    updatedBy: dto.updatedBy?.trim(),
  };
}

export function normalizeTrabajadorData(
  dto: CreateTrabajadorDto | UpdateTrabajadorDto,
) {
  return {
    ...dto,
    // NOM-024: Names normalized to uppercase
    primerApellido: dto.primerApellido?.trim().toUpperCase(),
    segundoApellido: dto.segundoApellido?.trim().toUpperCase(),
    nombre: dto.nombre?.trim().toUpperCase(),
    fechaNacimiento: dto.fechaNacimiento,
    sexo: dto.sexo?.trim(),
    escolaridad: dto.escolaridad?.trim(),
    puesto: dto.puesto?.trim(),
    fechaIngreso: dto.fechaIngreso,
    telefono: dto.telefono?.trim(),
    estadoCivil: dto.estadoCivil?.trim(),
    numeroEmpleado: dto.numeroEmpleado?.trim(),
    nss: dto.nss?.trim(),
    curp: dto.curp?.trim(),
    estadoLaboral: dto.estadoLaboral?.trim(),
    agentesRiesgoActuales: dto.agentesRiesgoActuales?.map((agent) =>
      agent.trim(),
    ),
    idCentroTrabajo: dto.idCentroTrabajo?.trim(),
    createdBy: dto.createdBy?.trim(),
    updatedBy: dto.updatedBy?.trim(),
  };
}

export function normalizeProveedorSaludData(
  dto: CreateProveedoresSaludDto | UpdateProveedoresSaludDto,
) {
  const result: any = {};

  if ('nombre' in dto)
    result.nombre = typeof dto.nombre === 'string' ? dto.nombre.trim() : '';

  if ('pais' in dto)
    result.pais = typeof dto.pais === 'string' ? dto.pais.trim() : '';

  if ('perfilProveedorSalud' in dto)
    result.perfilProveedorSalud =
      typeof dto.perfilProveedorSalud === 'string'
        ? dto.perfilProveedorSalud.trim()
        : '';

  if ('logotipoEmpresa' in dto)
    result.logotipoEmpresa = dto.logotipoEmpresa
      ? {
          data: dto.logotipoEmpresa.data.trim(),
          contentType: dto.logotipoEmpresa.contentType.trim(),
        }
      : undefined;

  if ('estado' in dto)
    result.estado = typeof dto.estado === 'string' ? dto.estado.trim() : '';

  if ('municipio' in dto)
    result.municipio =
      typeof dto.municipio === 'string' ? dto.municipio.trim() : '';

  if ('codigoPostal' in dto)
    result.codigoPostal =
      typeof dto.codigoPostal === 'string' ? dto.codigoPostal.trim() : '';

  if ('direccion' in dto)
    result.direccion =
      typeof dto.direccion === 'string' ? dto.direccion.trim() : '';

  if ('telefono' in dto)
    result.telefono =
      typeof dto.telefono === 'string' ? dto.telefono.trim() : '';

  if ('correoElectronico' in dto)
    result.correoElectronico =
      typeof dto.correoElectronico === 'string'
        ? dto.correoElectronico.trim()
        : '';

  if ('sitioWeb' in dto)
    result.sitioWeb =
      typeof dto.sitioWeb === 'string' ? dto.sitioWeb.trim() : '';

  // CLUES opcional: si viene en el payload (incluido vacío) se actualiza/borra
  if ('clues' in dto)
    result.clues = typeof dto.clues === 'string' ? dto.clues.trim() : '';

  if ('colorInforme' in dto) {
    result.colorInforme =
      typeof dto.colorInforme === 'string'
        ? dto.colorInforme.trim()
        : '#343A40';
  }

  if ('semaforizacionActivada' in dto) {
    result.semaforizacionActivada =
      typeof dto.semaforizacionActivada === 'boolean'
        ? dto.semaforizacionActivada
        : true;
  }

  if ('fechaInicioTrial' in dto)
    result.fechaInicioTrial = new Date(dto.fechaInicioTrial);

  // if ('fechaInicioTrial' in dto)
  // result.fechaInicioTrial = dto.fechaInicioTrial;

  if ('periodoDePruebaFinalizado' in dto)
    result.periodoDePruebaFinalizado = dto.periodoDePruebaFinalizado;

  if ('maxHistoriasPermitidasAlMes' in dto)
    result.maxHistoriasPermitidasAlMes = dto.maxHistoriasPermitidasAlMes;

  if ('addOns' in dto)
    result.addOns = dto.addOns?.map((addOn) => ({
      tipo: addOn.tipo.trim(),
      cantidad: addOn.cantidad,
    }));

  if ('regimenRegulatorio' in dto) {
    const regimenNormalized =
      typeof dto.regimenRegulatorio === 'string'
        ? dto.regimenRegulatorio.trim().toUpperCase()
        : undefined;
    // Normalizar valores antiguos a nuevo formato
    if (regimenNormalized === 'NO_SUJETO_SIRES') {
      result.regimenRegulatorio = 'SIN_REGIMEN';
    } else {
      result.regimenRegulatorio = regimenNormalized;
    }
  }

  if ('declaracionAceptada' in dto) {
    result.declaracionAceptada = dto.declaracionAceptada === true;
  }

  if ('declaracionVersion' in dto) {
    result.declaracionVersion =
      typeof dto.declaracionVersion === 'string'
        ? dto.declaracionVersion.trim()
        : undefined;
  }

  return result;
}

// normalization.ts

export function normalizeMedicoFirmanteData(
  dto: CreateMedicoFirmanteDto | UpdateMedicoFirmanteDto,
) {
  const normalizedDto: any = {
    ...dto,
    nombre: typeof dto.nombre === 'string' ? dto.nombre.trim() : '',
    tituloProfesional:
      typeof dto.tituloProfesional === 'string'
        ? dto.tituloProfesional.trim()
        : '',
    universidad:
      typeof dto.universidad === 'string' ? dto.universidad.trim() : '',
    numeroCedulaProfesional:
      typeof dto.numeroCedulaProfesional === 'string'
        ? dto.numeroCedulaProfesional.trim()
        : '',
    especialistaSaludTrabajo:
      typeof dto.especialistaSaludTrabajo === 'string'
        ? dto.especialistaSaludTrabajo.trim()
        : '',
    numeroCedulaEspecialista:
      typeof dto.numeroCedulaEspecialista === 'string'
        ? dto.numeroCedulaEspecialista.trim()
        : '',
    nombreCredencialAdicional:
      typeof dto.nombreCredencialAdicional === 'string'
        ? dto.nombreCredencialAdicional.trim()
        : '',
    numeroCredencialAdicional:
      typeof dto.numeroCredencialAdicional === 'string'
        ? dto.numeroCredencialAdicional.trim()
        : '',
    firma:
      dto.firma &&
      typeof dto.firma.data === 'string' &&
      typeof dto.firma.contentType === 'string'
        ? {
            data: dto.firma.data.trim(),
            contentType: dto.firma.contentType.trim(),
          }
        : undefined,
    firmaConAntefirma:
      dto.firmaConAntefirma &&
      typeof dto.firmaConAntefirma.data === 'string' &&
      typeof dto.firmaConAntefirma.contentType === 'string'
        ? {
            data: dto.firmaConAntefirma.data.trim(),
            contentType: dto.firmaConAntefirma.contentType.trim(),
          }
        : undefined,
  };

  // NOM-024: Normalize CURP to uppercase
  if ('curp' in dto && dto.curp) {
    normalizedDto.curp = dto.curp.trim().toUpperCase();
  }

  // País de nacimiento (CATALOG_KEY de cat_pais): parsear a número si viene como string
  if ('paisNacimiento' in dto && dto.paisNacimiento != null && String(dto.paisNacimiento) !== '') {
    const val = dto.paisNacimiento;
    normalizedDto.paisNacimiento = typeof val === 'number' ? val : Number(val);
    if (Number.isNaN(normalizedDto.paisNacimiento)) delete normalizedDto.paisNacimiento;
  }

  // ✅ Verificar y eliminar idUser si está vacío
  if (!dto.idUser || dto.idUser.trim() === '') {
    delete normalizedDto.idUser;
  } else {
    normalizedDto.idUser = dto.idUser.trim();
  }

  return normalizedDto;
}

export function normalizeEnfermeraFirmanteData(
  dto: CreateEnfermeraFirmanteDto | UpdateEnfermeraFirmanteDto,
) {
  const normalizedDto: any = {
    ...dto,
    nombre: typeof dto.nombre === 'string' ? dto.nombre.trim() : '',
    sexo: typeof dto.sexo === 'string' ? dto.sexo.trim() : '',
    tituloProfesional:
      typeof dto.tituloProfesional === 'string'
        ? dto.tituloProfesional.trim()
        : '',
    numeroCedulaProfesional:
      typeof dto.numeroCedulaProfesional === 'string'
        ? dto.numeroCedulaProfesional.trim()
        : '',
    nombreCredencialAdicional:
      typeof dto.nombreCredencialAdicional === 'string'
        ? dto.nombreCredencialAdicional.trim()
        : '',
    numeroCredencialAdicional:
      typeof dto.numeroCredencialAdicional === 'string'
        ? dto.numeroCredencialAdicional.trim()
        : '',
    firma:
      dto.firma &&
      typeof dto.firma.data === 'string' &&
      typeof dto.firma.contentType === 'string'
        ? {
            data: dto.firma.data.trim(),
            contentType: dto.firma.contentType.trim(),
          }
        : undefined,
  };

  // NOM-024: Normalize CURP to uppercase
  if ('curp' in dto && dto.curp) {
    normalizedDto.curp = dto.curp.trim().toUpperCase();
  }

  // País de nacimiento (CATALOG_KEY de cat_pais): parsear a número si viene como string
  if ('paisNacimiento' in dto && dto.paisNacimiento != null && String(dto.paisNacimiento) !== '') {
    const val = dto.paisNacimiento;
    normalizedDto.paisNacimiento = typeof val === 'number' ? val : Number(val);
    if (Number.isNaN(normalizedDto.paisNacimiento)) delete normalizedDto.paisNacimiento;
  }

  // ✅ Verificar y eliminar idUser si está vacío
  if (!dto.idUser || dto.idUser.trim() === '') {
    delete normalizedDto.idUser;
  } else {
    normalizedDto.idUser = dto.idUser.trim();
  }

  return normalizedDto;
}
