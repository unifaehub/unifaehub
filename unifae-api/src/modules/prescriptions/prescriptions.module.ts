import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEntity } from '../../database/entities/app.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { ExerciseEntity } from '../../database/entities/exercise.entity';
import { PatientCareEpisodeEntity } from '../../database/entities/patient-care-episode.entity';
import { PatientEntity } from '../../database/entities/patient.entity';
import { PrescriptionItemEntity } from '../../database/entities/prescription-item.entity';
import { PrescriptionItemStepEntity } from '../../database/entities/prescription-item-step.entity';
import { PrescriptionEntity } from '../../database/entities/prescription.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PrescriptionEntity,
      PrescriptionItemEntity,
      PrescriptionItemStepEntity,
      PatientEntity,
      PatientCareEpisodeEntity,
      ExerciseEntity,
      UserEntity,
      CourseEntity,
      AppEntity,
    ]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
})
export class PrescriptionsModule {}
