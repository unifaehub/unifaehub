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
  providers: [PatientAppointmentsService],
  exports: [PatientAppointmentsService],
})
export class PatientAppointmentsModule {}
