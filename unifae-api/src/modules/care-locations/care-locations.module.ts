import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CareLocationEntity,
  CourseCareLocationEntity,
  CourseEntity,
} from '../../database/entities';
import { CareLocationsController } from './care-locations.controller';
import { CareLocationsService } from './care-locations.service';

@Module({
  imports: [TypeOrmModule.forFeature([CareLocationEntity, CourseCareLocationEntity, CourseEntity])],
  controllers: [CareLocationsController],
  providers: [CareLocationsService],
  exports: [CareLocationsService],
})
export class CareLocationsModule {}
