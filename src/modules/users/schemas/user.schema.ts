import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import bcrypt from 'bcrypt';
import { ProveedoresSalud } from 'src/modules/proveedores-salud/entities/proveedores-salud.entity';

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

  @Prop({ required: true, enum: ['Principal', 'Administrador', 'Médico', 'Enfermero/a', 'Administrativo', 'Técnico Evaluador'] })
  role: string;

  @Prop({ default: () => Date.now().toString(32) + Math.random().toString(32).substring(2) })
  token: string;

  @Prop({ default: false, })
  verified: boolean

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ProveedoresSalud', required: true })
  idProveedorSalud: string

@Prop({
  type: {
    gestionarEmpresas: { type: Boolean, default: false },
    gestionarCentrosTrabajo: { type: Boolean, default: false },
    gestionarTrabajadores: { type: Boolean, default: false },
    gestionarDocumentosDiagnostico: { type: Boolean, default: false },
    gestionarDocumentosEvaluacion: { type: Boolean, default: false },
    gestionarDocumentosExternos: { type: Boolean, default: false },
    gestionarCuestionariosAdicionales: { type: Boolean, default: false },
    accesoCompletoEmpresasCentros: { type: Boolean, default: false },
    accesoDashboardSalud: { type: Boolean, default: false },
    accesoRiesgosTrabajo: { type: Boolean, default: false }
  },
    default: function() {
      // Permisos por defecto según rol
      if (this.role === 'Principal' || this.role === 'Administrador') {
        return {
          gestionarEmpresas: true,
          gestionarCentrosTrabajo: true,
          gestionarTrabajadores: true,
          gestionarDocumentosDiagnostico: true,
          gestionarDocumentosEvaluacion: true,
          gestionarDocumentosExternos: true,
          gestionarCuestionariosAdicionales: true,
          accesoCompletoEmpresasCentros: true,
          accesoDashboardSalud: true,
          accesoRiesgosTrabajo: true
        };
      } else if (this.role === 'Médico') {
        return {
          gestionarEmpresas: false,
          gestionarCentrosTrabajo: false,
          gestionarTrabajadores: true,
          gestionarDocumentosDiagnostico: true,
          gestionarDocumentosEvaluacion: true,
          gestionarDocumentosExternos: true,
          gestionarCuestionariosAdicionales: true,
          accesoCompletoEmpresasCentros: false,
          accesoDashboardSalud: true,
          accesoRiesgosTrabajo: true
        };
      } else if (this.role === 'Enfermero/a') {
        return {
          gestionarEmpresas: false,
          gestionarCentrosTrabajo: false,
          gestionarTrabajadores: true,
          gestionarDocumentosDiagnostico: false,
          gestionarDocumentosEvaluacion: true,
          gestionarDocumentosExternos: true,
          gestionarCuestionariosAdicionales: true,
          accesoCompletoEmpresasCentros: false,
          accesoDashboardSalud: true,
          accesoRiesgosTrabajo: true
        };
      } else if (this.role === 'Administrativo') {
        return {
          gestionarEmpresas: true,
          gestionarCentrosTrabajo: true,
          gestionarTrabajadores: true,
          gestionarDocumentosDiagnostico: false,
          gestionarDocumentosEvaluacion: false,
          gestionarDocumentosExternos: true,
          gestionarCuestionariosAdicionales: false,
          accesoCompletoEmpresasCentros: true,
          accesoDashboardSalud: true,
          accesoRiesgosTrabajo: true
        };
      } else if (this.role === 'Técnico Evaluador') {
        return {
          gestionarEmpresas: false,
          gestionarCentrosTrabajo: false,
          gestionarTrabajadores: true,
          gestionarDocumentosDiagnostico: false,
          gestionarDocumentosEvaluacion: true,
          gestionarDocumentosExternos: true,
          gestionarCuestionariosAdicionales: true,
          accesoCompletoEmpresasCentros: false,
          accesoDashboardSalud: true,
          accesoRiesgosTrabajo: false
        };
      }
      return {};
    }
  })
  permisos: {
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

  @Prop({ default: true })
  cuentaActiva: boolean;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'Empresa', default: [] })
  empresasAsignadas: string[];

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'CentroTrabajo', default: [] })
  centrosTrabajoAsignados: string[];

  async checkPassword(inputPassword: string): Promise<boolean> {
    return bcrypt.compare(inputPassword, this.password);
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

// Middleware pre-save para hashear el password
UserSchema.pre<UserDocument>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.checkPassword = async function (inputPassword: string): Promise<boolean> {
    return bcrypt.compare(inputPassword, this.password);
  };
  
