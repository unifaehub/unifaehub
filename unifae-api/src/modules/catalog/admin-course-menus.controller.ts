import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { AdminMenusService } from './admin-menus.service';
import { ReplaceCourseMenuLinksDto } from './dto/replace-course-menu-links.dto';

@Controller('admin/courses')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminCourseMenusController {
  constructor(private readonly adminMenus: AdminMenusService) {}

  @Get(':courseId/menu-links')
  getState(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.adminMenus.getCourseMenuState(courseId);
  }

  @Put(':courseId/menu-links')
  replaceLinks(@Param('courseId', ParseIntPipe) courseId: number, @Body() dto: ReplaceCourseMenuLinksDto) {
    return this.adminMenus.replaceCourseMenuLinks(courseId, dto);
  }
}
