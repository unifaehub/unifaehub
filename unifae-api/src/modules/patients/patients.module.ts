import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEntity } from '../../database/entities/app.entity';
import { ClinicalCaseEntity } from '../../database/entities/clinical-case.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { PatientCareEpisodeEntity } from '../../database/entities/patient-care-episode.entity';
import { PatientEntity } from '../../database/entities/patient.entity';
import { PrescriptionEntity } from '../../database/entities/prescription.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { PatientAssessmentEntity } from '../../database/entities/patient-assessment.entity';
import { AuditModule } from '../audit/audit.module';
import { PatientCareEpisodesController } from './patient-care-episodes.controller';
import { PatientCareEpisodesService } from './patient-care-episodes.service';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PatientEntity,
      PatientCareEpisodeEntity,
      UserEntity,
      CourseEntity,
      AppEntity,
      PrescriptionEntity,
      ClinicalCaseEntity,
      PatientAssessmentEntity,
    ]),
    AuditModule,
  ],
  controllers: [PatientsController, PatientCareEpisodesController],
  providers: [PatientsService, PatientCareEpisodesService],
  exports: [PatientsService],
})
export class PatientsModule {}
