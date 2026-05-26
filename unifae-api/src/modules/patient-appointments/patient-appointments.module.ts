import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CareLocationEntity,
  CourseCareLocationEntity,
  PatientAppointmentEntity,
  PatientEntity,
  UserEntity,
} from '../../database/entities';
import { GoogleMeetModule } from '../../infra/google-meet/google-meet.module';
import { PatientAppointmentsController } from './patient-appointments.controller';
import { PatientAppointmentsService } from './patient-appointments.service';
import { AppointmentScheduleValidator } from './validators/appointment-schedule.validator';
import { APPOINTMENT_NOTIFICATION_PORT } from './ports/appointment-notification.port';
import { AppointmentNotificationService } from './services/appointment-notification.service';

@Module({
  imports: [
    GoogleMeetModule,
    TypeOrmModule.forFeature([
      PatientAppointmentEntity,
      PatientEntity,
      CareLocationEntity,
      CourseCareLocationEntity,
      UserEntity,
    ]),
  ],
  controllers: [PatientAppointmentsController],
  providers: [
    PatientAppointmentsService,
    AppointmentScheduleValidator,
    AppointmentNotificationService,
    {
      provide: APPOINTMENT_NOTIFICATION_PORT,
      useExisting: AppointmentNotificationService,
    },
  ],
  exports: [PatientAppointmentsService],
})
export class PatientAppointmentsModule {}
