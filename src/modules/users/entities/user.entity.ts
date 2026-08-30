import { Document } from 'mongoose';

export class User extends Document {
  username: string;
  email: string;
  phone: string;
  country: string;
  password: string;
  role: string;
  token: string;
  idProveedorSalud: string;
  permisos?: {
    gestionarEmpresas: boolean;
    gestionarCentrosTrabajo: boolean;
    gestionarTrabajadores: boolean;
    gestionarDocumentosDiagnostico: boolean;
    gestionarDocumentosEvaluacion: boolean;
    gestionarDocumentosExternos: boolean;
    gestionarCuestionariosAdicionales: boolean;
    accesoCompletoEmpresasCentros: boolean;
    accesoDashboardSalud: boolean;
    accesoRiesgosTrabajo: boolean;
  };
  cuentaActiva?: boolean;
  tokensInvalidBefore?: Date | null;
  empresasAsignadas?: string[];
  centrosTrabajoAsignados?: string[];
  checkPassword: (inputPassword: string) => Promise<boolean>;
}
