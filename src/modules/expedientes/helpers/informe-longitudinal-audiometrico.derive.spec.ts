import {
  derivarCamposInformeLongitudinalAudiometrico,
  payloadTieneSeleccionAudiometrica,
} from './informe-longitudinal-audiometrico.derive';

describe('derivarCamposInformeLongitudinalAudiometrico', () => {
  it('recalcula Δ y no añade advertencia de calibración ni severidad casera', () => {
    const out = derivarCamposInformeLongitudinalAudiometrico({
      basalFuente: {
        _id: 'b',
        fechaAudiometria: '2023-03-15',
        metodoAudiometria: 'AMA',
        oidoDerecho500: 10,
        oidoIzquierdo500: 10,
        oidoDerecho1000: 10,
        oidoIzquierdo1000: 10,
        oidoDerecho2000: 10,
        oidoIzquierdo2000: 10,
        oidoDerecho3000: 10,
        oidoIzquierdo3000: 10,
        oidoDerecho4000: 20,
        oidoIzquierdo4000: 20,
        oidoDerecho6000: 10,
        oidoIzquierdo6000: 10,
        oidoDerecho8000: 10,
        oidoIzquierdo8000: 10,
        perdidaMonauralOD_AMA: 0,
        perdidaMonauralOI_AMA: 0,
      },
      subsecuentesFuente: [
        {
          _id: 's',
          fechaAudiometria: '2024-03-15',
          metodoAudiometria: 'AMA',
          oidoDerecho500: 10,
          oidoIzquierdo500: 10,
          oidoDerecho1000: 10,
          oidoIzquierdo1000: 10,
          oidoDerecho2000: 10,
          oidoIzquierdo2000: 10,
          oidoDerecho3000: 10,
          oidoIzquierdo3000: 10,
          oidoDerecho4000: 35,
          oidoIzquierdo4000: 20,
          oidoDerecho6000: 10,
          oidoIzquierdo6000: 10,
          oidoDerecho8000: 10,
          oidoIzquierdo8000: 10,
          perdidaMonauralOD_AMA: 0,
          perdidaMonauralOI_AMA: 0,
        },
      ],
    });

    const filaOd = out.matrizDeltas.find((f) => f.oido === 'Derecho');
    expect(filaOd?.deltas.find((d) => d.frecuenciaHz === 4000)?.deltaDb).toBe(15);
    expect(out.resumenCronologico[0].resultadoOD).toBe('PA 0 %');
    expect(out.resumenCronologico[0].resultadoOD).not.toMatch(/Normal|Leve|Moderada/);
    expect(out.advertencias).toEqual([]);
    expect(out.criterioComparacion).toBe('solo_diferencias');
    expect(out.numeroAudiometriasIncluidas).toBe(2);
  });

  it('ordena el resumen de más antigua a más reciente con Date e ISO mezclados', () => {
    const umbrales = {
      oidoDerecho500: 10,
      oidoIzquierdo500: 10,
      oidoDerecho1000: 10,
      oidoIzquierdo1000: 10,
      oidoDerecho2000: 10,
      oidoIzquierdo2000: 10,
      oidoDerecho3000: 10,
      oidoIzquierdo3000: 10,
      oidoDerecho4000: 20,
      oidoIzquierdo4000: 20,
      oidoDerecho6000: 10,
      oidoIzquierdo6000: 10,
      oidoDerecho8000: 10,
      oidoIzquierdo8000: 10,
    };
    const out = derivarCamposInformeLongitudinalAudiometrico({
      basalFuente: {
        _id: 'b',
        fechaAudiometria: new Date('2023-06-15T00:00:00.000Z'),
        metodoAudiometria: 'LFT',
        ...umbrales,
      },
      subsecuentesFuente: [
        {
          _id: 's25',
          fechaAudiometria: '2025-06-24',
          metodoAudiometria: 'LFT',
          ...umbrales,
        },
        {
          _id: 's24',
          fechaAudiometria: '2024-06-15',
          metodoAudiometria: 'LFT',
          ...umbrales,
        },
        {
          _id: 's26',
          fechaAudiometria: new Date('2026-06-18T00:00:00.000Z'),
          metodoAudiometria: 'LFT',
          ...umbrales,
        },
      ],
    });
    expect(out.resumenCronologico.map((r) => r.idAudiometriaOriginal)).toEqual([
      'b',
      's24',
      's25',
      's26',
    ]);
  });
});

describe('payloadTieneSeleccionAudiometrica', () => {
  it('detecta parche sin IDs (gráficas)', () => {
    expect(
      payloadTieneSeleccionAudiometrica({
        graficaAudiogramaOidoDerecho: 'data:image/png;base64,xx',
      } as { idAudiometriaBasal?: unknown }),
    ).toBe(false);
    expect(
      payloadTieneSeleccionAudiometrica({
        idAudiometriaBasal: '64b0f0f0f0f0f0f0f0f0f0f0',
      }),
    ).toBe(true);
  });
});
