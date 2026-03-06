import { generateFolioFromWorkerData } from './folio-generator.util';

describe('generateFolioFromWorkerData', () => {
  it('should generate 18-character alphanumeric folio', () => {
    const folio = generateFolioFromWorkerData({
      nombre: 'Juan',
      primerApellido: 'Perez',
      segundoApellido: 'Garcia',
      fechaNacimiento: new Date('1985-01-15'),
      sexo: 'Masculino',
    });
    expect(folio).toMatch(/^[a-z0-9]{18}$/);
    expect(folio.length).toBe(18);
  });

  it('should be deterministic - same inputs produce same folio', () => {
    const data = {
      nombre: 'Maria',
      primerApellido: 'Lopez',
      segundoApellido: 'Martinez',
      fechaNacimiento: new Date('1990-05-20'),
      sexo: 'Femenino',
    };
    const folio1 = generateFolioFromWorkerData(data);
    const folio2 = generateFolioFromWorkerData(data);
    expect(folio1).toBe(folio2);
  });

  it('should produce different folios for different people', () => {
    const folio1 = generateFolioFromWorkerData({
      nombre: 'Juan',
      primerApellido: 'Perez',
      segundoApellido: 'Garcia',
      fechaNacimiento: new Date('1985-01-15'),
      sexo: 'Masculino',
    });
    const folio2 = generateFolioFromWorkerData({
      nombre: 'Maria',
      primerApellido: 'Lopez',
      segundoApellido: 'Martinez',
      fechaNacimiento: new Date('1990-05-20'),
      sexo: 'Femenino',
    });
    expect(folio1).not.toBe(folio2);
  });

  it('should normalize accents - same person with/without accents gets same folio', () => {
    const withAccents = generateFolioFromWorkerData({
      nombre: 'José',
      primerApellido: 'González',
      segundoApellido: 'Muñoz',
      fechaNacimiento: new Date('1988-03-10'),
      sexo: 'Masculino',
    });
    const withoutAccents = generateFolioFromWorkerData({
      nombre: 'JOSE',
      primerApellido: 'GONZALEZ',
      segundoApellido: 'MUNOZ',
      fechaNacimiento: new Date('1988-03-10'),
      sexo: 'Masculino',
    });
    expect(withAccents).toBe(withoutAccents);
  });

  it('should use SIN for empty segundoApellido', () => {
    const withEmpty = generateFolioFromWorkerData({
      nombre: 'Ana',
      primerApellido: 'Ruiz',
      segundoApellido: '',
      fechaNacimiento: new Date('1992-07-25'),
      sexo: 'Femenino',
    });
    const withSin = generateFolioFromWorkerData({
      nombre: 'Ana',
      primerApellido: 'Ruiz',
      segundoApellido: 'SIN',
      fechaNacimiento: new Date('1992-07-25'),
      sexo: 'Femenino',
    });
    expect(withEmpty).toBe(withSin);
  });

  it('should be case insensitive', () => {
    const upper = generateFolioFromWorkerData({
      nombre: 'PEDRO',
      primerApellido: 'SANCHEZ',
      segundoApellido: 'RAMIREZ',
      fechaNacimiento: new Date('1975-11-30'),
      sexo: 'MASCULINO',
    });
    const lower = generateFolioFromWorkerData({
      nombre: 'pedro',
      primerApellido: 'sanchez',
      segundoApellido: 'ramirez',
      fechaNacimiento: new Date('1975-11-30'),
      sexo: 'masculino',
    });
    expect(upper).toBe(lower);
  });

  it('should differ when fechaNacimiento changes', () => {
    const folio1 = generateFolioFromWorkerData({
      nombre: 'Carlos',
      primerApellido: 'Diaz',
      segundoApellido: 'Hernandez',
      fechaNacimiento: new Date('1980-01-01'),
      sexo: 'Masculino',
    });
    const folio2 = generateFolioFromWorkerData({
      nombre: 'Carlos',
      primerApellido: 'Diaz',
      segundoApellido: 'Hernandez',
      fechaNacimiento: new Date('1980-01-02'),
      sexo: 'Masculino',
    });
    expect(folio1).not.toBe(folio2);
  });

  it('should differ when sexo changes', () => {
    const folio1 = generateFolioFromWorkerData({
      nombre: 'Andrea',
      primerApellido: 'Torres',
      segundoApellido: 'Vargas',
      fechaNacimiento: new Date('1995-09-15'),
      sexo: 'Femenino',
    });
    const folio2 = generateFolioFromWorkerData({
      nombre: 'Andrea',
      primerApellido: 'Torres',
      segundoApellido: 'Vargas',
      fechaNacimiento: new Date('1995-09-15'),
      sexo: 'Masculino',
    });
    expect(folio1).not.toBe(folio2);
  });
});
