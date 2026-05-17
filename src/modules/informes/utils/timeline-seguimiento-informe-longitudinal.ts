/**
 * Paridad con `frontend/src/helpers/timelineSeguimientoInformeLongitudinal.ts`.
 * Cualquier cambio en criterios (Realizada, reprogramación, orden) debe replicarse allí.
 */
import type { Content } from 'pdfmake/interfaces';
import type {
  EventoConcentradoCardiometabolico,
  SeguimientoProgramadoConcentradoCardiometabolico,
} from '../../expedientes/schemas/informe-longitudinal-cardiometabolico.schema';

export type TimelineSeguimientoTipo =
  | 'control_realizado'
  | 'no_asistio'
  | 'cancelada'
  | 'reprogramada';

export type TimelineSeguimientoItem = {
  tipo: TimelineSeguimientoTipo;
  fechaOrden: number;
  etiqueta: string;
  fechaTexto: string;
  detalle?: string;
};

const ESTADO_REALIZADA = 'Realizada';
const ESTADO_NO_ASISTIO = 'No asistió';
const ESTADO_CANCELADA = 'Cancelada';

/** Hitos por fila (varias bandas cuando hay muchos; evita el timeline vertical alto). */
const ITEMS_PER_STRIP_ROW = 6;

/** Ancho contenido típico (carta menos márgenes laterales ~40+40 del doc ILC). */
const TIMELINE_INNER_WIDTH_PT = 500;

/** Ancho reservado para el conector flecha entre dos hitos (flecha + punta). */
const ARROW_COL_WIDTH_PT = 15;

const RAIL_COLOR = '#64748b';

/** Color de texto por tipo — sin figuras/geometrías, solo código por color (alineado a Vue). */
function colorAccentEtiqueta(tipo: TimelineSeguimientoTipo): string {
  switch (tipo) {
    case 'control_realizado':
      return '#0f766e';
    case 'no_asistio':
      return '#b91c1c';
    case 'cancelada':
      return '#475569';
    case 'reprogramada':
      return '#b45309';
    default:
      return '#475569';
  }
}

function chunkItems<T>(arr: T[], size: number): T[][] {
  if (size < 1) return [arr];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Flecha hacia la derecha (eje media altura del canvas = altura de la fila de etiquetas). */
function buildArrowRightConnectorCanvas(
  widthPt: number,
  heightPt: number,
  lineColor: string,
): Content {
  const w = widthPt;
  const h = Math.max(8, heightPt);
  const cy = h / 2;
  const tipX = w - 0.5;
  const barEnd = tipX - 5;
  return {
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: cy,
        x2: barEnd,
        y2: cy,
        lineWidth: 0.85,
        lineColor,
      },
      {
        type: 'line',
        x1: barEnd,
        y1: cy - 3,
        x2: tipX,
        y2: cy,
        lineWidth: 0.85,
        lineColor,
      },
      {
        type: 'line',
        x1: barEnd,
        y1: cy + 3,
        x2: tipX,
        y2: cy,
        lineWidth: 0.85,
        lineColor,
      },
    ] as never,
    width: w,
    height: h,
  } as Content;
}

function formatFechaDdMmYyyy(d: Date | string | undefined | null): string {
  if (d == null || d === '') return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const dia = String(dt.getUTCDate()).padStart(2, '0');
  const mes = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const año = dt.getUTCFullYear();
  return `${dia}-${mes}-${año}`;
}

function parseFechaMs(d: Date | string | undefined | null): number {
  if (d == null || d === '') return NaN;
  const dt = d instanceof Date ? d : new Date(d);
  const t = dt.getTime();
  return Number.isFinite(t) ? t : NaN;
}

function esSeguimientoReprogramacion(row: SeguimientoProgramadoConcentradoCardiometabolico): boolean {
  if (row.esResultadoDeReprogramacion === true) return true;
  if (row.fechaReprogramada == null) return false;
  const e = row.estado?.trim();
  if (e === ESTADO_CANCELADA || e === ESTADO_REALIZADA) return false;
  return true;
}

export function buildTimelineSeguimientoItems(
  eventosConcentrados: EventoConcentradoCardiometabolico[] | undefined | null,
  seguimientosProgramadosConcentrados:
    | SeguimientoProgramadoConcentradoCardiometabolico[]
    | undefined
    | null,
): TimelineSeguimientoItem[] {
  const items: TimelineSeguimientoItem[] = [];

  for (const ev of eventosConcentrados || []) {
    const ms = parseFechaMs(ev?.fechaControl);
    if (!Number.isFinite(ms)) continue;
    const fechaTexto = formatFechaDdMmYyyy(ev.fechaControl) || '—';
    items.push({
      tipo: 'control_realizado',
      fechaOrden: ms,
      etiqueta: 'Control realizado',
      fechaTexto,
    });
  }

  for (const row of seguimientosProgramadosConcentrados || []) {
    const estado = row.estado?.trim();
    if (estado === ESTADO_REALIZADA) continue;

    const msProg = parseFechaMs(row.fechaProgramada);
    if (!Number.isFinite(msProg)) continue;

    if (estado === ESTADO_NO_ASISTIO) {
      items.push({
        tipo: 'no_asistio',
        fechaOrden: msProg,
        etiqueta: 'No asistió',
        fechaTexto: formatFechaDdMmYyyy(row.fechaProgramada) || '—',
      });
      continue;
    }
    if (estado === ESTADO_CANCELADA) {
      items.push({
        tipo: 'cancelada',
        fechaOrden: msProg,
        etiqueta: 'Cancelada',
        fechaTexto: formatFechaDdMmYyyy(row.fechaProgramada) || '—',
      });
      continue;
    }
    if (esSeguimientoReprogramacion(row)) {
      const fr = row.fechaReprogramada != null ? formatFechaDdMmYyyy(row.fechaReprogramada) : '';
      items.push({
        tipo: 'reprogramada',
        fechaOrden: msProg,
        etiqueta: 'Reprogramada',
        fechaTexto: formatFechaDdMmYyyy(row.fechaProgramada) || '—',
        detalle: fr ? `Nueva fecha: ${fr}` : undefined,
      });
      continue;
    }
  }

  items.sort((a, b) => {
    if (a.fechaOrden !== b.fechaOrden) return a.fechaOrden - b.fechaOrden;
    const orderTipo = (t: TimelineSeguimientoTipo) =>
      t === 'control_realizado' ? 0 : t === 'reprogramada' ? 1 : t === 'no_asistio' ? 2 : 3;
    return orderTipo(a.tipo) - orderTipo(b.tipo);
  });

  return items;
}

/**
 * Banda horizontal tipo secuencia: fila 1 = etiquetas + flechas al mismo nivel;
 * fila 2 = fechas/detalle bajo cada etiqueta (celdas vacías bajo las flechas).
 */
function buildTimelineHorizontalStrip(compact: boolean, stripItems: TimelineSeguimientoItem[]): Content {
  const n = stripItems.length;
  if (n === 0) {
    return { text: '' } as Content;
  }

  const fsEt = compact ? 6 : 7;
  const fsFeb = compact ? 5.5 : 6.5;
  const fsDet = compact ? 5 : 6;

  /** Altura de la fila de etiquetas (flechas centradas en esta banda). */
  const labelRowLineH = compact ? 10 : 11;

  const arrowW = ARROW_COL_WIDTH_PT;
  const labelW =
    n > 0
      ? Math.max(44, (TIMELINE_INNER_WIDTH_PT - (n - 1) * arrowW) / n)
      : TIMELINE_INNER_WIDTH_PT;

  const colCount = 2 * n - 1;
  const widths: (number | string)[] = [];
  for (let c = 0; c < colCount; c++) {
    widths.push(widths.length % 2 === 0 ? labelW : arrowW);
  }

  const rowLabels: Content[] = [];
  const rowDetails: Content[] = [];

  for (let i = 0; i < n; i++) {
    const it = stripItems[i];
    const accent = colorAccentEtiqueta(it.tipo);

    rowLabels.push({
      text: it.etiqueta,
      bold: true,
      fontSize: fsEt,
      color: accent,
      alignment: 'center',
      noWrap: true,
      margin: [2, 1, 2, 2],
    });

    const detailStack: Content[] = [
      {
        text: it.fechaTexto,
        fontSize: fsFeb,
        color: '#64748b',
        alignment: 'center',
      },
    ];
    if (it.detalle) {
      detailStack.push({
        text: it.detalle,
        fontSize: fsDet,
        color: '#94a3b8',
        alignment: 'center',
        margin: [0, 2, 0, 0],
      });
    }

    rowDetails.push({
      stack: detailStack,
      alignment: 'center',
      margin: [2, 0, 2, 2],
    });

    if (i < n - 1) {
      const arrowBlock = buildArrowRightConnectorCanvas(
        arrowW,
        labelRowLineH,
        RAIL_COLOR,
      ) as unknown as Record<string, unknown>;
      rowLabels.push({
        ...arrowBlock,
        margin: [0, 1, 0, 2],
        alignment: 'center',
      } as Content);
      rowDetails.push({ text: '', margin: [0, 0, 0, 0] });
    }
  }

  return {
    table: {
      widths,
      body: [rowLabels, rowDetails],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 1,
      paddingBottom: () => 0,
    },
    margin: [0, compact ? 2 : 3, 0, compact ? 4 : 6],
  } as Content;
}

function buildTimelineWrappedStripsPdf(items: TimelineSeguimientoItem[]): Content {
  const rows = chunkItems(items, ITEMS_PER_STRIP_ROW);
  /** Primera banda menos compacta si hay pocas cosas globalmente; después compactar. */
  const singleShortRow = items.length <= ITEMS_PER_STRIP_ROW;
  return {
    stack: rows.map((strip, idx) =>
      buildTimelineHorizontalStrip(!singleShortRow || idx > 0, strip),
    ),
    margin: [0, 0, 0, 0],
  } as Content;
}

/** Bloque pdfMake compacto; devuelve `undefined` si no hay ítems. */
export function buildTimelineSeguimientoPdfBlock(
  eventosConcentrados: EventoConcentradoCardiometabolico[] | undefined | null,
  seguimientosProgramadosConcentrados:
    | SeguimientoProgramadoConcentradoCardiometabolico[]
    | undefined
    | null,
): Content | undefined {
  const items = buildTimelineSeguimientoItems(eventosConcentrados, seguimientosProgramadosConcentrados);
  if (!items.length) return undefined;

  return {
    pageBreak: 'before',
    stack: [
      {
        text: 'CONTINUIDAD DEL SEGUIMIENTO',
        style: 'sectionHeader',
        margin: [0, 8, 0, 2],
      },
      {
        text: 'Hitos operativos y controles clínicos en el periodo (orden cronológico)',
        fontSize: 8,
        color: '#6B7280',
        margin: [0, 0, 0, 6],
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.3, lineColor: '#E5E7EB' }],
        margin: [0, 0, 0, 6],
      },
      buildTimelineWrappedStripsPdf(items),
    ],
    margin: [0, 0, 0, 6],
  };
}
