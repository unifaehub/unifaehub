export enum UserRole {
  ADMIN = 'ADMIN',
  COORDINATOR = 'COORDINATOR',
  PROFESSOR = 'PROFESSOR',
  STUDENT = 'STUDENT',
  PATIENT = 'PATIENT',
}

export enum PrescriptionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ExecutionStatus {
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  SKIPPED = 'SKIPPED',
}

/** Registro diário de sensação de dor no app. */
export enum PatientPainLevel {
  NONE = 'NONE',
  MILD = 'MILD',
  SEVERE = 'SEVERE',
}

export enum EventAttendanceStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

/** Linha do tempo de cuidado do paciente (problemas / fases). */
export enum CareEpisodeStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  ARCHIVED = 'ARCHIVED',
}

export enum PatientRiskLevel {
  PENDING = 'PENDING',
  RED = 'RED',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
}

/** Modalidade do atendimento agendado. */
export enum AppointmentModality {
  IN_PERSON = 'IN_PERSON',
  ONLINE = 'ONLINE',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}
