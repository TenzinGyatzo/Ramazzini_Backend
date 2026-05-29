import { buildFirmanteRegulatoryPayload } from './firmante-regulatory-validation.util';

describe('buildFirmanteRegulatoryPayload', () => {
  it('debe incluir apellidos para cruce CURP A1', () => {
    const payload = buildFirmanteRegulatoryPayload({
      nombre: 'JUAN',
      primerApellido: 'GARCIA',
      segundoApellido: 'LOPEZ',
      curp: 'GALJ900515HDFRPN08',
      sexo: 'Masculino',
      fechaNacimiento: new Date('1990-05-15'),
      entidadNacimiento: '09',
      paisNacimiento: 142,
    });

    expect(payload.primerApellido).toBe('GARCIA');
    expect(payload.segundoApellido).toBe('LOPEZ');
    expect(payload.nombre).toBe('JUAN');
  });
});
