import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientAppointmentEntity } from '../../../database/entities/patient-appointment.entity';
import { AppointmentStatus } from '../../../database/entities/enums';
import { AppointmentConflictException } from '../exceptions/appointment-conflict.exception';

export type ScheduleWindow = {
  professionalUserId: number;
  patientId: number;
  scheduledAt: Date;
  durationMinutes: number;
  excludeAppointmentId?: number;
};

@Injectable()
export class AppointmentScheduleValidator {
  constructor(
    @InjectRepository(PatientAppointmentEntity)
    private readonly appointments: Repository<PatientAppointmentEntity>,
  ) {}

  async assertNoConflict(window: ScheduleWindow): Promise<void> {
    const endAt = new Date(window.scheduledAt.getTime() + window.durationMinutes * 60_000);

    const professionalConflict = await this.hasOverlap({
      field: 'professionalUserId',
      value: window.professionalUserId,
      start: window.scheduledAt,
      end: endAt,
      excludeId: window.excludeAppointmentId,
    });

    const patientConflict = await this.hasOverlap({
      field: 'patientId',
      value: window.patientId,
      start: window.scheduledAt,
      end: endAt,
      excludeId: window.excludeAppointmentId,
    });

    if (professionalConflict || patientConflict) {
      throw new AppointmentConflictException({ professionalConflict, patientConflict });
    }
  }

  private async hasOverlap(opts: {
    field: 'professionalUserId' | 'patientId';
    value: number;
    start: Date;
    end: Date;
    excludeId?: number;
  }): Promise<boolean> {
    const qb = this.appointments
      .createQueryBuilder('a')
      .where(`a.${opts.field} = :value`, { value: opts.value })
      .andWhere('a.status = :status', { status: AppointmentStatus.SCHEDULED })
      .andWhere(
        `a.scheduled_at < :endAt AND DATE_ADD(a.scheduled_at, INTERVAL a.duration_minutes MINUTE) > :startAt`,
        { startAt: opts.start, endAt: opts.end },
      );

    if (opts.excludeId != null) {
      qb.andWhere('a.id != :excludeId', { excludeId: opts.excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }
}
