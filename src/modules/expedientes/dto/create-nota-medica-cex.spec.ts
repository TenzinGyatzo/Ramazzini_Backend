import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateNotaMedicaDto } from './create-nota-medica.dto';

function baseDto(overrides: Record<string, unknown> = {}) {
  return plainToInstance(CreateNotaMedicaDto, {
    tipoNota: 'Inicial',
    fechaNotaMedica: new Date('2024-01-15'),
    motivoConsulta: 'Control',
    idTrabajador: '507f1f77bcf86cd799439011',
    rutaPDF: '/tmp/x.pdf',
    createdBy: '507f1f77bcf86cd799439011',
    updatedBy: '507f1f77bcf86cd799439011',
    ...overrides,
  });
}

describe('CreateNotaMedicaDto CEX quantities', () => {
  it('acepta sentinels y valores CEX amplios', async () => {
    const dto = baseDto({
      tensionArterialSistolica: 0,
      tensionArterialDiastolica: 0,
      frecuenciaCardiaca: 0,
      saturacionOxigeno: 65,
      frecuenciaRespiratoria: 70,
      peso: 999,
      talla: 999,
      circunferenciaCintura: 0,
      glucemia: 0,
      tipoMedicion: -1,
      resultadoObtenidoaTravesde: -1,
    });
    const errors = await validate(dto);
    const qtyErrors = errors.filter((e) =>
      [
        'tensionArterialSistolica',
        'saturacionOxigeno',
        'frecuenciaRespiratoria',
        'peso',
        'glucemia',
        'tipoMedicion',
      ].includes(e.property),
    );
    expect(qtyErrors).toHaveLength(0);
    // class-level TA constraint
    expect(errors.every((e) => !String(e.constraints).includes('sistólica'))).toBe(
      true,
    );
  });

  it('rechaza TA inconsistente y glucemia sin condicionales', async () => {
    const dtoBadTa = baseDto({
      tensionArterialSistolica: 80,
      tensionArterialDiastolica: 90,
    });
    const errTa = await validate(dtoBadTa);
    expect(errTa.length).toBeGreaterThan(0);

    const dtoBadGlu = baseDto({
      glucemia: 100,
      tipoMedicion: -1,
      resultadoObtenidoaTravesde: 1,
    });
    const errGlu = await validate(dtoBadGlu);
    expect(errGlu.some((e) => e.property === 'tipoMedicion')).toBe(true);
  });
});
