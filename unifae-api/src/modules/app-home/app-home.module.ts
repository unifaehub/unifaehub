import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ExerciseCategoryEntity,
  MotivationalMessageEntity,
  PatientEntity,
  PatientExecutionEntity,
  PatientPainLogEntity,
  PrescriptionEntity,
  PrescriptionItemEntity,
  PatientAppointmentEntity,
  UserEntity,
  UserSpecialtyEntity,
} from '../../database/entities';
import { AppHomeController } from './app-home.controller';
import { AppHomeService } from './app-home.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PatientEntity,
      PatientPainLogEntity,
      PrescriptionEntity,
      PrescriptionItemEntity,
      PatientAppointmentEntity,
      PatientExecutionEntity,
      ExerciseCategoryEntity,
      MotivationalMessageEntity,
      UserEntity,
      UserSpecialtyEntity,
    ]),
  ],
  controllers: [AppHomeController],
  providers: [AppHomeService],
})
export class AppHomeModule {}

