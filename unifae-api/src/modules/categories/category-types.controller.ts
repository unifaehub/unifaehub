import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { CategoryTypesService } from './category-types.service';
import { CreateCategoryTypeDto } from './dto/create-category-type.dto';
import { UpdateCategoryTypeDto } from './dto/update-category-type.dto';

@Controller('category-types')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CategoryTypesController {
  constructor(private readonly categoryTypes: CategoryTypesService) {}

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Get()
  list(@Query('courseId') courseId?: string) {
    const id = courseId ? Number(courseId) : NaN;
    if (!Number.isFinite(id)) {
      return [];
    }
    return this.categoryTypes.listByCourse(id);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Post()
  create(@Body() dto: CreateCategoryTypeDto) {
    return this.categoryTypes.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryTypeDto) {
    return this.categoryTypes.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryTypes.remove(id);
  }
}
