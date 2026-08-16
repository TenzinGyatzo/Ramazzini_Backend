/**
 * Regenera las plantillas Excel de importación masiva de trabajadores.
 * Comentarios de encabezado ocultos por defecto (visible al hover).
 *
 * Uso: npm run generate:import-templates
 */
import * as path from 'path';
import * as ExcelJS from 'exceljs';

type ColumnDef = {
  key: string;
  note: string;
};

const NOTE_FONT: Partial<ExcelJS.Font> = {
  size: 9,
  color: { argb: 'FF666666' },
  name: 'Calibri',
};

const SIN_REGIMEN_COLUMNS: ColumnDef[] = [
  { key: 'numeroEmpleado', note: 'OPCIONAL\nNúmero de empleado (1-7 dígitos).' },
  { key: 'nss', note: 'OPCIONAL\nIdentificador de seguridad social (4-30 caracteres).' },
  { key: 'primerApellido', note: 'OPCIONAL' },
  { key: 'segundoApellido', note: 'OPCIONAL (requiere primerApellido)' },
  { key: 'nombre', note: 'OBLIGATORIO' },
  {
    key: 'fechaNacimiento',
    note: 'OBLIGATORIO\nFormato fecha (YYYY-MM-DD o fecha de Excel).\nEdad permitida: 18-70 años.',
  },
  { key: 'sexo', note: 'OBLIGATORIO\nMasculino, Femenino o Intersexual.' },
  {
    key: 'escolaridad',
    note: 'OBLIGATORIO\nPrimaria, Secundaria, Preparatoria, Licenciatura, Maestría, Doctorado o Nula.',
  },
  { key: 'puesto', note: 'OBLIGATORIO' },
  {
    key: 'fechaIngreso',
    note: 'OPCIONAL\nFecha estimada de ingreso.\nSi no se conoce la exacta, usar el día 1 del mes más cercano.',
  },
  { key: 'telefono', note: 'OPCIONAL\n10 dígitos (México).' },
  {
    key: 'estadoCivil',
    note: 'OBLIGATORIO\nSoltero/a, Casado/a, Unión libre, Separado/a, Divorciado/a o Viudo/a.',
  },
];

const SIN_REGIMEN_EXAMPLE: Record<string, string | number | Date> = {
  numeroEmpleado: '1001',
  nss: '',
  primerApellido: 'GARCIA',
  segundoApellido: 'LOPEZ',
  nombre: 'JUAN CARLOS',
  fechaNacimiento: new Date('1990-05-15'),
  sexo: 'Masculino',
  escolaridad: 'Licenciatura',
  puesto: 'Operador',
  fechaIngreso: new Date('2024-01-01'),
  telefono: '6681234567',
  estadoCivil: 'Soltero/a',
};

const SIRES_COLUMNS: ColumnDef[] = [
  ...SIN_REGIMEN_COLUMNS,
  {
    key: 'curp',
    note: 'OBLIGATORIO\nCURP formato RENAPO (18 caracteres).\nSe permite genérica: XXXX999999XXXXXX99',
  },
  {
    key: 'entidadNacimiento',
    note: 'OBLIGATORIO\nCódigo INEGI 2 dígitos (01-32).\nNE = extranjero, 00 = no disponible.',
  },
  {
    key: 'paisNacimiento',
    note: 'OBLIGATORIO\nCATALOG_KEY cat_pais (ej. 142 = México, 248 = NO ESPECIFICADO).',
  },
  {
    key: 'entidadResidencia',
    note: 'OBLIGATORIO\nCódigo INEGI 2 dígitos (01-32, NE, 00, 88 o 99).',
  },
  {
    key: 'municipioResidencia',
    note: 'OBLIGATORIO\nCódigo INEGI 3 dígitos (ej. 015).',
  },
  {
    key: 'localidadResidencia',
    note: 'OBLIGATORIO\nCódigo INEGI 4 dígitos (ej. 0001).\nNND = no hay dato.',
  },
  {
    key: 'paisResidencia',
    note: 'OBLIGATORIO\nCATALOG_KEY cat_pais (ej. 142 = México).',
  },
];

const SIRES_EXAMPLE: Record<string, string | number | Date> = {
  ...SIN_REGIMEN_EXAMPLE,
  curp: 'GALJ900515HDFRPN07',
  entidadNacimiento: '09',
  paisNacimiento: 142,
  entidadResidencia: '09',
  municipioResidencia: '015',
  localidadResidencia: '0001',
  paisResidencia: 142,
  nss: '12345678901',
};

function applyHeaderNote(cell: ExcelJS.Cell, text: string): void {
  cell.note = {
    texts: [{ font: NOTE_FONT, text }],
    margins: { insetmode: 'auto' },
    editAs: 'absolute',
  };
}

async function buildWorkbook(
  sheetName: string,
  columns: ColumnDef[],
  exampleRow: Record<string, string | number | Date>,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((col) => ({
    key: col.key,
    width: Math.max(col.key.length + 4, 16),
  }));

  const headerRow = sheet.getRow(1);
  columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.key;
    cell.font = { bold: true, name: 'Calibri', size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };
    applyHeaderNote(cell, col.note);
  });
  headerRow.commit();

  const dataRow = sheet.getRow(2);
  columns.forEach((col, index) => {
    const value = exampleRow[col.key];
    if (value !== undefined && value !== '') {
      dataRow.getCell(index + 1).value = value;
    }
  });
  dataRow.commit();

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  return workbook;
}

async function main(): Promise<void> {
  const outputDir = path.resolve(
    __dirname,
    '../../frontend/public/template',
  );

  const sinRegimenWb = await buildWorkbook(
    'Datos',
    SIN_REGIMEN_COLUMNS,
    SIN_REGIMEN_EXAMPLE,
  );
  await sinRegimenWb.xlsx.writeFile(
    path.join(outputDir, 'Plantilla para Importar Trabajadores.xlsx'),
  );

  const siresWb = await buildWorkbook('Datos', SIRES_COLUMNS, SIRES_EXAMPLE);
  await siresWb.xlsx.writeFile(
    path.join(outputDir, 'Plantilla Importar Trabajadores SIRES NOM024.xlsx'),
  );

  console.log('Plantillas generadas en:', outputDir);
  console.log('  - Plantilla para Importar Trabajadores.xlsx (SIN_REGIMEN)');
  console.log('  - Plantilla Importar Trabajadores SIRES NOM024.xlsx');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
