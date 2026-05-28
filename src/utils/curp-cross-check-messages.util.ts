import { Discrepancy } from './curp-validator.util';

const NAME_FIELDS = new Set<Discrepancy['field']>([
  'iniciales',
  'consonantesInternas',
]);

const DEMOGRAPHIC_FIELDS = new Set<Discrepancy['field']>([
  'fechaNacimiento',
  'sexo',
  'entidadNacimiento',
]);

const DEMO_FIELD_ORDER: Array<
  'fechaNacimiento' | 'sexo' | 'entidadNacimiento'
> = ['fechaNacimiento', 'sexo', 'entidadNacimiento'];

const DEMO_FIELD_LABELS: Record<
  'fechaNacimiento' | 'sexo' | 'entidadNacimiento',
  string
> = {
  fechaNacimiento: 'fecha de nacimiento',
  sexo: 'sexo',
  entidadNacimiento: 'entidad de nacimiento',
};

const NAME_FIELD_LABELS: Record<
  'iniciales' | 'consonantesInternas',
  string
> = {
  iniciales: 'iniciales',
  consonantesInternas: 'consonantes internas',
};

/** Mensaje único cuando solo falla un campo demográfico. */
const SINGLE_DEMO_MESSAGES: Record<
  'fechaNacimiento' | 'sexo' | 'entidadNacimiento',
  string
> = {
  fechaNacimiento:
    'La CURP no coincide con la fecha de nacimiento. (posiciones 5 a 10).',
  sexo: 'La CURP no coincide con el sexo (posición 11).',
  entidadNacimiento:
    'La CURP no coincide con la entidad de nacimiento (posiciones 12 y 13).',
};

/** Mensaje único cuando solo falla un campo de nombre. */
const SINGLE_NAME_MESSAGES: Record<
  'iniciales' | 'consonantesInternas',
  string
> = {
  iniciales:
    'La CURP no coincide con las iniciales del nombre y apellidos (posiciones 1 a 4).',
  consonantesInternas:
    'La CURP no coincide con las consonantes internas del nombre y apellidos (posiciones 14 a 16).',
};

const SINGLE_HOMOCLAVE_MESSAGE =
  'La CURP no coincide con la fecha de nacimiento (diferenciador de homonimia, posición 17).';

export interface CurpCrossCheckErrorContent {
  summary: string;
  userMessages: string[];
  message: string;
}

function getSingleFieldMessage(field: Discrepancy['field']): string {
  if (field === 'homoclave') {
    return SINGLE_HOMOCLAVE_MESSAGE;
  }
  if (DEMOGRAPHIC_FIELDS.has(field)) {
    return SINGLE_DEMO_MESSAGES[field as keyof typeof SINGLE_DEMO_MESSAGES];
  }
  if (NAME_FIELDS.has(field)) {
    return SINGLE_NAME_MESSAGES[field as keyof typeof SINGLE_NAME_MESSAGES];
  }
  return 'La CURP no coincide con uno de los datos capturados.';
}

function buildCombinedDemographicMessage(
  fields: Array<'fechaNacimiento' | 'sexo' | 'entidadNacimiento'>,
): string {
  const fieldSet = new Set<
    'fechaNacimiento' | 'sexo' | 'entidadNacimiento'
  >(fields);
  const labels = DEMO_FIELD_ORDER.filter((f) => fieldSet.has(f)).map(
    (f) => DEMO_FIELD_LABELS[f],
  );
  return `La CURP no coincide en datos demográficos: ${labels.join(', ')}.`;
}

function buildCombinedNameMessage(
  fields: Array<'iniciales' | 'consonantesInternas'>,
): string {
  const labels = fields.map((f) => NAME_FIELD_LABELS[f]);
  return `La CURP no coincide con el nombre y apellidos: ${labels.join(', ')}.`;
}

function buildMixedMessage(discrepancies: Discrepancy[]): string {
  const labels: string[] = [];

  for (const field of discrepancies.map((d) => d.field)) {
    if (NAME_FIELDS.has(field)) {
      labels.push(NAME_FIELD_LABELS[field as keyof typeof NAME_FIELD_LABELS]);
    } else if (DEMOGRAPHIC_FIELDS.has(field)) {
      labels.push(
        DEMO_FIELD_LABELS[field as keyof typeof DEMO_FIELD_LABELS],
      );
    } else if (field === 'homoclave') {
      labels.push('diferenciador de homonimia');
    }
  }

  const uniqueLabels = [...new Set(labels)];
  return `La CURP no coincide con varios datos capturados: ${uniqueLabels.join(', ')}.`;
}

/**
 * Genera una frase legible para una discrepancia del cruce CURP A1.
 */
export function formatCurpDiscrepancyUserMessage(
  discrepancy: Discrepancy,
): string {
  return getSingleFieldMessage(discrepancy.field);
}

/**
 * Construye summary, userMessages y message legible para errores A1 del cruce CURP.
 */
export function buildCurpCrossCheckErrorContent(
  discrepancies: Discrepancy[],
  _subjectLabel: 'trabajador' | 'firmante' = 'trabajador',
): CurpCrossCheckErrorContent {
  if (discrepancies.length === 0) {
    const fallback = 'La CURP no coincide con los datos capturados.';
    return {
      summary: fallback,
      userMessages: [],
      message: fallback,
    };
  }

  if (discrepancies.length === 1) {
    const message = getSingleFieldMessage(discrepancies[0].field);
    return {
      summary: message,
      userMessages: [message],
      message,
    };
  }

  const fields = discrepancies.map((d) => d.field);
  const demoFields = fields.filter((f) =>
    DEMOGRAPHIC_FIELDS.has(f),
  ) as Array<'fechaNacimiento' | 'sexo' | 'entidadNacimiento'>;
  const nameFields = fields.filter((f) =>
    NAME_FIELDS.has(f),
  ) as Array<'iniciales' | 'consonantesInternas'>;
  const hasHomoclave = fields.includes('homoclave');

  const categoryCount = [
    nameFields.length > 0,
    demoFields.length > 0,
    hasHomoclave,
  ].filter(Boolean).length;

  let message: string;

  if (
    categoryCount === 1 &&
    demoFields.length >= 2 &&
    demoFields.length === discrepancies.length
  ) {
    message = buildCombinedDemographicMessage(demoFields);
  } else if (
    categoryCount === 1 &&
    nameFields.length >= 2 &&
    nameFields.length === discrepancies.length
  ) {
    message = buildCombinedNameMessage(nameFields);
  } else {
    message = buildMixedMessage(discrepancies);
  }

  const userMessages = discrepancies.map((d) => getSingleFieldMessage(d.field));

  return {
    summary: message,
    userMessages,
    message,
  };
}
