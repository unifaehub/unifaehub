import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEntity } from '../../database/entities/app.entity';
import { CategoryEntity } from '../../database/entities/category.entity';
import { ClinicalCaseEntity } from '../../database/entities/clinical-case.entity';
import { CourseMenuNodeEntity } from '../../database/entities/course-menu-node.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { ExerciseAttachmentEntity } from '../../database/entities/exercise-attachment.entity';
import { ExerciseCategoryEntity } from '../../database/entities/exercise-category.entity';
import { ExerciseEntity } from '../../database/entities/exercise.entity';
import { MenuNodeEntity } from '../../database/entities/menu-node.entity';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import { PatientCareEpisodeEntity } from '../../database/entities/patient-care-episode.entity';
import { PatientEntity } from '../../database/entities/patient.entity';
import { PatientExecutionEntity } from '../../database/entities/patient-execution.entity';
import { PrescriptionItemEntity } from '../../database/entities/prescription-item.entity';
import { PrescriptionEntity } from '../../database/entities/prescription.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { PatientAssessmentEntity } from '../../database/entities/patient-assessment.entity';
import { PatientsModule } from '../patients/patients.module';
import { PatientTimelineService } from './patient-timeline.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    PatientsModule,
    TypeOrmModule.forFeature([
      AppEntity,
      CourseEntity,
      UserEntity,
      PatientEntity,
      PatientExecutionEntity,
      PatientCareEpisodeEntity,
      AuditLogEntity,
      PrescriptionEntity,
      PrescriptionItemEntity,
      CategoryEntity,
      ExerciseEntity,
      ExerciseCategoryEntity,
      ExerciseAttachmentEntity,
      MenuNodeEntity,
      CourseMenuNodeEntity,
      ClinicalCaseEntity,
      PatientAssessmentEntity,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, PatientTimelineService],
})
export class ReportsModule {}
