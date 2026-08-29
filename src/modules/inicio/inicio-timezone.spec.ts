import {
  DEFAULT_INICIO_TIMEZONE,
  getInicioDateKey,
  getInicioDayBounds,
  isValidIanaTimezone,
  resolveInicioTimezone,
} from './inicio-timezone';

describe('inicio-timezone', () => {
  it('acepta IANA válidos y rechaza inválidos', () => {
    expect(isValidIanaTimezone('America/Mexico_City')).toBe(true);
    expect(isValidIanaTimezone('America/Guatemala')).toBe(true);
    expect(isValidIanaTimezone('Not/AZone')).toBe(false);
    expect(isValidIanaTimezone('')).toBe(false);
  });

  it('usa timezone legacy del proveedor cuando es IANA válido', () => {
    expect(
      resolveInicioTimezone({ timezone: 'America/Mazatlan', pais: 'MX' }),
    ).toBe('America/Mazatlan');
  });

  it('mapea MX a America/Mexico_City y GT a America/Guatemala', () => {
    expect(resolveInicioTimezone({ pais: 'MX' })).toBe('America/Mexico_City');
    expect(resolveInicioTimezone({ pais: 'gt' })).toBe('America/Guatemala');
  });

  it('ignora timezone inválido y usa el país', () => {
    expect(
      resolveInicioTimezone({ timezone: 'Invalid/Zone', pais: 'GT' }),
    ).toBe('America/Guatemala');
  });

  it('usa fallback America/Mexico_City si no hay país conocido', () => {
    expect(resolveInicioTimezone(null)).toBe(DEFAULT_INICIO_TIMEZONE);
    expect(resolveInicioTimezone({ pais: 'CO' })).toBe(DEFAULT_INICIO_TIMEZONE);
  });

  it('corta el día de México y Guatemala de forma distinta alrededor de medianoche UTC', () => {
    // 2024-03-16 05:30 UTC = 23:30 del 15 en Mexico_City (UTC-6) y Guatemala (UTC-6)
    const beforeMidnight = new Date('2024-03-16T05:30:00.000Z');
    expect(getInicioDateKey('America/Mexico_City', beforeMidnight)).toBe(
      '2024-03-15',
    );
    expect(getInicioDateKey('America/Guatemala', beforeMidnight)).toBe(
      '2024-03-15',
    );

    // 06:30 UTC = 00:30 del 16 en MX/GT
    const afterMidnight = new Date('2024-03-16T06:30:00.000Z');
    expect(getInicioDateKey('America/Mexico_City', afterMidnight)).toBe(
      '2024-03-16',
    );
    expect(getInicioDateKey('America/Guatemala', afterMidnight)).toBe(
      '2024-03-16',
    );
  });

  it('la ventana [start, end) cubre exactamente el dateKey local', () => {
    const reference = new Date('2024-03-16T18:00:00.000Z');
    const { start, end, dateKey } = getInicioDayBounds(
      'America/Mexico_City',
      reference,
    );

    expect(dateKey).toBe('2024-03-16');
    expect(getInicioDateKey('America/Mexico_City', start)).toBe('2024-03-16');
    expect(end.getTime()).toBeGreaterThan(start.getTime());
    expect(getInicioDateKey('America/Mexico_City', new Date(end.getTime() - 1))).toBe(
      '2024-03-16',
    );
    expect(getInicioDateKey('America/Mexico_City', end)).toBe('2024-03-17');
  });
});
