import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AppEntity,
  CategoryEntity,
  CourseEntity,
  PatientEntity,
  PatientExecutionEntity,
  PrescriptionEntity,
  PrescriptionItemEntity,
  UserEntity,
} from '../../database/entities';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppEntity,
      CourseEntity,
      UserEntity,
      PatientEntity,
      PrescriptionEntity,
      PrescriptionItemEntity,
      PatientExecutionEntity,
      CategoryEntity,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

