import { AppointmentModality, AppointmentStatus } from '../../../database/entities/enums';

/** Payload prepared for future WhatsApp / e-mail dispatchers. */
export type AppointmentNotificationPayload = {
  appointmentId: number;
  patientId: number;
  patientName: string;
  patientPhone: string | null;
  patientEmail: string | null;
  professionalName: string;
  scheduledAt: string;
  endsAt: string;
  modality: AppointmentModality;
  status: AppointmentStatus;
  meetUrl: string | null;
  careLocationName: string | null;
  careLocationAddress: string | null;
};

export type AppointmentNotificationChannel = 'whatsapp' | 'email';

export const APPOINTMENT_NOTIFICATION_PORT = Symbol('APPOINTMENT_NOTIFICATION_PORT');

export interface AppointmentNotificationPort {
  notifyAppointmentScheduled(payload: AppointmentNotificationPayload): Promise<void>;
  notifyAppointmentCancelled(payload: AppointmentNotificationPayload): Promise<void>;
  notifyAppointmentUpdated(payload: AppointmentNotificationPayload): Promise<void>;
}
