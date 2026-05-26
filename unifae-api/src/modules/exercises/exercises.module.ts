import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEntity } from '../../database/entities/app.entity';
import { CategoryEntity } from '../../database/entities/category.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { ExerciseAttachmentEntity } from '../../database/entities/exercise-attachment.entity';
import { ExerciseCategoryEntity } from '../../database/entities/exercise-category.entity';
import { ExerciseEntity } from '../../database/entities/exercise.entity';
import { PrescriptionItemEntity } from '../../database/entities/prescription-item.entity';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExerciseEntity,
      ExerciseAttachmentEntity,
      ExerciseCategoryEntity,
      CategoryEntity,
      CourseEntity,
      AppEntity,
      PrescriptionItemEntity,
    ]),
  ],
  controllers: [ExercisesController],
  providers: [ExercisesService],
  exports: [ExercisesService],
})
export class ExercisesModule {}
