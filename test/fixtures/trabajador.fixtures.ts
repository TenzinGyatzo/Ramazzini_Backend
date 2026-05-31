/**
 * Trabajador Test Fixtures
 *
 * Sample data for testing Trabajador entity with NOM-024 compliance.
 */

import { Types } from 'mongoose';

/**
 * Valid MX Trabajador with all NOM-024 fields
 */
export const validMXTrabajador = {
  _id: new Types.ObjectId(),
  nombre: 'JUAN',
  primerApellido: 'PEREZ',
  segundoApellido: 'GONZALEZ',
  curp: 'PEGJ850102HDFRNN08',
  sexo: 'Masculino',
  fechaNacimiento: new Date('1985-01-02'),
  rfc: 'PEGJ850102XXX',
  nss: '12345678901',
  // NOM-024 fields (Task 4)
  entidadNacimiento: '09', // CDMX
  paisNacimiento: 142,
  // Address
  calle: 'INSURGENTES SUR',
  numero: '1234',
  colonia: 'DEL VALLE',
  codigoPostal: '03100',
  entidadResidencia: '09',
  municipioResidencia: '014',
  idCentroTrabajo: new Types.ObjectId().toString(),
};

/**
 * Valid non-MX Trabajador (US provider)
 */
export const validNonMXTrabajador = {
  _id: new Types.ObjectId(),
  nombre: 'John',
  primerApellido: 'Smith',
  segundoApellido: '',
  sexo: 'Masculino',
  fechaNacimiento: new Date('1990-05-15'),
  idCentroTrabajo: new Types.ObjectId().toString(),
};

/**
 * Trabajador with name abbreviations (should fail MX validation)
 */
export const trabajadorWithAbbreviations = {
  _id: new Types.ObjectId(),
  nombre: 'DR. JUAN',
  primerApellido: 'PEREZ SR.',
  segundoApellido: 'GONZALEZ',
  curp: 'PEGJ850102HDFRNN08',
  sexo: 'Masculino',
  fechaNacimiento: new Date('1985-01-02'),
  idCentroTrabajo: new Types.ObjectId().toString(),
};

/**
 * Trabajador with invalid CURP format
 */
export const trabajadorInvalidCURP = {
  _id: new Types.ObjectId(),
  nombre: 'JUAN',
  primerApellido: 'PEREZ',
  segundoApellido: 'GONZALEZ',
  curp: 'INVALID_CURP',
  sexo: 'Masculino',
  fechaNacimiento: new Date('1985-01-02'),
  idCentroTrabajo: new Types.ObjectId().toString(),
};

/**
 * Trabajador for vital signs testing (age 35)
 */
export const trabajadorAge35 = {
  _id: new Types.ObjectId(),
  nombre: 'MARIA',
  primerApellido: 'LOPEZ',
  segundoApellido: 'GARCIA',
  curp: 'LOGM890315MDFRPR05',
  sexo: 'Femenino',
  fechaNacimiento: new Date('1989-03-15'),
  idCentroTrabajo: new Types.ObjectId().toString(),
};

/**
 * Trabajador for geriatrics testing (age 65)
 */
export const trabajadorAge65 = {
  _id: new Types.ObjectId(),
  nombre: 'ROBERTO',
  primerApellido: 'MARTINEZ',
  segundoApellido: 'SANCHEZ',
  curp: 'MASR590820HDFRNB01',
  sexo: 'Masculino',
  fechaNacimiento: new Date('1959-08-20'),
  idCentroTrabajo: new Types.ObjectId().toString(),
};

/**
 * Trabajador for pediatric testing (age 8)
 */
export const trabajadorAge8 = {
  _id: new Types.ObjectId(),
  nombre: 'SOFIA',
  primerApellido: 'HERNANDEZ',
  segundoApellido: 'RAMIREZ',
  curp: 'HERS160512MDFRMF03',
  sexo: 'Femenino',
  fechaNacimiento: new Date('2016-05-12'),
  idCentroTrabajo: new Types.ObjectId().toString(),
};
