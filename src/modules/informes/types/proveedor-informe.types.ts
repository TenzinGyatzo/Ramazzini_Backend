export interface DatosProveedorSaludInforme {
  nombre: string;
  pais: string;
  perfilProveedorSalud: string;
  logotipoEmpresa: { data: string; contentType: string } | null;
  estado: string;
  municipio: string;
  codigoPostal: string;
  direccion: string;
  telefono: string;
  correoElectronico: string;
  sitioWeb: string;
  colorInforme: string;
  semaforizacionActivada?: boolean;
}

export interface ResolveProveedorInformeResult {
  datos: DatosProveedorSaludInforme;
  delegated: boolean;
  proveedorBrandingId: string | null;
  colaboracionId: string | null;
}

export const EMPTY_DATOS_PROVEEDOR_SALUD_INFORME: DatosProveedorSaludInforme = {
  nombre: '',
  pais: '',
  perfilProveedorSalud: '',
  logotipoEmpresa: null,
  estado: '',
  municipio: '',
  codigoPostal: '',
  direccion: '',
  telefono: '',
  correoElectronico: '',
  sitioWeb: '',
  colorInforme: '#343A40',
};
