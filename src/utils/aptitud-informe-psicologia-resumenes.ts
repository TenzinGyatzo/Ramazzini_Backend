/**
 * Resúmenes para la tabla "Resumen y/o alteraciones" del informe de aptitud.
 * Debe mantenerse alineado con el frontend (VisualizadorAptitud / resumenesCuestionariosPsicologicosAptitud / conclusionEntrevistaPsicologica).
 */

const ORIENTACION_SIN_HALLAZGO = 'Orientación en tiempo, espacio y persona';
const ORIENTACION_SIN_HALLAZGO_LEGACY = 'Orientado en tiempo, espacio y persona';

const VALORES_ESPERADOS: Record<string, string> = {
  apariencia: 'Adecuada',
  actitudHaciaEvaluador: 'Colaboradora',
  nivelCooperacion: 'Alta',
  contactoVisual: 'Adecuado',
  conductaMotora: 'Normal',
  estadoAnimoPredominante: 'Eutímico (normal)',
  afecto: 'Adecuado',
  intensidadEmocional: 'Normal',
  cursoPensamiento: 'Normal',
  alteracionesPensamiento: 'No',
  alteracionesPerceptuales: 'No',
  orientacion: ORIENTACION_SIN_HALLAZGO,
  atencionConcentracion: 'Adecuada',
  memoria: 'Conservada',
  juicio: 'Conservado',
  concienciaEstado: 'Presente',
  relacionesInterpersonales: 'Adecuadas',
  desempenoLaboralAutorreporte: 'Adecuado',
  manejoEstres: 'Adecuado',
  ideacionSuicida: 'No',
};

const TEXTO_SIN_HALLAZGOS_RESUMEN_ENTREVISTA =
  'Sin hallazgos significativos en la entrevista psicológica estructurada.';

function joinHallazgos(frases: string[]): string {
  const f = frases.filter(Boolean);
  if (f.length === 0) return '';
  if (f.length === 1) return f[0];
  if (f.length === 2) return `${f[0]} y ${f[1]}`;
  return `${f.slice(0, -1).join(', ')} y ${f[f.length - 1]}`;
}

function hallazgoPorCampo(campo: string, valor: unknown): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  if (campo === 'orientacion') {
    if (valor === ORIENTACION_SIN_HALLAZGO || valor === ORIENTACION_SIN_HALLAZGO_LEGACY)
      return null;
  }
  const esp = VALORES_ESPERADOS[campo];
  if (esp !== undefined && valor === esp) return null;

  switch (campo) {
    case 'apariencia':
      if (valor === 'Descuidada') return 'apariencia descuidada';
      if (valor === 'Incongruente con el contexto')
        return 'apariencia incongruente con el contexto';
      return `apariencia ${String(valor).toLowerCase()}`;
    case 'actitudHaciaEvaluador':
      if (valor === 'Indiferente') return 'actitud indiferente';
      if (valor === 'Hostil') return 'actitud hostil';
      if (valor === 'Evasiva') return 'actitud evasiva';
      return `actitud ${String(valor).toLowerCase()}`;
    case 'nivelCooperacion':
      if (valor === 'Media') return 'cooperación media';
      if (valor === 'Baja') return 'cooperación baja';
      return null;
    case 'contactoVisual':
      if (valor === 'Escaso') return 'contacto visual escaso';
      if (valor === 'Evitativo') return 'contacto visual evitativo';
      if (valor === 'Excesivo') return 'contacto visual excesivo';
      return null;
    case 'conductaMotora':
      if (valor === 'Inquietud psicomotora') return 'inquietud psicomotora';
      if (valor === 'Retardo psicomotor') return 'retardo psicomotor';
      if (valor === 'Movimientos inusuales') return 'movimientos motores inusuales';
      return `conducta motora ${String(valor).toLowerCase()}`;
    case 'estadoAnimoPredominante':
      if (valor === 'Ansioso') return 'ansiedad';
      if (valor === 'Deprimido') return 'síntomas depresivos';
      if (valor === 'Irritable') return 'irritabilidad';
      return null;
    case 'afecto':
      if (valor === 'Plano') return 'afecto plano';
      if (valor === 'Lábil') return 'afecto lábil';
      if (valor === 'Incongruente') return 'afecto incongruente';
      return null;
    case 'intensidadEmocional':
      if (valor === 'Disminuida') return 'intensidad emocional disminuida';
      if (valor === 'Aumentada') return 'hiperreactividad emocional';
      return null;
    case 'cursoPensamiento':
      if (valor === 'Acelerado') return 'curso del pensamiento acelerado';
      if (valor === 'Enlentecido') return 'curso del pensamiento enlentecido';
      if (valor === 'Disgregado') return 'curso del pensamiento disgregado';
      return null;
    case 'alteracionesPensamiento':
      return valor === 'Sí' ? 'alteraciones del pensamiento' : null;
    case 'alteracionesPerceptuales':
      return valor === 'Sí' ? 'alteraciones perceptuales' : null;
    case 'orientacion':
      if (valor === 'Desorientación parcial') return 'desorientación parcial';
      if (valor === 'Desorientación global') return 'desorientación global';
      return null;
    case 'atencionConcentracion':
      if (valor === 'Disminuida') return 'atención disminuida';
      if (valor === 'Muy limitada') return 'atención muy limitada';
      return null;
    case 'memoria':
      if (valor === 'Leve alteración') return 'leve alteración de la memoria';
      if (valor === 'Alteración significativa')
        return 'alteración significativa de la memoria';
      return null;
    case 'juicio':
      if (valor === 'Parcialmente alterado') return 'juicio parcialmente alterado';
      if (valor === 'Alterado') return 'juicio alterado';
      return null;
    case 'concienciaEstado':
      if (valor === 'Parcial') return 'conciencia de estado parcial';
      if (valor === 'Ausente') return 'conciencia de estado ausente';
      return null;
    case 'relacionesInterpersonales':
      if (valor === 'Conflictos ocasionales')
        return 'conflictos interpersonales ocasionales';
      if (valor === 'Conflictos frecuentes')
        return 'conflictos interpersonales frecuentes';
      if (valor === 'Aislamiento') return 'aislamiento social';
      return null;
    case 'desempenoLaboralAutorreporte':
      if (valor === 'Disminuido')
        return 'desempeño laboral disminuido (autorreporte)';
      if (valor === 'Inestable') return 'desempeño laboral inestable (autorreporte)';
      return null;
    case 'manejoEstres':
      if (valor === 'Limitado') return 'manejo del estrés limitado';
      if (valor === 'Inadecuado') return 'manejo del estrés inadecuado';
      return null;
    case 'ideacionSuicida':
      return valor === 'Sí' ? 'ideación suicida' : null;
    default:
      return null;
  }
}

const ORDEN_CAMPOS_ENTREVISTA: string[] = [
  'apariencia',
  'actitudHaciaEvaluador',
  'nivelCooperacion',
  'contactoVisual',
  'conductaMotora',
  'estadoAnimoPredominante',
  'afecto',
  'intensidadEmocional',
  'cursoPensamiento',
  'alteracionesPensamiento',
  'alteracionesPerceptuales',
  'orientacion',
  'atencionConcentracion',
  'memoria',
  'juicio',
  'concienciaEstado',
  'relacionesInterpersonales',
  'desempenoLaboralAutorreporte',
  'manejoEstres',
  'ideacionSuicida',
];

function esValorEsperadoEntrevista(campo: string, v: unknown): boolean {
  const esp = VALORES_ESPERADOS[campo];
  if (campo === 'orientacion') {
    return v === ORIENTACION_SIN_HALLAZGO || v === ORIENTACION_SIN_HALLAZGO_LEGACY;
  }
  return v === esp;
}

function hayHallazgosSignificativosEntrevista(fd: Record<string, unknown>): boolean {
  for (const campo of ORDEN_CAMPOS_ENTREVISTA) {
    const v = fd[campo];
    if (v === undefined || v === null || v === '') continue;
    if (!esValorEsperadoEntrevista(campo, v)) return true;
  }
  return false;
}

export function resumenTablaEntrevistaPsicologica(doc: Record<string, unknown> | null | undefined): string {
  if (!doc || typeof doc !== 'object') {
    return '';
  }
  if (!hayHallazgosSignificativosEntrevista(doc)) {
    return TEXTO_SIN_HALLAZGOS_RESUMEN_ENTREVISTA;
  }
  const hallazgos: string[] = [];
  for (const campo of ORDEN_CAMPOS_ENTREVISTA) {
    const frase = hallazgoPorCampo(campo, doc[campo]);
    if (frase) hallazgos.push(frase);
  }
  if (hallazgos.length === 0) {
    return TEXTO_SIN_HALLAZGOS_RESUMEN_ENTREVISTA;
  }
  return `Hallazgos: ${joinHallazgos(hallazgos)}.`;
}

// ---------- MDQ ----------

const MDQ_SI = 'Sí';

const CAMPOS_MDQ_P1 = [
  'p1ExaltadoComportamientoNoHabitualOMetidoProblemas',
  'p1IrritableGritosPeleas',
  'p1MasSeguridadQueLoHabitual',
  'p1DormiaMenosSinNecesitarMasSueno',
  'p1HablabaMasOMasRapido',
  'p1PensamientosAgolpados',
  'p1DistraccionDificultadConcentracion',
  'p1MasEnergiaQueLoHabitual',
  'p1MasActivoOMasCosasQueLoHabitual',
  'p1MasSocialExtrovertido',
  'p1MasApetitoSexual',
  'p1CosasExageradasRiesgosas',
  'p1GastoDineroProblemas',
] as const;

function contarSiMdqP1(datos: Record<string, unknown> | null | undefined): number {
  if (!datos) return 0;
  let n = 0;
  for (const campo of CAMPOS_MDQ_P1) {
    if (datos[campo] === MDQ_SI) n++;
  }
  return n;
}

function cumpleCriterioTriajePositivoMdq(
  datos: Record<string, unknown> | null | undefined,
): boolean {
  if (!datos) return false;
  if (contarSiMdqP1(datos) < 7) return false;
  if (datos.p2SituacionesMismoPeriodo !== MDQ_SI) return false;
  const p3 = datos.p3NivelProblemaCausado;
  return p3 === 'Problemas moderados' || p3 === 'Problemas serios';
}

export function resumenTablaTrastornosEstadoAnimo(
  d: Record<string, unknown> | null | undefined,
): string {
  if (!d || typeof d !== 'object') return '';
  return cumpleCriterioTriajePositivoMdq(d)
    ? 'Positivo para riesgo de trastorno bipolar'
    : 'Negativo para riesgo de trastorno bipolar';
}

// ---------- PQ-B ----------

const PUNTO_POR_GRADO: Record<string, number> = {
  'Totalmente en desacuerdo': 0,
  'En desacuerdo': 1,
  Neutral: 2,
  'De acuerdo': 3,
  'Totalmente de acuerdo': 4,
};

function puntosMalestarPorGrado(grado: string | undefined): number | null {
  if (!grado || typeof grado !== 'string') return null;
  if (grado in PUNTO_POR_GRADO) return PUNTO_POR_GRADO[grado];
  return null;
}

function contarFrecuenciaPQB(datos: Record<string, unknown> | undefined): number {
  if (!datos) return 0;
  let c = 0;
  for (let n = 1; n <= 21; n++) {
    const k = `p${n}`;
    if (datos[k] === 'Sí') c++;
  }
  return c;
}

function sumarMalestarPQB(datos: Record<string, unknown> | undefined): number {
  if (!datos) return 0;
  let s = 0;
  for (let n = 1; n <= 21; n++) {
    const pk = `p${n}`;
    if (datos[pk] !== 'Sí') continue;
    const gk = `p${n}GradoAcuerdoStatement`;
    const g = datos[gk];
    const pts = typeof g === 'string' ? puntosMalestarPorGrado(g) : null;
    if (pts !== null) s += pts;
  }
  return s;
}

function esPositivoRiesgoPsicoticoPQB(frecuencia: number, malestar: number): boolean {
  return frecuencia > 6 && malestar > 13;
}

export function resumenTablaCuestionarioProdromalBreve(
  d: Record<string, unknown> | null | undefined,
): string {
  if (!d || typeof d !== 'object') return '';
  const f = contarFrecuenciaPQB(d);
  const m = sumarMalestarPQB(d);
  return esPositivoRiesgoPsicoticoPQB(f, m)
    ? 'Positivo para riesgo psicótico'
    : 'Negativo para riesgo psicótico';
}

// ---------- MSI-BPD / TLP ----------

const CAMPOS_MSI_BPD_TLP = [
  'relacionesCercanasDiscusionesRupturas',
  'autolesionIntentoSuicidio',
  'impulsividadOtrosDosProblemas',
  'extremadamenteMalHumor',
  'enojadoFrecuenteActuaEnojadoSarcastico',
  'desconfianzaOtrasPersonas',
  'sensacionIrrealidadEntornoIrreal',
  'vacioCronico',
  'faltaIdentidadQuienEs',
  'esfuerzosEvitarAbandono',
] as const;

function puntajeTrastornoLimitePersonalidad(
  d: Record<string, unknown> | null | undefined,
): number {
  if (!d || typeof d !== 'object') return 0;
  return CAMPOS_MSI_BPD_TLP.reduce((acc, k) => acc + (d[k] === 'Sí' ? 1 : 0), 0);
}

export function resumenTablaTrastornoLimitePersonalidad(
  d: Record<string, unknown> | null | undefined,
): string {
  if (!d || typeof d !== 'object') return '';
  const p = puntajeTrastornoLimitePersonalidad(d);
  if (p <= 4) return 'Síntomas improbables de TLP presentes.';
  if (p <= 6) return 'Posibles síntomas de TLP presentes.';
  return 'Probable presencia de síntomas de TLP.';
}
