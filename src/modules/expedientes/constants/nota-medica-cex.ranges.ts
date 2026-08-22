/**
 * Contrato canónico GIIS-B015 / CEX para cantidades de Nota Médica.
 * Debe mantenerse alineado con frontend/src/helpers/notaMedicaCexRanges.ts
 */

export type NotaMedicaCexField =
  | 'peso'
  | 'talla'
  | 'circunferenciaCintura'
  | 'tensionArterialSistolica'
  | 'tensionArterialDiastolica'
  | 'frecuenciaCardiaca'
  | 'frecuenciaRespiratoria'
  | 'temperatura'
  | 'saturacionOxigeno'
  | 'glucemia';

export const NOTA_MEDICA_CEX_SENTINEL = {
  peso: 999,
  talla: 999,
  circunferenciaCintura: 0,
  tensionArterialSistolica: 0,
  tensionArterialDiastolica: 0,
  frecuenciaCardiaca: 0,
  frecuenciaRespiratoria: 0,
  temperatura: 0,
  saturacionOxigeno: 0,
  glucemia: 0,
} as const;

export const NOTA_MEDICA_CEX_RANGES = {
  peso: {
    min: 1,
    max: 400,
    maxIntegerDigits: 3,
    maxDecimalPlaces: 3,
    maxChars: 7,
  },
  talla: { min: 30, max: 220, maxIntegerDigits: 3, maxDecimalPlaces: 0 },
  circunferenciaCintura: {
    min: 20,
    max: 300,
    maxIntegerDigits: 3,
    maxDecimalPlaces: 0,
  },
  tensionArterialSistolica: {
    min: 50,
    max: 300,
    maxIntegerDigits: 3,
    maxDecimalPlaces: 0,
  },
  tensionArterialDiastolica: {
    min: 20,
    max: 200,
    maxIntegerDigits: 3,
    maxDecimalPlaces: 0,
  },
  frecuenciaCardiaca: {
    min: 40,
    max: 220,
    maxIntegerDigits: 3,
    maxDecimalPlaces: 0,
  },
  frecuenciaRespiratoria: {
    min: 10,
    max: 99,
    maxIntegerDigits: 2,
    maxDecimalPlaces: 0,
  },
  temperatura: {
    min: 30,
    max: 44,
    maxIntegerDigits: 2,
    maxDecimalPlaces: 1,
    maxChars: 4,
  },
  saturacionOxigeno: {
    min: 1,
    max: 100,
    maxIntegerDigits: 3,
    maxDecimalPlaces: 0,
  },
  glucemia: { min: 20, max: 999, maxIntegerDigits: 3, maxDecimalPlaces: 0 },
} as const;

export const NOTA_MEDICA_CEX_MESSAGES = {
  peso: {
    min: 'CEX: peso mínimo 1 kg',
    max: 'CEX: peso máximo 400 kg',
    format: 'CEX: peso formato ###.### (máx. 3 enteros y 3 decimales)',
  },
  talla: {
    min: 'CEX: talla mínima 30 cm',
    max: 'CEX: talla máxima 220 cm',
    format: 'CEX: talla debe ser un entero de máximo 3 dígitos',
  },
  circunferenciaCintura: {
    min: 'CEX: circunferencia cintura mínima 20 cm',
    max: 'CEX: circunferencia cintura máxima 300 cm',
    format: 'CEX: circunferencia debe ser un entero de máximo 3 dígitos',
  },
  tensionArterialSistolica: {
    min: 'CEX: sistólica mínimo 50 mmHg',
    max: 'CEX: sistólica máximo 300 mmHg',
    format: 'CEX: sistólica debe ser un entero de máximo 3 dígitos',
  },
  tensionArterialDiastolica: {
    min: 'CEX: diastólica mínimo 20 mmHg',
    max: 'CEX: diastólica máximo 200 mmHg',
    format: 'CEX: diastólica debe ser un entero de máximo 3 dígitos',
  },
  frecuenciaCardiaca: {
    min: 'CEX: mínimo 40 lpm',
    max: 'CEX: máximo 220 lpm',
    format: 'CEX: frecuencia cardíaca debe ser un entero de máximo 3 dígitos',
  },
  frecuenciaRespiratoria: {
    min: 'CEX: mínimo 10 rpm',
    max: 'CEX: máximo 99 rpm',
    format: 'CEX: frecuencia respiratoria debe ser un entero de máximo 2 dígitos',
  },
  temperatura: {
    min: 'CEX: mínimo 30 °C',
    max: 'CEX: máximo 44 °C',
    format: 'CEX: temperatura formato ##.# (máx. 2 enteros y 1 decimal)',
  },
  saturacionOxigeno: {
    min: 'CEX: mínimo 1 %',
    max: 'CEX: máximo 100 %',
    format: 'CEX: saturación debe ser un entero de máximo 3 dígitos',
  },
  glucemia: {
    min: 'CEX: glucemia mínima 20 mg/dl',
    max: 'CEX: glucemia máxima 999 mg/dl',
    format: 'CEX: glucemia debe ser un entero de máximo 3 dígitos',
  },
  taRelacion: 'La presión sistólica debe ser mayor o igual a la diastólica',
  taPareja:
    'Si sistólica o diastólica es 0 (se desconoce), ambas deben ser 0',
  tipoMedicion: 'tipoMedicion: 0=No ayunas, 1=Ayunas',
  resultadoObtenidoaTravesde:
    'resultadoObtenidoaTravesde: 1=Laboratorio, 2=Tira glucosa',
} as const;

export function isCexUnknown(
  field: NotaMedicaCexField,
  value: unknown,
): boolean {
  if (value === undefined || value === null || value === '') return true;
  const n = Number(value);
  if (Number.isNaN(n)) return false;
  return n === NOTA_MEDICA_CEX_SENTINEL[field];
}

/** true si el valor informado debe validarse contra rango/formato CEX */
export function shouldValidateCexValue(
  field: NotaMedicaCexField,
  value: unknown,
): boolean {
  if (value === undefined || value === null || value === '') return false;
  return !isCexUnknown(field, value);
}

function digitParts(value: number): {
  integerDigits: number;
  decimalPlaces: number;
  charLength: number;
} {
  const abs = Math.abs(value);
  const intDigits = String(Math.floor(abs)).length;
  const raw = String(abs);
  const decPart = raw.includes('.') ? raw.split('.')[1] : '';
  return {
    integerDigits: intDigits,
    decimalPlaces: decPart.length,
    charLength: raw.length,
  };
}

/**
 * Valida un campo CEX (rango + formato). Devuelve mensaje de error o null si OK.
 * No valida sentinels / null / undefined (retorna null).
 */
export function validateNotaMedicaCexField(
  field: NotaMedicaCexField,
  value: unknown,
): string | null {
  if (!shouldValidateCexValue(field, value)) return null;

  const n = Number(value);
  if (Number.isNaN(n)) {
    return NOTA_MEDICA_CEX_MESSAGES[field].format;
  }

  const range = NOTA_MEDICA_CEX_RANGES[field];
  const msgs = NOTA_MEDICA_CEX_MESSAGES[field];
  const parts = digitParts(n);

  if (parts.integerDigits > range.maxIntegerDigits) return msgs.format;
  if (parts.decimalPlaces > range.maxDecimalPlaces) return msgs.format;
  if (
    'maxChars' in range &&
    parts.charLength > (range as { maxChars: number }).maxChars
  ) {
    return msgs.format;
  }
  if (range.maxDecimalPlaces === 0 && !Number.isInteger(n)) return msgs.format;

  if (n < range.min) return msgs.min;
  if (n > range.max) return msgs.max;
  return null;
}

export type NotaMedicaCexPayload = {
  tensionArterialSistolica?: number | null;
  tensionArterialDiastolica?: number | null;
  frecuenciaCardiaca?: number | null;
  frecuenciaRespiratoria?: number | null;
  temperatura?: number | null;
  saturacionOxigeno?: number | null;
  peso?: number | null;
  talla?: number | null;
  circunferenciaCintura?: number | null;
  glucemia?: number | null;
  tipoMedicion?: number | null;
  resultadoObtenidoaTravesde?: number | null;
};

/**
 * Valida coherencia TA y todos los campos CEX presentes.
 * @returns primer mensaje de error o null
 */
export function validateNotaMedicaCexQuantities(
  data: NotaMedicaCexPayload,
  options?: { includeSomatometriaGlucemia?: boolean },
): string | null {
  const includeSoma = options?.includeSomatometriaGlucemia !== false;

  const s =
    data.tensionArterialSistolica == null
      ? null
      : Number(data.tensionArterialSistolica);
  const d =
    data.tensionArterialDiastolica == null
      ? null
      : Number(data.tensionArterialDiastolica);

  if (s != null && d != null && !Number.isNaN(s) && !Number.isNaN(d)) {
    const sUnknown = s === 0;
    const dUnknown = d === 0;
    if (sUnknown !== dUnknown) {
      return NOTA_MEDICA_CEX_MESSAGES.taPareja;
    }
    if (!sUnknown && !dUnknown && s < d) {
      return NOTA_MEDICA_CEX_MESSAGES.taRelacion;
    }
  }

  const fields: NotaMedicaCexField[] = [
    'tensionArterialSistolica',
    'tensionArterialDiastolica',
    'frecuenciaCardiaca',
    'frecuenciaRespiratoria',
    'temperatura',
    'saturacionOxigeno',
  ];
  if (includeSoma) {
    fields.push('peso', 'talla', 'circunferenciaCintura', 'glucemia');
  }

  for (const field of fields) {
    const err = validateNotaMedicaCexField(field, data[field]);
    if (err) return err;
  }

  if (includeSoma) {
    const g = data.glucemia;
    if (g != null && Number(g) !== 0 && !Number.isNaN(Number(g))) {
      if (data.tipoMedicion !== 0 && data.tipoMedicion !== 1) {
        return NOTA_MEDICA_CEX_MESSAGES.tipoMedicion;
      }
      if (
        data.resultadoObtenidoaTravesde !== 1 &&
        data.resultadoObtenidoaTravesde !== 2
      ) {
        return NOTA_MEDICA_CEX_MESSAGES.resultadoObtenidoaTravesde;
      }
    }
  }

  return null;
}

/** Normaliza null/undefined de campos CEX a sentinel (persistencia). */
export function normalizeNotaMedicaCexSentinels<T extends Record<string, any>>(
  dto: T,
): T {
  const out: Record<string, any> = { ...dto };
  delete out.primeraVezAnio;
  const fields = Object.keys(NOTA_MEDICA_CEX_SENTINEL) as NotaMedicaCexField[];
  for (const field of fields) {
    if (field in out && (out[field] === null || out[field] === undefined)) {
      out[field] = NOTA_MEDICA_CEX_SENTINEL[field];
    }
  }
  // Condicionales glucemia
  if (
    'glucemia' in out &&
    (out.glucemia === 0 || out.glucemia === NOTA_MEDICA_CEX_SENTINEL.glucemia)
  ) {
    if (out.tipoMedicion === null || out.tipoMedicion === undefined) {
      out.tipoMedicion = -1;
    }
    if (
      out.resultadoObtenidoaTravesde === null ||
      out.resultadoObtenidoaTravesde === undefined
    ) {
      out.resultadoObtenidoaTravesde = -1;
    }
  }
  return out as T;
}
