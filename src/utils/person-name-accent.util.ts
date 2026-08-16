const ENYE_LOWER_PLACEHOLDER = '\uE000';
const ENYE_UPPER_PLACEHOLDER = '\uE001';

const DIERESIS_PLACEHOLDERS: Record<string, string> = {
  ä: '\uE002',
  ë: '\uE003',
  ï: '\uE004',
  ö: '\uE005',
  ü: '\uE006',
  Ä: '\uE007',
  Ë: '\uE008',
  Ï: '\uE009',
  Ö: '\uE00A',
  Ü: '\uE00B',
};

const DIERESIS_RESTORE: Record<string, string> = Object.fromEntries(
  Object.entries(DIERESIS_PLACEHOLDERS).map(([char, placeholder]) => [
    placeholder,
    char,
  ]),
);

/** Elimina acentos preservando ñ/Ñ y diéresis en vocales (NOM-024 / SIRES). */
export function stripPersonNameAccents(value: string): string {
  let protectedValue = value
    .replace(/ñ/g, ENYE_LOWER_PLACEHOLDER)
    .replace(/Ñ/g, ENYE_UPPER_PLACEHOLDER);

  for (const [char, placeholder] of Object.entries(DIERESIS_PLACEHOLDERS)) {
    protectedValue = protectedValue.replaceAll(char, placeholder);
  }

  let stripped = protectedValue
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const [placeholder, char] of Object.entries(DIERESIS_RESTORE)) {
    stripped = stripped.replaceAll(placeholder, char);
  }

  return stripped
    .replaceAll(ENYE_LOWER_PLACEHOLDER, 'ñ')
    .replaceAll(ENYE_UPPER_PLACEHOLDER, 'Ñ')
    .normalize('NFC');
}
