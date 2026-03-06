import * as fs from 'fs';
import * as path from 'path';

export interface GiisSchemaField {
  id: number;
  name: string;
  description?: string;
  type?: { kind: string; maxLength?: number };
  requiredColumn: boolean;
  confidential?: boolean;
  validationRaw?: string;
}

export interface GiisSchema {
  guide: string;
  version?: string;
  encoding: string;
  delimiter: string;
  listDelimiter: string;
  subattrDelimiter: string;
  fields: GiisSchemaField[];
}

const SCHEMAS_DIR = 'docs/nom-024/giis_schemas';

/**
 * Load GIIS schema JSON from docs/nom-024/giis_schemas/{guide}.schema.json.
 * Path is resolved from process.cwd() (backend root).
 * Fields are returned in order of id.
 */
export function loadGiisSchema(guide: 'CEX'): GiisSchema {
  const baseDir = process.cwd();
  const schemaPath = path.join(baseDir, SCHEMAS_DIR, `${guide}.schema.json`);
  const raw = fs.readFileSync(schemaPath, 'utf-8');
  const data = JSON.parse(raw) as {
    guide: string;
    version?: string;
    encoding: string;
    delimiter: string;
    listDelimiter: string;
    subattrDelimiter: string;
    fields: GiisSchemaField[];
  };
  const fields = (data.fields || []).slice().sort((a, b) => a.id - b.id);
  return {
    guide: data.guide,
    version: data.version,
    encoding: data.encoding || 'windows-1252',
    delimiter: data.delimiter || '|',
    listDelimiter: data.listDelimiter || '&',
    subattrDelimiter: data.subattrDelimiter || '#',
    fields,
  };
}
