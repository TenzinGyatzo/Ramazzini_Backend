export class ConsentimientoStatusResponseDto {
  required: boolean;
  accepted: boolean;
  currentVersion?: string;
  consentText?: string;
  declaracionProfesional?: string;
  consent?: {
    acceptedAt: Date;
    acceptedByUserId: string;
    metodo: string;
    version: string;
  };
}

export class ConsentimientoCreatedResponseDto {
  _id: string;
  proveedorSaludId: string;
  trabajadorId: string;
  tipoConsentimiento: string;
  version: string;
  acceptedAt: Date;
  acceptedByUserId: string;
  metodo: string;
  createdAt: Date;
}
