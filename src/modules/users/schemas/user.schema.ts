import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import bcrypt from 'bcrypt';
import { ProveedoresSalud } from 'src/modules/proveedores-salud/entities/proveedores-salud.entity';
import { getDefaultPermissionsForRole } from '../constants/role-permission-policy';

// Define el tipo del documento que extiende los métodos personalizados
export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true, trim: true })
  username: string;

  @Prop({ required: true, trim: true, lowercase: true, unique: true })
  email: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true, trim: true })
  country: string;

  @Prop({ required: true, trim: true })
  password: string;

  @Prop({
    required: true,
    enum: [
      'Principal',
      'Administrador',
      'Médico',
      'Enfermero/a',
      'Administrativo',
      'Técnico Evaluador',
    ],
  })
  role: string;

  @Prop({ default: '' })
  token: string;

  @Prop({ type: Date, default: null })
  tokenExpiresAt: Date | null;

  @Prop({ default: false })
  verified: boolean;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'ProveedoresSalud',
    required: true,
  })
  idProveedorSalud: string;

  @Prop({
    type: {
      gestionarEmpresas: { type: Boolean, default: false },
      gestionarCentrosTrabajo: { type: Boolean, default: false },
      gestionarTrabajadores: { type: Boolean, default: false },
      gestionarDocumentosDiagnostico: { type: Boolean, default: false },
      gestionarDocumentosEvaluacion: { type: Boolean, default: false },
      gestionarDocumentosExternos: { type: Boolean, default: false },
      gestionarOtrosDocumentos: { type: Boolean, default: false },
      accesoCompletoEmpresasCentros: { type: Boolean, default: false },
      accesoDashboardSalud: { type: Boolean, default: false },
      accesoRiesgosTrabajo: { type: Boolean, default: false },
    },
    default: function () {
      return getDefaultPermissionsForRole(this.role);
    },
  })
  permisos: {
    gestionarEmpresas: boolean;
    gestionarCentrosTrabajo: boolean;
    gestionarTrabajadores: boolean;
    gestionarDocumentosDiagnostico: boolean;
    gestionarDocumentosEvaluacion: boolean;
    gestionarDocumentosExternos: boolean;
    gestionarOtrosDocumentos: boolean;
    accesoCompletoEmpresasCentros: boolean;
    accesoDashboardSalud: boolean;
    accesoRiesgosTrabajo: boolean;
  };

  @Prop({ default: true })
  cuentaActiva: boolean;

  /** Instantes de JWT/refresh anteriores a esta fecha no autorizan. No se limpia al reactivar. */
  @Prop({ type: Date, default: null })
  tokensInvalidBefore: Date | null;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'Empresa', default: [] })
  empresasAsignadas: string[];

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    ref: 'CentroTrabajo',
    default: [],
  })
  centrosTrabajoAsignados: string[];

  // NOM-024 GIIS-B015: Discriminadores para optimizar lookup de firmante
  @Prop({
    enum: ['MedicoFirmante', 'EnfermeraFirmante', 'TecnicoFirmante'],
    required: false,
  })
  firmanteTipo?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: false })
  firmanteId?: string;

  async checkPassword(inputPassword: string): Promise<boolean> {
    return bcrypt.compare(inputPassword, this.password);
  }
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ idProveedorSalud: 1, role: 1 });

// Migración: copiar gestionarCuestionariosAdicionales a gestionarOtrosDocumentos al serializar
UserSchema.set('toJSON', {
  transform(_doc, ret) {
    if (ret.permisos && ret.permisos.gestionarOtrosDocumentos === undefined) {
      const legacy = (ret.permisos as any).gestionarCuestionariosAdicionales;
      if (legacy !== undefined) {
        ret.permisos.gestionarOtrosDocumentos = legacy;
      }
    }
    return ret;
  },
});

// Middleware pre-save para hashear el password
UserSchema.pre<UserDocument>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.checkPassword = async function (
  inputPassword: string,
): Promise<boolean> {
  return bcrypt.compare(inputPassword, this.password);
};
