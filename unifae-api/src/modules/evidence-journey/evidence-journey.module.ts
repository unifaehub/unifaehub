import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { EvidenceWorkEntity } from '../../database/entities/evidence-work.entity';
import { WorkGroupEntity } from '../../database/entities/work-group.entity';
import { PresentationRoomEntity } from '../../database/entities/presentation-room.entity';
import { RoomProfessorEntity } from '../../database/entities/room-professor.entity';
import { RoomBestWorkEntity } from '../../database/entities/room-best-work.entity';
import { DynamicQuestionEntity } from '../../database/entities/dynamic-question.entity';
import { EvaluationEntity } from '../../database/entities/evaluation.entity';
import { KeywordEntity } from '../../database/entities/keyword.entity';
import { ProfessorAvailabilityEntity } from '../../database/entities/professor-availability.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { WorksService } from './services/works.service';
import { LotteryService } from './services/lottery.service';
import { EvaluationService } from './services/evaluation.service';
import { KeywordService } from './services/keyword.service';
import { RankingService } from './services/ranking.service';
import { QuestionsService } from './services/questions.service';
import { ProfessorAvailabilityService } from './services/professor-availability.service';
import { WorksController } from './controllers/works.controller';
import { LotteryController } from './controllers/lottery.controller';
import { EvaluationController } from './controllers/evaluation.controller';
import { KeywordController } from './controllers/keyword.controller';
import { RankingController } from './controllers/ranking.controller';
import { QuestionsController } from './controllers/questions.controller';
import { ProfessorAvailabilityController } from './controllers/professor-availability.controller';
import { ReportProcessor } from './processors/report.processor';
import { IdentityAccessModule } from '../identity-access/identity-access.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EvidenceWorkEntity,
      WorkGroupEntity,
      PresentationRoomEntity,
      RoomProfessorEntity,
      RoomBestWorkEntity,
      DynamicQuestionEntity,
      EvaluationEntity,
      KeywordEntity,
      ProfessorAvailabilityEntity,
      UserEntity,
    ]),
    BullModule.registerQueue({ name: 'evidence-report' }),
    IdentityAccessModule,
    AuditModule,
  ],
  controllers: [
    WorksController,
    LotteryController,
    EvaluationController,
    KeywordController,
    RankingController,
    QuestionsController,
    ProfessorAvailabilityController,
  ],
  providers: [
    WorksService,
    LotteryService,
    EvaluationService,
    KeywordService,
    RankingService,
    QuestionsService,
    ProfessorAvailabilityService,
    ReportProcessor,
  ],
})
export class EvidenceJourneyModule {}
