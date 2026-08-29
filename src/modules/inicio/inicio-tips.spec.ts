import { INICIO_TIPS, selectInicioTip } from './inicio-tips';

describe('inicio-tips', () => {
  const excluded = [
    'organizar-clientes',
    'historial-expediente',
    'sires-borradores-72h',
    'sires-inmutabilidad',
  ];

  it('omite consejos obvios o no implementados', () => {
    const ids = INICIO_TIPS.map((tip) => tip.id);
    for (const id of excluded) {
      expect(ids).not.toContain(id);
    }
  });

  it('filtra consejos SIRES y omite inmutabilidad en SIN_REGIMEN', () => {
    const siresIds = INICIO_TIPS.filter((tip) =>
      tip.regimens.includes('SIRES_NOM024'),
    ).map((tip) => tip.id);
    const sinIds = INICIO_TIPS.filter((tip) =>
      tip.regimens.includes('SIN_REGIMEN'),
    ).map((tip) => tip.id);

    expect(siresIds).toContain('sires-nota-aclaratoria');
    expect(siresIds).toContain('anular-trazabilidad');
    expect(sinIds).not.toContain('sires-nota-aclaratoria');
    expect(sinIds).not.toContain('sires-borradores-72h');
  });

  it('no ofrece asignar-centros si el rol no es Principal', () => {
    const medico = selectInicioTip({
      userId: 'user-1',
      dateKey: '2026-08-28',
      regimen: 'SIN_REGIMEN',
      role: 'Médico',
    });
    const principal = selectInicioTip({
      userId: 'user-1',
      dateKey: '2026-08-28',
      regimen: 'SIN_REGIMEN',
      role: 'Principal',
    });
    expect(medico?.id).not.toBe('asignar-centros');
    expect(INICIO_TIPS.find((tip) => tip.id === 'asignar-centros')?.roles).toEqual(
      ['Principal'],
    );
    expect(principal).not.toBeNull();
  });

  it('prioriza audiometría si hay ese tipo reciente', () => {
    const tip = selectInicioTip({
      userId: 'user-1',
      dateKey: '2026-08-28',
      regimen: 'SIN_REGIMEN',
      recentDocumentTypes: ['audiometria'],
    });
    expect(tip?.id).toBe('audiometria-ama-lft');
  });

  it('rota de forma estable por usuario y día', () => {
    const a = selectInicioTip({
      userId: 'user-1',
      dateKey: '2026-08-28',
      regimen: 'SIN_REGIMEN',
    });
    const b = selectInicioTip({
      userId: 'user-1',
      dateKey: '2026-08-28',
      regimen: 'SIN_REGIMEN',
    });
    const c = selectInicioTip({
      userId: 'user-2',
      dateKey: '2026-08-28',
      regimen: 'SIN_REGIMEN',
    });

    expect(a).not.toBeNull();
    expect(a?.id).toBe(b?.id);
    expect(c).not.toBeNull();
  });
});
