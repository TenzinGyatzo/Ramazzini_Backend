import {
  firmanteTieneLineaNombre,
  resolverFirmanteActivo,
  resolverFirmanteMedicoEnfermera,
} from './firmante-informe.helpers';
import {
  EnfermeraFirmanteInforme,
  MedicoFirmanteInforme,
  TecnicoFirmanteInforme,
} from '../types/firmante-informe.types';

const medicoBase: MedicoFirmanteInforme = {
  nombre: 'Juan',
  primerApellido: 'Pérez',
  tituloProfesional: 'Dr.',
  numeroCedulaProfesional: '123',
  especialistaSaludTrabajo: 'No',
  numeroCedulaEspecialista: '',
  nombreCredencialAdicional: '',
  numeroCredencialAdicional: '',
  firma: null,
};

const enfermeraBase: EnfermeraFirmanteInforme = {
  nombre: 'María',
  sexo: 'Femenino',
  tituloProfesional: 'Enf.',
  numeroCedulaProfesional: '456',
  nombreCredencialAdicional: '',
  numeroCredencialAdicional: '',
  firma: null,
};

const tecnicoBase: TecnicoFirmanteInforme = {
  nombre: 'Pedro',
  sexo: 'Masculino',
  tituloProfesional: 'Téc.',
  numeroCedulaProfesional: '789',
  nombreCredencialAdicional: '',
  numeroCredencialAdicional: '',
  firma: null,
};

describe('resolverFirmanteActivo', () => {
  it('prioriza médico cuando tiene nombre', () => {
    const result = resolverFirmanteActivo(medicoBase, enfermeraBase, tecnicoBase);
    expect(result.usarMedico).toBe(true);
    expect(result.usarEnfermera).toBe(false);
    expect(result.usarTecnico).toBe(false);
    expect(result.firmanteActivo).toBe(medicoBase);
  });

  it('usa enfermera cuando médico no tiene nombre', () => {
    const result = resolverFirmanteActivo(
      { ...medicoBase, nombre: '' },
      enfermeraBase,
      tecnicoBase,
    );
    expect(result.usarMedico).toBe(false);
    expect(result.usarEnfermera).toBe(true);
    expect(result.firmanteActivo).toBe(enfermeraBase);
  });

  it('usa técnico cuando médico y enfermera no tienen nombre', () => {
    const result = resolverFirmanteActivo(
      { ...medicoBase, nombre: '' },
      { ...enfermeraBase, nombre: '' },
      tecnicoBase,
    );
    expect(result.usarTecnico).toBe(true);
    expect(result.firmanteActivo).toBe(tecnicoBase);
  });

  it('devuelve null cuando ningún firmante tiene nombre', () => {
    const result = resolverFirmanteActivo(
      { ...medicoBase, nombre: '' },
      { ...enfermeraBase, nombre: '' },
      { ...tecnicoBase, nombre: '' },
    );
    expect(result.firmanteActivo).toBeNull();
  });

  it('acepta registro legacy con nombre completo en nombre', () => {
    const legacy = { ...medicoBase, nombre: 'Juan Pérez Galeana', primerApellido: '' };
    const result = resolverFirmanteActivo(legacy, enfermeraBase, tecnicoBase);
    expect(result.usarMedico).toBe(true);
    expect(result.firmanteActivo).toBe(legacy);
  });
});

describe('resolverFirmanteMedicoEnfermera', () => {
  it('prioriza médico sobre enfermera', () => {
    const result = resolverFirmanteMedicoEnfermera(medicoBase, enfermeraBase);
    expect(result.usarMedico).toBe(true);
    expect(result.firmanteActivo).toBe(medicoBase);
  });

  it('usa enfermera si médico no tiene nombre', () => {
    const result = resolverFirmanteMedicoEnfermera(
      { ...medicoBase, nombre: '' },
      enfermeraBase,
    );
    expect(result.usarEnfermera).toBe(true);
    expect(result.firmanteActivo).toBe(enfermeraBase);
  });
});

describe('firmanteTieneLineaNombre', () => {
  it('devuelve true cuando hay título y nombre', () => {
    expect(firmanteTieneLineaNombre(medicoBase)).toBe(true);
  });

  it('devuelve false cuando falta nombre', () => {
    expect(firmanteTieneLineaNombre({ ...medicoBase, nombre: '' })).toBe(false);
  });

  it('devuelve false cuando firmante es null', () => {
    expect(firmanteTieneLineaNombre(null)).toBe(false);
  });
});
