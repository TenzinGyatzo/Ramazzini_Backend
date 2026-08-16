import { FichaSnapshotService } from './ficha-snapshot.service';

describe('FichaSnapshotService', () => {
  const trabajadoresService = {
    resolveEmpresaIdForInforme: jest.fn(),
    findOne: jest.fn(),
  };
  const empresasService = { findOne: jest.fn() };
  const medicosFirmantesService = { findOneByUserId: jest.fn() };
  const enfermerasFirmantesService = { findOneByUserId: jest.fn() };
  const tecnicosFirmantesService = { findOneByUserId: jest.fn() };

  let service: FichaSnapshotService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FichaSnapshotService(
      trabajadoresService as never,
      empresasService as never,
      medicosFirmantesService as never,
      enfermerasFirmantesService as never,
      tecnicosFirmantesService as never,
    );
  });

  const trabajador = {
    nombre: 'Ana',
    primerApellido: 'Lopez',
    segundoApellido: 'Ruiz',
    puesto: 'Operador',
    escolaridad: 'Secundaria',
    sexo: 'Femenino',
    estadoCivil: 'Soltero/a',
    telefono: '5551234567',
    numeroEmpleado: '100',
    nss: '12345678901',
    curp: 'LORA900101MDFPZN01',
    fechaNacimiento: new Date('1990-01-01'),
    fechaIngreso: new Date('2020-01-15'),
    contactoEmergenciaNombre: 'Pedro',
    contactoEmergenciaTelefono: '5550000000',
  };

  it('mapea trabajador, empresa y elaborador médico', async () => {
    trabajadoresService.resolveEmpresaIdForInforme.mockResolvedValue({
      empresaId: 'emp1',
      canonicalTrabajadorId: 'trab1',
    });
    trabajadoresService.findOne.mockResolvedValue(trabajador);
    empresasService.findOne.mockResolvedValue({
      nombreComercial: 'Acme Industrial',
    });
    medicosFirmantesService.findOneByUserId.mockResolvedValue({
      nombre: 'Juan',
      primerApellido: 'Perez',
      tituloProfesional: 'Dr.',
      numeroCedulaProfesional: '123',
      universidad: 'UNAM',
      firma: { data: 'juan.png', contentType: 'image/png' },
    });
    enfermerasFirmantesService.findOneByUserId.mockResolvedValue(null);
    tecnicosFirmantesService.findOneByUserId.mockResolvedValue(null);

    const snap = await service.capturar({
      trabajadorId: 'trab1',
      creadorId: 'user-medico',
    });

    expect(snap.trabajador.puesto).toBe('Operador');
    expect(snap.trabajador.nombre).toBe('Ana');
    expect(snap.empresa.nombreComercial).toBe('Acme Industrial');
    expect(snap.firmantes.elaborador).toMatchObject({
      nombre: 'Juan',
      tipo: 'medico',
      universidad: 'UNAM',
      firma: { data: 'juan.png', contentType: 'image/png' },
    });
    expect(snap.firmantes.finalizador).toBeNull();
    expect(snap.capturadoEn).toBeInstanceOf(Date);
  });

  it('resuelve elaborador y finalizador cuando son personas distintas', async () => {
    trabajadoresService.resolveEmpresaIdForInforme.mockResolvedValue({
      empresaId: 'emp1',
      canonicalTrabajadorId: 'trab1',
    });
    trabajadoresService.findOne.mockResolvedValue(trabajador);
    empresasService.findOne.mockResolvedValue({ nombreComercial: 'Acme' });
    medicosFirmantesService.findOneByUserId.mockImplementation(async (id) => {
      if (id === 'creador') {
        return { nombre: 'Elaborador', tituloProfesional: 'Dr.' };
      }
      return null;
    });
    enfermerasFirmantesService.findOneByUserId.mockImplementation(async (id) => {
      if (id === 'finalizador') {
        return { nombre: 'Finalizadora', tituloProfesional: 'Lic.', sexo: 'Femenino' };
      }
      return null;
    });
    tecnicosFirmantesService.findOneByUserId.mockResolvedValue(null);

    const snap = await service.capturar({
      trabajadorId: 'trab1',
      creadorId: 'creador',
      finalizadorId: 'finalizador',
    });

    expect(snap.firmantes.elaborador?.tipo).toBe('medico');
    expect(snap.firmantes.elaborador?.nombre).toBe('Elaborador');
    expect(snap.firmantes.finalizador?.tipo).toBe('enfermera');
    expect(snap.firmantes.finalizador?.nombre).toBe('Finalizadora');
  });

  it('prioriza médico sobre enfermera y técnico', async () => {
    medicosFirmantesService.findOneByUserId.mockResolvedValue({
      nombre: 'Medico',
      tituloProfesional: 'Dr.',
    });
    enfermerasFirmantesService.findOneByUserId.mockResolvedValue({
      nombre: 'Enfermera',
      tituloProfesional: 'Lic.',
    });
    tecnicosFirmantesService.findOneByUserId.mockResolvedValue({
      nombre: 'Tecnico',
      tituloProfesional: 'Téc.',
    });

    const firmante = await service.obtenerDatosFirmante('user1');
    expect(firmante?.tipo).toBe('medico');
    expect(firmante?.nombre).toBe('Medico');
  });
});
