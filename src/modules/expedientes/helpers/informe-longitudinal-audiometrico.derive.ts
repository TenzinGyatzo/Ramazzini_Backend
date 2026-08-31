import {
  CriterioComparacionAudiometrica,
  FRECUENCIAS_MATRIZ_AUDIOMETRICA,
  RolAudiometriaEnInforme,
  VERSION_CRITERIO_AUDIOMETRICO_V1,
} from '../enums/informe-longitudinal-audiometrico.enums';

export type OidoIla = 'Derecho' | 'Izquierdo';

export type AudiometriaFuenteIla = {
  _id?: unknown;
  id?: unknown;
  fechaAudiometria?: Date | string;
  metodoAudiometria?: string;
  estado?: string;
  [key: string]: unknown;
};

export type HistoriaOtologicaExposicionLike = {
  _id?: unknown;
  fechaHistoriaOtologica?: Date | string;
  trabajoAmbientesRuidosos?: string;
  tiempoExposicionLaboral?: string;
  usoProteccionAuditiva?: string;
};

function mongoIdStr(x: unknown): string {
  if (x == null || x === '') return '';
  if (typeof x === 'object' && x !== null && '_id' in x && (x as { _id?: unknown })._id != null) {
    return String((x as { _id: unknown })._id);
  }
  return String(x);
}

function toNumberOrNull(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function umbralOido(
  estudio: AudiometriaFuenteIla | Record<string, unknown> | null | undefined,
  oido: OidoIla,
  freq: number,
): number | null {
  if (!estudio) return null;
  return toNumberOrNull((estudio as Record<string, unknown>)[`oido${oido}${freq}`]);
}

function frecuenciasFaltantesMatriz(estudio: AudiometriaFuenteIla): number[] {
  const faltantes: number[] = [];
  for (const freq of FRECUENCIAS_MATRIZ_AUDIOMETRICA) {
    if (umbralOido(estudio, 'Derecho', freq) == null || umbralOido(estudio, 'Izquierdo', freq) == null) {
      faltantes.push(freq);
    }
  }
  return [...new Set(faltantes)];
}

function snapshotAudiometriaConcentradaIla(
  fuente: AudiometriaFuenteIla,
  rol: RolAudiometriaEnInforme,
) {
  const faltantes = frecuenciasFaltantesMatriz(fuente);
  return {
    idAudiometriaOriginal: mongoIdStr(fuente._id || fuente.id),
    fechaAudiometria: fuente.fechaAudiometria,
    metodoAudiometria: fuente.metodoAudiometria,
    rolEnInforme: rol,
    oidoDerecho125: toNumberOrNull(fuente.oidoDerecho125),
    oidoDerecho250: toNumberOrNull(fuente.oidoDerecho250),
    oidoDerecho500: toNumberOrNull(fuente.oidoDerecho500),
    oidoDerecho1000: toNumberOrNull(fuente.oidoDerecho1000),
    oidoDerecho2000: toNumberOrNull(fuente.oidoDerecho2000),
    oidoDerecho3000: toNumberOrNull(fuente.oidoDerecho3000),
    oidoDerecho4000: toNumberOrNull(fuente.oidoDerecho4000),
    oidoDerecho6000: toNumberOrNull(fuente.oidoDerecho6000),
    oidoDerecho8000: toNumberOrNull(fuente.oidoDerecho8000),
    oidoIzquierdo125: toNumberOrNull(fuente.oidoIzquierdo125),
    oidoIzquierdo250: toNumberOrNull(fuente.oidoIzquierdo250),
    oidoIzquierdo500: toNumberOrNull(fuente.oidoIzquierdo500),
    oidoIzquierdo1000: toNumberOrNull(fuente.oidoIzquierdo1000),
    oidoIzquierdo2000: toNumberOrNull(fuente.oidoIzquierdo2000),
    oidoIzquierdo3000: toNumberOrNull(fuente.oidoIzquierdo3000),
    oidoIzquierdo4000: toNumberOrNull(fuente.oidoIzquierdo4000),
    oidoIzquierdo6000: toNumberOrNull(fuente.oidoIzquierdo6000),
    oidoIzquierdo8000: toNumberOrNull(fuente.oidoIzquierdo8000),
    porcentajePerdidaOD: toNumberOrNull(fuente.porcentajePerdidaOD),
    porcentajePerdidaOI: toNumberOrNull(fuente.porcentajePerdidaOI),
    perdidaMonauralOD_AMA: toNumberOrNull(fuente.perdidaMonauralOD_AMA),
    perdidaMonauralOI_AMA: toNumberOrNull(fuente.perdidaMonauralOI_AMA),
    perdidaAuditivaBilateralAMA: toNumberOrNull(fuente.perdidaAuditivaBilateralAMA),
    hipoacusiaBilateralCombinada: toNumberOrNull(fuente.hipoacusiaBilateralCombinada),
    diagnosticoAudiometria: fuente.diagnosticoAudiometria,
    interpretacionAudiometrica: fuente.interpretacionAudiometrica,
    frecuenciasFaltantes: faltantes,
    estudioIncompleto: faltantes.length > 0,
  };
}

type AudiometriaConcentrada = ReturnType<typeof snapshotAudiometriaConcentradaIla>;

function calcularDeltaDb(
  umbralSubsecuente: number | null,
  umbralBasal: number | null,
): number | null {
  if (umbralSubsecuente == null || umbralBasal == null) return null;
  return umbralSubsecuente - umbralBasal;
}

function formatearDeltaConSigno(deltaDb: number | null | undefined): string {
  if (deltaDb == null || !Number.isFinite(deltaDb)) return '—';
  if (deltaDb > 0) return `+${deltaDb}`;
  return String(deltaDb);
}

function claveFechaOrdenIla(v?: string | Date | null): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function ordenarPorFechaAscIla<T extends { fechaAudiometria?: string | Date | null }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) =>
    claveFechaOrdenIla(a.fechaAudiometria).localeCompare(claveFechaOrdenIla(b.fechaAudiometria)),
  );
}

function construirMatrizDeltasIla(
  basal: AudiometriaConcentrada | null,
  subsecuentes: AudiometriaConcentrada[],
) {
  if (!basal) return [];
  const filas: Array<{
    idAudiometriaOriginal: string;
    fechaAudiometria?: Date | string;
    oido: OidoIla;
    deltas: Array<{ frecuenciaHz: number; deltaDb: number | null }>;
  }> = [];
  const ordenados = ordenarPorFechaAscIla(subsecuentes);
  for (const sub of ordenados) {
    for (const oido of ['Derecho', 'Izquierdo'] as OidoIla[]) {
      filas.push({
        idAudiometriaOriginal: sub.idAudiometriaOriginal,
        fechaAudiometria: sub.fechaAudiometria,
        oido,
        deltas: FRECUENCIAS_MATRIZ_AUDIOMETRICA.map((freq) => ({
          frecuenciaHz: freq,
          deltaDb: calcularDeltaDb(umbralOido(sub, oido, freq), umbralOido(basal, oido, freq)),
        })),
      });
    }
  }
  return filas;
}

type FilaMatriz = ReturnType<typeof construirMatrizDeltasIla>[number];

function resultadoMetodoOriginal(estudio: AudiometriaConcentrada, oido: OidoIla): string {
  const metodo = String(estudio.metodoAudiometria || '').toUpperCase();
  if (metodo === 'AMA') {
    const pct = oido === 'Derecho' ? estudio.perdidaMonauralOD_AMA : estudio.perdidaMonauralOI_AMA;
    return `PA ${pct == null ? '—' : `${pct} %`}`;
  }
  if (metodo === 'LFT') {
    const pct = oido === 'Derecho' ? estudio.porcentajePerdidaOD : estudio.porcentajePerdidaOI;
    return `HBC ${pct == null ? '—' : `${pct} %`}`;
  }
  return metodo || '—';
}

function maxDeltaFila(fila: FilaMatriz | undefined): { delta: number; freq: number } | null {
  if (!fila) return null;
  let mejor: { delta: number; freq: number } | null = null;
  for (const celda of fila.deltas || []) {
    if (celda.deltaDb == null) continue;
    if (!mejor || Math.abs(celda.deltaDb) > Math.abs(mejor.delta)) {
      mejor = { delta: celda.deltaDb, freq: celda.frecuenciaHz };
    }
  }
  return mejor;
}

function hayVariacionNumerica(fila: FilaMatriz | undefined): boolean {
  return (fila?.deltas || []).some((c) => c.deltaDb != null && c.deltaDb !== 0);
}

function textoCambioRespectoBasal(
  basal: AudiometriaConcentrada,
  sub: AudiometriaConcentrada,
  matriz: FilaMatriz[],
): string {
  if (sub.rolEnInforme === RolAudiometriaEnInforme.BASAL || sub.idAudiometriaOriginal === basal.idAudiometriaOriginal) {
    return 'Referencia';
  }
  const filas = matriz.filter((f) => f.idAudiometriaOriginal === sub.idAudiometriaOriginal);
  if (!filas.length || !filas.some(hayVariacionNumerica)) return 'Sin variación numérica';
  let mejor: { delta: number; freq: number; oido: OidoIla } | null = null;
  for (const fila of filas) {
    const m = maxDeltaFila(fila);
    if (!m) continue;
    if (!mejor || Math.abs(m.delta) > Math.abs(mejor.delta)) {
      mejor = { ...m, oido: fila.oido };
    }
  }
  if (!mejor) return 'Sin variación numérica';
  const oidoTxt = mejor.oido === 'Derecho' ? 'OD' : 'OI';
  return `Variación (máx. ${formatearDeltaConSigno(mejor.delta)} dB en ${mejor.freq} Hz ${oidoTxt})`;
}

function construirResumenCronologicoIla(
  basal: AudiometriaConcentrada | null,
  subsecuentes: AudiometriaConcentrada[],
  matriz: FilaMatriz[],
) {
  if (!basal) return [];
  const todos = ordenarPorFechaAscIla([basal, ...subsecuentes]);
  return todos.map((est) => ({
    idAudiometriaOriginal: est.idAudiometriaOriginal,
    fechaAudiometria: est.fechaAudiometria,
    tipo: est.rolEnInforme,
    metodoAudiometria: est.metodoAudiometria,
    resultadoOD: resultadoMetodoOriginal(est, 'Derecho'),
    resultadoOI: resultadoMetodoOriginal(est, 'Izquierdo'),
    cambioRespectoBasal: textoCambioRespectoBasal(basal, est, matriz),
  }));
}

function formatFechaHumana(v?: string | Date | null): string {
  if (v == null || v === '') return 'sin fecha';
  const s = typeof v === 'string' ? v : v.toISOString();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return 'sin fecha';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function cambiosPositivosOido(
  matriz: FilaMatriz[],
  oido: OidoIla,
): { freq: number; delta: number }[] {
  const cambios: { freq: number; delta: number }[] = [];
  for (const fila of matriz) {
    if (fila.oido !== oido) continue;
    for (const celda of fila.deltas || []) {
      if (celda.deltaDb == null || celda.deltaDb <= 0) continue;
      cambios.push({ freq: celda.frecuenciaHz, delta: celda.deltaDb });
    }
  }
  return cambios;
}

function fraseCambiosOidoIla(cambios: { freq: number; delta: number }[], oidoTxt: string): string {
  if (!cambios.length) {
    return `En el ${oidoTxt} no se observan incrementos de umbral en las frecuencias comparadas.`;
  }
  const freqs = [...new Set(cambios.filter((c) => c.delta >= 5).map((c) => c.freq))].sort((a, b) => a - b);
  const mayor = cambios.reduce((acc, c) => (c.delta > acc.delta ? c : acc), cambios[0]);
  if (freqs.length) {
    return `Se identifica incremento de los umbrales auditivos en las frecuencias de ${freqs.join(', ')} Hz del ${oidoTxt}. El mayor cambio se presenta en ${mayor.freq} Hz, con una diferencia de ${mayor.delta} dB.`;
  }
  return `En el ${oidoTxt} hay variaciones menores a 5 dB; el mayor cambio es de ${formatearDeltaConSigno(mayor.delta)} dB en ${mayor.freq} Hz.`;
}

function construirBorradorInterpretacionOidoIla(
  basal: AudiometriaConcentrada | null,
  matriz: FilaMatriz[],
  oido: OidoIla,
): string {
  if (!basal) {
    return 'Seleccione una audiometría basal para generar el borrador objetivo.';
  }
  const fechaBasal = formatFechaHumana(basal.fechaAudiometria);
  const oidoTxt = oido === 'Derecho' ? 'oído derecho' : 'oído izquierdo';
  return [
    `En comparación con la audiometría basal del ${fechaBasal}, se describen las variaciones de umbral tonal del ${oidoTxt} (Δ = umbral subsecuente − umbral basal).`,
    fraseCambiosOidoIla(cambiosPositivosOido(matriz, oido), oidoTxt),
  ].join(' ');
}

function construirBorradorInterpretacionIla(
  basal: AudiometriaConcentrada | null,
  matriz: FilaMatriz[],
): string {
  if (!basal) {
    return 'Seleccione una audiometría basal para generar el borrador objetivo.';
  }
  return [
    construirBorradorInterpretacionOidoIla(basal, matriz, 'Derecho'),
    construirBorradorInterpretacionOidoIla(basal, matriz, 'Izquierdo'),
  ].join(' ');
}

export function snapshotExposicionRuidoIla(opts: {
  historias?: HistoriaOtologicaExposicionLike[];
  agentesRiesgoActuales?: string[];
  textoLibre?: string;
}) {
  const historias = [...(opts.historias || [])].sort((a, b) =>
    String(b.fechaHistoriaOtologica || '').localeCompare(String(a.fechaHistoriaOtologica || '')),
  );
  const ultima = historias[0];
  const agentes = opts.agentesRiesgoActuales || [];
  const ruidoEnAgentes = agentes.some((a) => String(a).toLowerCase().includes('ruido'));
  return {
    fuente: ultima ? 'historiaOtologica' : ruidoEnAgentes ? 'agentesRiesgo' : 'manual',
    idHistoriaOtologica: ultima?._id ? String(ultima._id) : undefined,
    trabajoAmbientesRuidosos: ultima?.trabajoAmbientesRuidosos,
    tiempoExposicionLaboral: ultima?.tiempoExposicionLaboral,
    usoProteccionAuditiva: ultima?.usoProteccionAuditiva,
    ruidoEnAgentesRiesgoActuales: ruidoEnAgentes,
    textoLibre: opts.textoLibre,
  };
}

export function derivarCamposInformeLongitudinalAudiometrico(opts: {
  basalFuente?: AudiometriaFuenteIla | null;
  subsecuentesFuente?: AudiometriaFuenteIla[];
  exposicion?: ReturnType<typeof snapshotExposicionRuidoIla> | null;
}) {
  const basal = opts.basalFuente
    ? snapshotAudiometriaConcentradaIla(opts.basalFuente, RolAudiometriaEnInforme.BASAL)
    : null;
  const subsecuentes = (opts.subsecuentesFuente || []).map((s) =>
    snapshotAudiometriaConcentradaIla(s, RolAudiometriaEnInforme.SUBSECUENTE),
  );
  const matrizDeltas = construirMatrizDeltasIla(basal, subsecuentes);
  const resumenCronologico = construirResumenCronologicoIla(basal, subsecuentes, matrizDeltas);
  return {
    audiometriaBasalConcentrada: basal || undefined,
    audiometriasSubsecuentesConcentradas: subsecuentes,
    matrizDeltas,
    resumenCronologico,
    advertencias: [],
    borradorInterpretacionOidoDerecho: construirBorradorInterpretacionOidoIla(basal, matrizDeltas, 'Derecho'),
    borradorInterpretacionOidoIzquierdo: construirBorradorInterpretacionOidoIla(
      basal,
      matrizDeltas,
      'Izquierdo',
    ),
    borradorInterpretacionObjetiva: construirBorradorInterpretacionIla(basal, matrizDeltas),
    numeroAudiometriasIncluidas: (basal ? 1 : 0) + subsecuentes.length,
    criterioComparacion: CriterioComparacionAudiometrica.SOLO_DIFERENCIAS,
    versionCriterio: VERSION_CRITERIO_AUDIOMETRICO_V1,
  };
}

export function uniqueMongoIds(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(mongoIdStr).filter(Boolean))];
}

export function mongoIdFromUnknown(x: unknown): string {
  return mongoIdStr(x);
}

export function payloadTieneSeleccionAudiometrica(dto: {
  idAudiometriaBasal?: unknown;
  audiometriasSubsecuentesIncluidas?: unknown;
}): boolean {
  return Boolean(mongoIdStr(dto.idAudiometriaBasal)) || uniqueMongoIds(dto.audiometriasSubsecuentesIncluidas).length > 0;
}
