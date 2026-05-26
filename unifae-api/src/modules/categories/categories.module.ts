import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEntity } from '../../database/entities/app.entity';
import { CategoryEntity } from '../../database/entities/category.entity';
import { CategoryTypeDefinitionEntity } from '../../database/entities/category-type-definition.entity';
import { ClinicalCaseEntity } from '../../database/entities/clinical-case.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { ExerciseCategoryEntity } from '../../database/entities/exercise-category.entity';
import { CategoriesTreeController } from './categories-tree.controller';
import { CategoriesTreeService } from './categories-tree.service';
import { CategoryTypesController } from './category-types.controller';
import { CategoryTypesService } from './category-types.service';
import { ClinicalCasesController } from './clinical-cases.controller';
import { ClinicalCasesService } from './clinical-cases.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClinicalCaseEntity,
      CategoryTypeDefinitionEntity,
      CategoryEntity,
      CourseEntity,
      AppEntity,
      ExerciseCategoryEntity,
    ]),
  ],
  controllers: [ClinicalCasesController, CategoriesTreeController, CategoryTypesController],
  providers: [ClinicalCasesService, CategoriesTreeService, CategoryTypesService],
  exports: [ClinicalCasesService, CategoriesTreeService, CategoryTypesService],
})
export class CategoriesModule {}
