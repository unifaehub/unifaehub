import { ConflictException } from '@nestjs/common';

export class AppointmentConflictException extends ConflictException {
  constructor(details: { professionalConflict?: boolean; patientConflict?: boolean }) {
    const parts: string[] = [];
    if (details.professionalConflict) {
      parts.push('The physiotherapist already has an appointment in this time slot.');
    }
    if (details.patientConflict) {
      parts.push('The patient already has an appointment in this time slot.');
    }
    super({
      error: 'AppointmentScheduleConflict',
      message: parts.join(' ') || 'Schedule conflict detected.',
      ...details,
    });
  }
}
