import type {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { FooterFirmantesData } from '../interfaces/firmante-data.interface';
import { generarFooterFirmantes } from '../helpers/footer-firmantes.helper';
import { formatearNombreTrabajador, formatearTituloYNombreFirmante } from '../../../utils/names';
import { EnfermeraFirmanteInforme, MedicoFirmanteInforme, TecnicoFirmanteInforme } from '../types/firmante-informe.types';
import { firmanteTieneLineaNombre } from '../helpers/firmante-informe.helpers';
import { buildEnfermeraPiePaginaPdfBlock, buildTecnicoPiePaginaPdfBlock } from '../../../utils/firmante-pie-pagina.util';

const FRECUENCIAS = [500, 1000, 2000, 3000, 4000, 6000, 8000];
const PIE_COLOR =
  'El color indica magnitud del Δ en dB, no un criterio NIOSH, OSHA ni NOM-011. La interpretación corresponde al médico.';

const styles: StyleDictionary = {
  header: {
    fontSize: 13,
    bold: false,
    color: 'blue',
    decoration: 'underline',
    decorationColor: 'red',
  },
  nombreEmpresa: { fontSize: 14, bold: true, alignment: 'center', lineHeight: 1 },
  fecha: { fontSize: 9, alignment: 'right' },
  sectionHeader: { fontSize: 9, bold: true, color: '#404040', margin: [0, 8, 0, 4] },
  label: { fontSize: 8, lineHeight: 1 },
  value: { bold: true, fontSize: 8, lineHeight: 1 },
  tableHeader: {
    fillColor: '#343A40',
    color: '#FFFFFF',
    bold: true,
    fontSize: 7,
    alignment: 'center',
  },
  tableCell: { fontSize: 7, alignment: 'center' },
  paragraph: { fontSize: 8, alignment: 'justify' },
};

interface TrabajadorPdf {
  primerApellido: string;
  segundoApellido: string;
  nombre: string;
  nacimiento?: string;
  escolaridad?: string;
  edad?: string;
  puesto?: string;
  sexo?: string;
  antiguedad?: string;
  telefono?: string;
  estadoCivil?: string;
  numeroEmpleado?: string;
}

interface ProveedorSaludPdf {
  nombre?: string;
  pais: string;
  regimenRegulatorio?: string;
  direccion?: string;
  municipio?: string;
  estado?: string;
  telefono?: string;
  sitioWeb?: string;
  colorInforme?: string;
  logotipoEmpresa?: { data?: string };
}

export interface DatosInformeLongitudinalAudiometricoPdf {
  fechaInformeLongitudinalAudiometrico?: Date | string;
  periodoInicio?: Date | string;
  periodoFin?: Date | string;
  numeroAudiometriasIncluidas?: number;
  criterioComparacion?: string;
  versionCriterio?: string;
  audiometriaBasalConcentrada?: Record<string, unknown>;
  audiometriasSubsecuentesConcentradas?: Record<string, unknown>[];
  antecedenteExposicionRuido?: Record<string, unknown>;
  matrizDeltas?: Array<{
    fechaAudiometria?: Date | string;
    oido?: string;
    deltas?: Array<{ frecuenciaHz?: number; deltaDb?: number | null }>;
  }>;
  resumenCronologico?: Array<{
    fechaAudiometria?: Date | string;
    tipo?: string;
    metodoAudiometria?: string;
    resultadoOD?: string;
    resultadoOI?: string;
    cambioRespectoBasal?: string;
  }>;
  advertencias?: string[];
  interpretacionLongitudinal?: string;
  interpretacionOidoDerecho?: string;
  interpretacionOidoIzquierdo?: string;
  recomendacionesSeguimientoAudiometrico?: string;
  graficaAudiogramaOidoDerecho?: string;
  graficaAudiogramaOidoIzquierdo?: string;
}

function claveFechaOrden(v?: Date | string | null): string {
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

function ordenarPorFechaAsc<T extends { fechaAudiometria?: Date | string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    claveFechaOrden(a.fechaAudiometria).localeCompare(claveFechaOrden(b.fechaAudiometria)),
  );
}

function fmtFecha(v?: Date | string | null): string {
  if (v == null || v === '') return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function fmt(v: unknown): string {
  if (v == null || v === '') return '—';
  return String(v);
}

function fmtResultadoResumen(v: unknown, metodo?: string): string {
  const s = fmt(v);
  const m = String(metodo || '').toUpperCase();
  const etiqueta = m === 'LFT' ? 'HBC' : m === 'AMA' ? 'PA' : '';
  if (etiqueta) {
    const resto = s.replace(/^(AMA|LFT|HBC|PA)\b\s*/i, '');
    return resto && resto !== '—' ? `${etiqueta} ${resto}` : (resto === '—' ? `${etiqueta} —` : etiqueta);
  }
  if (/^AMA\b/i.test(s)) return s.replace(/^AMA\b/i, 'PA');
  if (/^LFT\b/i.test(s)) return s.replace(/^LFT\b/i, 'HBC');
  return s;
}

function colorDelta(delta?: number | null): { fillColor: string; color: string } {
  if (delta == null || !Number.isFinite(delta)) return { fillColor: '#FFFFFF', color: '#9CA3AF' };
  if (delta === 0) return { fillColor: '#F3F4F6', color: '#374151' };
  if (delta < 0) return { fillColor: '#D1FAE5', color: '#065F46' };
  if (delta >= 15) return { fillColor: '#FECACA', color: '#7F1D1D' };
  if (delta >= 5) return { fillColor: '#FEF3C7', color: '#92400E' };
  return { fillColor: '#F3F4F6', color: '#374151' };
}

function fmtDelta(delta?: number | null): string {
  if (delta == null || !Number.isFinite(delta)) return '—';
  return delta > 0 ? `+${delta}` : String(delta);
}

const ANCHO_AUDIOGRAMA_PDF = 520;

function filasMatrizPorOido(
  matriz: NonNullable<DatosInformeLongitudinalAudiometricoPdf['matrizDeltas']>,
  oido: string,
) {
  return ordenarPorFechaAsc(matriz.filter((f) => f.oido === oido));
}

function tablaMatrizOido(
  filas: NonNullable<DatosInformeLongitudinalAudiometricoPdf['matrizDeltas']>,
): Content {
  const header: Content[] = [
    { text: 'Fecha', style: 'tableHeader' },
    ...FRECUENCIAS.map((f) => ({ text: `${f} Hz`, style: 'tableHeader' })),
  ];
  const body = [
    header,
    ...(filas.length
      ? filas.map((fila) => [
          { text: fmtFecha(fila.fechaAudiometria), style: 'tableCell' },
          ...FRECUENCIAS.map((freq) => {
            const celda = (fila.deltas || []).find((d) => d.frecuenciaHz === freq);
            const c = colorDelta(celda?.deltaDb);
            return {
              text: fmtDelta(celda?.deltaDb),
              style: 'tableCell',
              fillColor: c.fillColor,
              color: c.color,
              bold: true,
            };
          }),
        ])
      : [[{ text: 'Sin estudios subsecuentes.', style: 'tableCell', colSpan: 8 }, ...Array(7).fill({})]]),
  ];
  return {
    table: { widths: [55, ...FRECUENCIAS.map(() => '*')], body },
    layout: { hLineColor: '#e5e7eb', vLineColor: '#e5e7eb' },
    margin: [0, 0, 0, 8],
  };
}

function textoInterpretacionOidoPdf(
  doc: DatosInformeLongitudinalAudiometricoPdf,
  oido: 'Derecho' | 'Izquierdo',
): string {
  const nuevo = oido === 'Derecho' ? doc.interpretacionOidoDerecho : doc.interpretacionOidoIzquierdo;
  if (nuevo && String(nuevo).trim()) return String(nuevo).trim();
  return '';
}

function textoInterpretacionLegadoPdf(doc: DatosInformeLongitudinalAudiometricoPdf): string {
  if (textoInterpretacionOidoPdf(doc, 'Derecho') || textoInterpretacionOidoPdf(doc, 'Izquierdo')) {
    return '';
  }
  return String(doc.interpretacionLongitudinal || '').trim();
}

function bloqueOidoPdf(
  etiqueta: string,
  grafica: string | undefined,
  filas: NonNullable<DatosInformeLongitudinalAudiometricoPdf['matrizDeltas']>,
  interpretacion: string,
  pageBreakBefore = false,
): Content[] {
  return [
    {
      text: `Audiograma — oído ${etiqueta}`,
      style: 'sectionHeader',
      ...(pageBreakBefore ? { pageBreak: 'before' as const } : {}),
    },
    grafica
      ? { image: grafica, width: ANCHO_AUDIOGRAMA_PDF, alignment: 'center', margin: [0, 0, 0, 6] }
      : { text: 'Sin gráfica', fontSize: 8, margin: [0, 0, 0, 6] },
    { text: `Matriz longitudinal de cambios — oído ${etiqueta} (Δ vs basal)`, style: 'sectionHeader' },
    tablaMatrizOido(filas),
    { text: PIE_COLOR, fontSize: 7, italics: true, color: '#6B7280', margin: [0, 0, 0, 6] },
    { text: `Interpretación — oído ${etiqueta}`, style: 'sectionHeader' },
    {
      text: interpretacion || 'Sin interpretación registrada.',
      style: 'paragraph',
      margin: [0, 0, 0, 8],
    },
  ];
}

function tablaResumenPdf(
  resumen: NonNullable<DatosInformeLongitudinalAudiometricoPdf['resumenCronologico']>,
): Content {
  return {
    table: {
      widths: [55, 45, 35, '*', '*', '*'],
      body: [
        [
          { text: 'Fecha', style: 'tableHeader' },
          { text: 'Tipo', style: 'tableHeader' },
          { text: 'Método', style: 'tableHeader' },
          { text: 'Resultado OD', style: 'tableHeader' },
          { text: 'Resultado OI', style: 'tableHeader' },
          { text: 'Cambio vs basal', style: 'tableHeader' },
        ],
        ...resumen.map((r) => [
          { text: fmtFecha(r.fechaAudiometria), style: 'tableCell' },
          { text: fmt(r.tipo), style: 'tableCell' },
          { text: fmt(r.metodoAudiometria), style: 'tableCell' },
          { text: fmtResultadoResumen(r.resultadoOD, r.metodoAudiometria), style: 'tableCell' },
          { text: fmtResultadoResumen(r.resultadoOI, r.metodoAudiometria), style: 'tableCell' },
          { text: fmt(r.cambioRespectoBasal), fontSize: 6.5, alignment: 'left' as const },
        ]),
      ],
    },
    layout: { hLineColor: '#e5e7eb', vLineColor: '#e5e7eb' },
    margin: [0, 0, 0, 8],
  };
}

function formatearTelefono(telefono?: string): string {
  if (!telefono) return '';
  return telefono;
}

const headerText: Content = {
  text: '                                                  INFORME LONGITUDINAL AUDIOMÉTRICO\n',
  style: 'header',
  alignment: 'right',
  margin: [0, 35, 40, 0],
};

export const informeLongitudinalAudiometricoInforme = (
  nombreEmpresa: string,
  trabajador: TrabajadorPdf,
  doc: DatosInformeLongitudinalAudiometricoPdf,
  medicoFirmante: MedicoFirmanteInforme | null,
  enfermeraFirmante: EnfermeraFirmanteInforme | null,
  tecnicoFirmante: TecnicoFirmanteInforme | null,
  proveedorSalud: ProveedorSaludPdf,
  footerFirmantesData?: FooterFirmantesData,
): TDocumentDefinitions => {
  const usarMedico = !!medicoFirmante?.nombre;
  const usarEnfermera = !usarMedico && !!enfermeraFirmante?.nombre;
  const usarTecnico = !usarMedico && !usarEnfermera && !!tecnicoFirmante?.nombre;
  const firmanteActivo = usarMedico ? medicoFirmante : usarEnfermera ? enfermeraFirmante : usarTecnico ? tecnicoFirmante : null;

  const updatedStyles: StyleDictionary = { ...styles };
  updatedStyles.tableHeader = {
    ...updatedStyles.tableHeader,
    fillColor: proveedorSalud.colorInforme || '#343A40',
  };

  const firmaFilename = footerFirmantesData?.esDocumentoFinalizado
    ? footerFirmantesData?.finalizador?.firma?.data
    : firmanteActivo?.firma?.data;
  const firma: Content = firmaFilename
    ? { image: `assets/signatories/${firmaFilename}`, width: 65 }
    : { text: '' };

  const logo: Content = proveedorSalud.logotipoEmpresa?.data
    ? { image: `assets/providers-logos/${proveedorSalud.logotipoEmpresa.data}`, width: 55, margin: [40, 20, 0, 0] }
    : { image: 'assets/RamazziniBrand600x600.png', width: 55, margin: [40, 20, 0, 0] };

  const basal = doc.audiometriaBasalConcentrada || {};
  const metodos = [
    basal.metodoAudiometria,
    ...((doc.audiometriasSubsecuentesConcentradas || []).map((s) => s.metodoAudiometria)),
  ].filter(Boolean);
  const metodosUnicos = [...new Set(metodos.map((m) => String(m)))];

  const identificacion: Content = {
    table: {
      widths: ['18%', '32%', '18%', '32%'],
      body: [
        [
          { text: 'NOMBRE', style: 'label' },
          { text: formatearNombreTrabajador(trabajador), style: 'value' },
          { text: 'PUESTO / ÁREA', style: 'label' },
          { text: fmt(trabajador.puesto), style: 'value' },
        ],
        [
          { text: 'PERIODO', style: 'label' },
          { text: `${fmtFecha(doc.periodoInicio)} — ${fmtFecha(doc.periodoFin)}`, style: 'value' },
          { text: 'BASAL', style: 'label' },
          { text: fmtFecha(basal.fechaAudiometria as string), style: 'value' },
        ],
        [
          { text: 'ESTUDIOS', style: 'label' },
          {
            text: `${doc.numeroAudiometriasIncluidas ?? '—'} · ${metodosUnicos.join(', ') || '—'}`,
            style: 'value',
            colSpan: 3,
          },
          {},
          {},
        ],
      ],
    },
    layout: {
      hLineColor: '#e5e7eb',
      vLineColor: '#e5e7eb',
      hLineWidth: () => 1,
      vLineWidth: () => 1,
    },
    margin: [0, 0, 0, 8],
  };

  const empresaFecha: Content = {
    table: {
      widths: ['60%', '40%'],
      body: [[
        { text: nombreEmpresa, style: 'nombreEmpresa', alignment: 'center' },
        {
          text: [
            { text: 'Fecha del informe: ', style: 'fecha' },
            { text: fmtFecha(doc.fechaInformeLongitudinalAudiometrico), style: 'fecha', bold: true },
          ],
          alignment: 'right',
        },
      ]],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 6],
  };

  const content: Content[] = [
    empresaFecha,
    identificacion,
  ];

  const matriz = doc.matrizDeltas || [];
  const resumen = ordenarPorFechaAsc(doc.resumenCronologico || []);
  content.push({ text: 'Resumen de cada audiometría', style: 'sectionHeader' });
  content.push(tablaResumenPdf(resumen));

  const legado = textoInterpretacionLegadoPdf(doc);
  if (legado) {
    content.push({ text: 'Interpretación longitudinal', style: 'sectionHeader' });
    content.push({ text: legado, style: 'paragraph', margin: [0, 0, 0, 8] });
  }

  content.push({
    text: 'Basal en negro grueso; más reciente destacada; intermedias tenues.',
    fontSize: 7,
    italics: true,
    color: '#6B7280',
    margin: [0, 0, 0, 4],
  });
  content.push(
    ...bloqueOidoPdf(
      'derecho',
      doc.graficaAudiogramaOidoDerecho,
      filasMatrizPorOido(matriz, 'Derecho'),
      textoInterpretacionOidoPdf(doc, 'Derecho'),
    ),
    ...bloqueOidoPdf(
      'izquierdo',
      doc.graficaAudiogramaOidoIzquierdo,
      filasMatrizPorOido(matriz, 'Izquierdo'),
      textoInterpretacionOidoPdf(doc, 'Izquierdo'),
      true,
    ),
  );

  content.push({ text: 'Recomendaciones', style: 'sectionHeader' });
  content.push({
    text: doc.recomendacionesSeguimientoAudiometrico?.trim() || 'Sin recomendaciones registradas.',
    style: 'paragraph',
  });

  return {
    pageSize: 'LETTER',
    pageMargins: [40, 70, 40, 80],
    header: { columns: [logo, headerText] },
    content,
    footer: {
      stack: [
        {
          canvas: [{ type: 'line', x1: 40, y1: 0, x2: 575, y2: 0, lineWidth: 0.5, lineColor: '#9CA3AF' }],
        },
        {
          columns: [
            {
              text: footerFirmantesData?.esDocumentoFinalizado
                ? generarFooterFirmantes(footerFirmantesData, proveedorSalud)
                : [
                    firmanteTieneLineaNombre(firmanteActivo)
                      ? { text: `${formatearTituloYNombreFirmante(firmanteActivo, proveedorSalud.regimenRegulatorio)}\n`, bold: true }
                      : null,
                    firmanteActivo?.numeroCedulaProfesional
                      ? { text: `Cédula Profesional No. ${firmanteActivo.numeroCedulaProfesional}\n` }
                      : null,
                    usarEnfermera ? buildEnfermeraPiePaginaPdfBlock(enfermeraFirmante, 'del informe') : null,
                    usarTecnico ? buildTecnicoPiePaginaPdfBlock(tecnicoFirmante) : null,
                  ].filter((item) => item !== null),
              fontSize: 8,
              margin: [40, 4, 0, 0],
            },
            ...(firmaFilename ? [{ ...firma, margin: [0, -3, 0, 0] as [number, number, number, number] }] : []),
            {
              text: [
                proveedorSalud.nombre ? { text: `${proveedorSalud.nombre}\n`, bold: true, italics: true } : null,
                proveedorSalud.direccion ? { text: `${proveedorSalud.direccion}\n`, italics: true } : null,
                proveedorSalud.municipio && proveedorSalud.estado && proveedorSalud.telefono
                  ? { text: `${proveedorSalud.municipio}, ${proveedorSalud.estado}, Tel. ${formatearTelefono(proveedorSalud.telefono)}\n`, italics: true }
                  : null,
              ].filter((item) => item !== null),
              alignment: 'right',
              fontSize: 8,
              margin: [0, 4, 40, 0],
            },
          ],
        },
      ],
    },
    styles: updatedStyles,
  };
};
