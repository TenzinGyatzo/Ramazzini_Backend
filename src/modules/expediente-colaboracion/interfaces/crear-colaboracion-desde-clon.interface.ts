export interface TrabajadorMapEntry {
  origenId: string;
  destinoId: string;
}

export interface CrearColaboracionDesdeClonParams {
  proveedorOrigenId: string;
  proveedorDestinoId: string;
  centroOrigenId: string;
  centroDestinoId: string;
  empresaOrigenId: string;
  empresaDestinoId: string;
  trabajadorMap: TrabajadorMapEntry[];
  autorizadoPor?: string;
  creadoPor?: string;
  cloneRunId?: string;
}
