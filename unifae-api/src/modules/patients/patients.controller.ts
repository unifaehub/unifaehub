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
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { parsePageLimit } from '../../common/pagination';
import { getRequestContext } from '../../common/http/request-context';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserEntity } from '../../database/entities/user.entity';
import { UserRole } from '../../database/entities/enums';
import { CurrentUser } from '../identity-access/decorators/current-user.decorator';
import { CreatePatientDto } from './dto/create-patient.dto';
import { CreateTriageDto } from './dto/create-triage.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientsService } from './patients.service';

@Controller('patients')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Get()
  list(
    @CurrentUser() actor: UserEntity,
    @Query('courseId') courseId: string,
    @Query('appId') appId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    const cid = Number(courseId);
    const aid = Number(appId);
    const { page: p, limit: l } = parsePageLimit(page, limit, 20, 100);
    if (!Number.isFinite(cid) || !Number.isFinite(aid)) {
      return { data: [], total: 0, page: p, limit: l };
    }
    return this.patients.list(actor, cid, aid, { page: p, limit: l, q: q?.trim() || undefined });
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Get(':id')
  get(@CurrentUser() actor: UserEntity, @Param('id', ParseIntPipe) id: number) {
    return this.patients.get(actor, id);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Post()
  create(
    @CurrentUser() actor: UserEntity,
    @Body() dto: CreatePatientDto,
    @Req() req: Request,
  ) {
    return this.patients.create(actor, dto, getRequestContext(req));
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Patch(':id')
  update(
    @CurrentUser() actor: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
    @Req() req: Request,
  ) {
    return this.patients.update(actor, id, dto, getRequestContext(req));
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR)
  @Delete(':id')
  remove(
    @CurrentUser() actor: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.patients.remove(actor, id, getRequestContext(req));
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Post(':id/triage')
  createTriage(
    @CurrentUser() actor: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTriageDto,
    @Req() req: Request,
  ) {
    return this.patients.createTriage(actor, id, dto, getRequestContext(req));
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Get(':id/triages')
  listTriages(@CurrentUser() actor: UserEntity, @Param('id', ParseIntPipe) id: number) {
    return this.patients.listTriages(actor, id);
  }
}
