import type { Content } from 'pdfmake/interfaces';
import { formatearTituloYNombreFirmante } from '../../../utils/names';
import { FooterFirmantesData } from '../interfaces/firmante-data.interface';

export function generarFooterFirmantes(
  footerData: FooterFirmantesData,
  proveedorSalud: { pais: string; regimenRegulatorio?: string },
): Content[] {
  if (!footerData.esDocumentoFinalizado) {
    const firmante = footerData.finalizador || footerData.elaborador;
    if (!firmante) return [];

    return generarTextosFirmante(firmante, proveedorSalud, false);
  }

  const textos: any[] = [];
  const regimen = proveedorSalud.regimenRegulatorio;

  if (footerData.elaborador) {
    const cedulaElab =
      footerData.elaborador.especialistaSaludTrabajo === 'Si' &&
      footerData.elaborador.numeroCedulaEspecialista
        ? proveedorSalud.pais === 'MX'
          ? `Cédula Especialidad Med. del Trab. No. ${footerData.elaborador.numeroCedulaEspecialista}`
          : `Registro de Especialidad No. ${footerData.elaborador.numeroCedulaEspecialista}`
        : footerData.elaborador.numeroCedulaProfesional
          ? proveedorSalud.pais === 'MX'
            ? footerData.elaborador.tipo === 'medico'
              ? `Cédula Profesional Médico Cirujano No. ${footerData.elaborador.numeroCedulaProfesional}`
              : `Cédula Profesional No. ${footerData.elaborador.numeroCedulaProfesional}`
            : proveedorSalud.pais === 'GT'
              ? `Colegiado Activo No. ${footerData.elaborador.numeroCedulaProfesional}`
              : `Registro Profesional No. ${footerData.elaborador.numeroCedulaProfesional}`
          : null;

    textos.push({
      text: `Elab. ${formatearTituloYNombreFirmante(footerData.elaborador, regimen)}\n`,
      bold: true,
    });

    if (cedulaElab) {
      textos.push({
        text: `${cedulaElab}\n`,
        bold: false,
      });
    }
  }

  if (footerData.finalizador) {
    const cedulaFin =
      footerData.finalizador.especialistaSaludTrabajo === 'Si' &&
      footerData.finalizador.numeroCedulaEspecialista
        ? proveedorSalud.pais === 'MX'
          ? `Cédula Especialidad Med. del Trab. No. ${footerData.finalizador.numeroCedulaEspecialista}`
          : `Registro de Especialidad No. ${footerData.finalizador.numeroCedulaEspecialista}`
        : footerData.finalizador.numeroCedulaProfesional
          ? proveedorSalud.pais === 'MX'
            ? footerData.finalizador.tipo === 'medico'
              ? `Cédula Profesional Médico Cirujano No. ${footerData.finalizador.numeroCedulaProfesional}`
              : `Cédula Profesional No. ${footerData.finalizador.numeroCedulaProfesional}`
            : proveedorSalud.pais === 'GT'
              ? `Colegiado Activo No. ${footerData.finalizador.numeroCedulaProfesional}`
              : `Registro Profesional No. ${footerData.finalizador.numeroCedulaProfesional}`
          : null;

    textos.push({
      text: `Rev./Fin. ${formatearTituloYNombreFirmante(footerData.finalizador, regimen)}\n`,
      bold: true,
    });

    if (cedulaFin) {
      textos.push({
        text: `${cedulaFin}\n`,
        bold: false,
      });
    }
  }

  return textos.filter((t) => t !== null);
}

function generarTextosFirmante(
  firmante: any,
  proveedorSalud: { pais: string; regimenRegulatorio?: string },
  esElaborador: boolean,
): Content[] {
  const textos: any[] = [];
  const prefijo = esElaborador ? 'Elab. ' : '';

  textos.push({
    text: `${prefijo}${formatearTituloYNombreFirmante(firmante, proveedorSalud.regimenRegulatorio)}\n`,
    bold: true,
  });

  if (firmante.numeroCedulaProfesional) {
    const textoCedula =
      proveedorSalud.pais === 'MX'
        ? firmante.tipo === 'medico'
          ? `Cédula Profesional Médico Cirujano No. ${firmante.numeroCedulaProfesional}`
          : `Cédula Profesional No. ${firmante.numeroCedulaProfesional}`
        : proveedorSalud.pais === 'GT'
          ? `Colegiado Activo No. ${firmante.numeroCedulaProfesional}`
          : `Registro Profesional No. ${firmante.numeroCedulaProfesional}`;

    textos.push({
      text: `${textoCedula}\n`,
      bold: false,
    });
  }

  if (
    firmante.especialistaSaludTrabajo === 'Si' &&
    firmante.numeroCedulaEspecialista
  ) {
    const textoEspecialidad =
      proveedorSalud.pais === 'MX'
        ? `Cédula Especialidad Med. del Trab. No. ${firmante.numeroCedulaEspecialista}`
        : `Registro de Especialidad No. ${firmante.numeroCedulaEspecialista}`;

    textos.push({
      text: `${textoEspecialidad}\n`,
      bold: false,
    });
  }

  if (
    firmante.nombreCredencialAdicional &&
    firmante.numeroCredencialAdicional
  ) {
    const textoCredencial = `${firmante.nombreCredencialAdicional} No. ${firmante.numeroCredencialAdicional}`;
    textos.push({
      text: `${textoCredencial.substring(0, 60)}${textoCredencial.length > 60 ? '...' : ''}\n`,
      bold: false,
    });
  }

  return textos.filter((t) => t !== null);
}
