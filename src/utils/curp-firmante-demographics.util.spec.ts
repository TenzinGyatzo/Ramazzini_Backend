import { buildCurpDemographicsForFirmante } from './curp-firmante-demographics.util';
import { validateCURPCrossCheck } from './curp-validator.util';

describe('buildCurpDemographicsForFirmante', () => {
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

  it('debe devolver solo nombre en registros legacy sin primerApellido', () => {
    const result = buildCurpDemographicsForFirmante({
      nombre: 'Dr. Juan Garcia Lopez',
      fechaNacimiento: new Date('1990-05-15'),
      sexo: 'Masculino',
      entidadNacimiento: '09',
    });

    expect(result.nombre).toBe('Dr. Juan Garcia Lopez');
    expect(result.primerApellido).toBeUndefined();
    expect(result.segundoApellido).toBeUndefined();
  });

  it('debe permitir cruce CURP de firmante con campos separados', () => {
    const demographics = buildCurpDemographicsForFirmante({
      nombre: 'JUAN',
      primerApellido: 'GARCIA',
      segundoApellido: 'LOPEZ',
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

  it('debe detectar discrepancia de iniciales cuando los apellidos no coinciden', () => {
    const demographics = buildCurpDemographicsForFirmante({
      nombre: 'PEDRO',
      primerApellido: 'RODRIGUEZ',
      segundoApellido: 'MARTINEZ',
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
