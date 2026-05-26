import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { parsePageLimit } from '../../common/pagination';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserEntity } from '../../database/entities/user.entity';
import { UserRole } from '../../database/entities/enums';
import { CurrentUser } from '../identity-access/decorators/current-user.decorator';
import { ClinicalCasesService } from './clinical-cases.service';
import { CreateClinicalCaseDto } from './dto/create-clinical-case.dto';
import { UpdateClinicalCaseDto } from './dto/update-clinical-case.dto';

@Controller('clinical-cases')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClinicalCasesController {
  constructor(private readonly clinicalCases: ClinicalCasesService) {}

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Get()
  list(
    @CurrentUser() actor: UserEntity,
    @Query('courseId') courseId?: string,
    @Query('appId') appId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    const { page: p, limit: l } = parsePageLimit(page, limit, 20, 100);
    return this.clinicalCases.list(actor, {
      courseId: courseId ? Number(courseId) : undefined,
      appId: appId ? Number(appId) : undefined,
      page: p,
      limit: l,
      q: q?.trim() || undefined,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.clinicalCases.get(id);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Post()
  create(@Body() dto: CreateClinicalCaseDto) {
    return this.clinicalCases.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClinicalCaseDto) {
    return this.clinicalCases.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clinicalCases.remove(id);
  }
}
