import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEntity } from '../../database/entities/app.entity';
import { CourseMenuNodeEntity } from '../../database/entities/course-menu-node.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { MenuNodeEntity } from '../../database/entities/menu-node.entity';
import { AdminCourseMenusController } from './admin-course-menus.controller';
import { AdminMenuNodesController } from './admin-menu-nodes.controller';
import { AdminMenusService } from './admin-menus.service';
import { AppsController } from './apps.controller';
import { CoursesController } from './courses.controller';
import { MenusService } from './menus.service';

@Module({
  imports: [TypeOrmModule.forFeature([AppEntity, CourseEntity, MenuNodeEntity, CourseMenuNodeEntity])],
  controllers: [
    AppsController,
    CoursesController,
    AdminMenuNodesController,
    AdminCourseMenusController,
  ],
  providers: [MenusService, AdminMenusService],
  exports: [MenusService, AdminMenusService],
})
export class CatalogModule {}
