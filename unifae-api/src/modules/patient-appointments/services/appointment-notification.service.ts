import { Injectable, Logger } from '@nestjs/common';
import {
  AppointmentNotificationPayload,
  AppointmentNotificationPort,
} from '../ports/appointment-notification.port';

/**
 * No-op dispatcher — replace with WhatsApp / SMTP adapters when integrations are ready.
 */
@Injectable()
export class AppointmentNotificationService implements AppointmentNotificationPort {
  private readonly logger = new Logger(AppointmentNotificationService.name);

  async notifyAppointmentScheduled(payload: AppointmentNotificationPayload): Promise<void> {
    this.logger.debug(`[scheduled] appointment #${payload.appointmentId} — meet=${payload.meetUrl ?? 'n/a'}`);
  }

  async notifyAppointmentCancelled(payload: AppointmentNotificationPayload): Promise<void> {
    this.logger.debug(`[cancelled] appointment #${payload.appointmentId}`);
  }

  async notifyAppointmentUpdated(payload: AppointmentNotificationPayload): Promise<void> {
    this.logger.debug(`[updated] appointment #${payload.appointmentId}`);
  }
}
