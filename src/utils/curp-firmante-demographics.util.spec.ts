import { buildCurpDemographicsForFirmante } from './curp-firmante-demographics.util';
import { validateCURPCrossCheck } from './curp-validator.util';

describe('buildCurpDemographicsForFirmante', () => {
  it('debe descomponer nombre completo con parseNombreCompleto', () => {
    const result = buildCurpDemographicsForFirmante({
      nombre: 'Dr. Juan Garcia Lopez',
      fechaNacimiento: new Date('1990-05-15'),
      sexo: 'Masculino',
      entidadNacimiento: '09',
    });

    expect(result.nombre).toBe('Juan');
    expect(result.primerApellido).toBe('Garcia');
    expect(result.segundoApellido).toBe('Lopez');
  });

  it('debe respetar apellidos explícitos si ya vienen separados', () => {
    const result = buildCurpDemographicsForFirmante({
      nombre: 'JUAN',
      primerApellido: 'GARCIA',
      segundoApellido: 'LOPEZ',
    });

    expect(result.nombre).toBe('JUAN');
    expect(result.primerApellido).toBe('GARCIA');
    expect(result.segundoApellido).toBe('LOPEZ');
  });

  it('debe permitir cruce CURP de firmante con nombre completo parseado', () => {
    const demographics = buildCurpDemographicsForFirmante({
      nombre: 'Juan Garcia Lopez',
      fechaNacimiento: new Date('1990-05-15'),
      sexo: 'Masculino',
      entidadNacimiento: '09',
    });

    const crossCheck = validateCURPCrossCheck('GALJ900515HDFRPN08', {
      fechaNacimiento: demographics.fechaNacimiento!,
      sexo: demographics.sexo!,
      entidadNacimiento: demographics.entidadNacimiento,
      nombre: demographics.nombre,
      primerApellido: demographics.primerApellido,
      segundoApellido: demographics.segundoApellido,
    });

    expect(crossCheck.isValid).toBe(true);
    expect(crossCheck.discrepancies).toHaveLength(0);
  });

  it('debe detectar discrepancia de iniciales cuando el nombre parseado no coincide', () => {
    const demographics = buildCurpDemographicsForFirmante({
      nombre: 'Pedro Rodriguez Martinez',
      fechaNacimiento: new Date('1990-05-15'),
      sexo: 'Masculino',
      entidadNacimiento: '09',
    });

    const crossCheck = validateCURPCrossCheck('GALJ900515HDFRPN08', {
      fechaNacimiento: demographics.fechaNacimiento!,
      sexo: demographics.sexo!,
      entidadNacimiento: demographics.entidadNacimiento,
      nombre: demographics.nombre,
      primerApellido: demographics.primerApellido,
      segundoApellido: demographics.segundoApellido,
    });

    expect(crossCheck.isValid).toBe(false);
    expect(
      crossCheck.discrepancies.some((d) => d.field === 'iniciales'),
    ).toBe(true);
  });
});
