import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentTermEntity } from '../../database/entities/consent-term.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { UserConsentAcceptanceEntity } from '../../database/entities/user-consent-acceptance.entity';
import { AuditModule } from '../audit/audit.module';
import { ConsentTermsService } from './consent-terms.service';
import { CourseConsentTermsController } from './course-consent-terms.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConsentTermEntity, UserConsentAcceptanceEntity, CourseEntity]),
    AuditModule,
  ],
  controllers: [CourseConsentTermsController],
  providers: [ConsentTermsService],
  exports: [ConsentTermsService],
})
export class ConsentTermsModule {}
