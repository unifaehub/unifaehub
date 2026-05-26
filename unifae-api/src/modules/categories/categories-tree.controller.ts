import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { CategoriesTreeService } from './categories-tree.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CategoriesTreeController {
  constructor(private readonly categories: CategoriesTreeService) {}

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Get('leaf')
  listLeaf(@Query('appId') appId: string, @Query('courseId') courseId: string) {
    const aid = Number(appId);
    const cid = Number(courseId);
    if (!Number.isFinite(aid) || !Number.isFinite(cid)) {
      return [];
    }
    return this.categories.listLeafByCourse(aid, cid);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Get()
  list(@Query('clinicalCaseId') clinicalCaseId: string) {
    const id = Number(clinicalCaseId);
    if (!Number.isFinite(id)) {
      return [];
    }
    return this.categories.listByCase(id);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categories.remove(id);
  }
}
