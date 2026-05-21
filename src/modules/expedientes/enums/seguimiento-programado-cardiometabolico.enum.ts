export enum EstadoSeguimientoProgramadoCardiometabolico {
  PROGRAMADA = 'Programada',
  REALIZADA = 'Realizada',
  NO_ASISTIO = 'No asistió',
  CANCELADA = 'Cancelada',
}

export enum MotivoSeguimientoProgramadoCardiometabolico {
  CONTROL_PERIODICO = 'Control periódico',
  SEGUIMIENTO_POR_DESCONTROL = 'Seguimiento por descontrol',
  EXAMEN_MEDICO_INICIAL = 'Examen médico inicial',
  EXAMEN_MEDICO_PERIODICO = 'Examen médico periódico',
  OTRO = 'Otro',
}

export const ESTADOS_SEGUIMIENTO_PROGRAMADO_CARDIOMETABOLICO = Object.values(
  EstadoSeguimientoProgramadoCardiometabolico,
);

export const MOTIVOS_SEGUIMIENTO_PROGRAMADO_CARDIOMETABOLICO = Object.values(
  MotivoSeguimientoProgramadoCardiometabolico,
);
