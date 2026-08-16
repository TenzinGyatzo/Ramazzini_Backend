import { calcularEdad } from 'src/utils/dates';
import { DocumentoEstado } from 'src/modules/expedientes/enums/documento-estado.enum';
import { FichaSnapshot } from 'src/modules/expedientes/schemas/ficha-snapshot.schema';
import {
  hasFirmantesSnapshot,
  mapFirmanteSnapshotToRoles,
  pickFirmanteActivoSnapshot,
  pickNombreEmpresa,
  pickTrabajadorForInforme,
  resolveFooterFromSnapshot,
} from './ficha-snapshot-informe.helper';

const snapshotOperador: FichaSnapshot = {
  trabajador: {
    nombre: 'Ana',
    primerApellido: 'Lopez',
    segundoApellido: 'Ruiz',
    puesto: 'Operador',
    escolaridad: 'Secundaria',
    sexo: 'Femenino',
    estadoCivil: 'Soltero/a',
    telefono: '555',
    fechaNacimiento: new Date('1990-08-15'),
    fechaIngreso: new Date('2020-01-01'),
  },
  empresa: { nombreComercial: 'Acme 2024' },
  firmantes: {
    elaborador: {
      nombre: 'Juan',
      tituloProfesional: 'Dr.',
      tipo: 'medico',
      numeroCedulaProfesional: '111',
    },
    finalizador: {
      nombre: 'Maria',
      tituloProfesional: 'Dra.',
      tipo: 'medico',
      numeroCedulaProfesional: '222',
    },
  },
  capturadoEn: new Date('2024-08-15'),
};

const trabajadorLive = {
  nombre: 'Ana',
  primerApellido: 'Lopez',
  segundoApellido: 'Ruiz',
  puesto: 'Supervisor',
  escolaridad: 'Licenciatura',
  sexo: 'Femenino',
  estadoCivil: 'Casado/a',
  telefono: '999',
  fechaNacimiento: new Date('1990-08-15'),
};

describe('ficha-snapshot-informe.helper', () => {
  it('usa el puesto del snapshot y no el live', () => {
    const fuente = pickTrabajadorForInforme(snapshotOperador, trabajadorLive);
    expect(fuente.puesto).toBe('Operador');
  });

  it('sin snapshot usa el trabajador actual (documentos viejos)', () => {
    const fuente = pickTrabajadorForInforme(undefined, trabajadorLive);
    expect(fuente.puesto).toBe('Supervisor');
  });

  it('usa nombre comercial del snapshot y cae al live si no hay', () => {
    expect(pickNombreEmpresa(snapshotOperador, 'Acme Hoy')).toBe('Acme 2024');
    expect(pickNombreEmpresa(undefined, 'Acme Hoy')).toBe('Acme Hoy');
  });

  it('calcula edad con fechaNacimiento del snapshot y fecha del documento', () => {
    const fuente = pickTrabajadorForInforme(snapshotOperador, {
      ...trabajadorLive,
      fechaNacimiento: new Date('1980-01-01'),
    });
    expect(calcularEdad('1990-08-15', '2024-08-15')).toBe(34);
    expect(
      calcularEdad(
        (fuente as FichaSnapshot['trabajador']).fechaNacimiento
          ? '1990-08-15'
          : '1980-01-01',
        '2024-08-15',
      ),
    ).toBe(34);
  });

  it('mapea firmante snapshot médico a roles de informe', () => {
    const roles = mapFirmanteSnapshotToRoles(snapshotOperador.firmantes.elaborador);
    expect(roles.datosMedicoFirmante.nombre).toBe('Juan');
    expect(roles.datosEnfermeraFirmante.nombre).toBe('');
    expect(roles.datosTecnicoFirmante.nombre).toBe('');
  });

  it('arma footer dual al finalizar con elaborador distinto de finalizador', () => {
    const footer = resolveFooterFromSnapshot(
      snapshotOperador,
      DocumentoEstado.FINALIZADO,
    );
    expect(footer?.esDocumentoFinalizado).toBe(true);
    expect(footer?.elaborador?.nombre).toBe('Juan');
    expect(footer?.finalizador?.nombre).toBe('Maria');
  });

  it('en borrador el firmante activo es el elaborador', () => {
    const activo = pickFirmanteActivoSnapshot(
      snapshotOperador,
      DocumentoEstado.BORRADOR,
    );
    expect(activo?.nombre).toBe('Juan');
    expect(hasFirmantesSnapshot(snapshotOperador)).toBe(true);
    expect(hasFirmantesSnapshot(undefined)).toBe(false);
  });
});
