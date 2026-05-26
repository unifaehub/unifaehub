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
import { PrescriptionStatus, UserRole } from '../../database/entities/enums';
import { CurrentUser } from '../identity-access/decorators/current-user.decorator';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { PrescriptionsService } from './prescriptions.service';

function parseStatus(raw?: string): PrescriptionStatus | undefined {
  if (!raw?.trim()) return undefined;
  const v = raw.trim().toUpperCase();
  if (v === 'PENDING' || v === 'APPROVED' || v === 'REJECTED') {
    return v as PrescriptionStatus;
  }
  return undefined;
}

@Controller('prescriptions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionsService) {}

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Get()
  list(
    @CurrentUser() actor: UserEntity,
    @Query('courseId') courseId: string,
    @Query('appId') appId: string,
    @Query('status') status?: string,
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
    return this.prescriptions.list(actor, cid, aid, parseStatus(status), {
      page: p,
      limit: l,
      q: q?.trim() || undefined,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Get(':id')
  get(@CurrentUser() actor: UserEntity, @Param('id', ParseIntPipe) id: number) {
    return this.prescriptions.get(actor, id);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Post()
  create(
    @CurrentUser() actor: UserEntity,
    @Body() dto: CreatePrescriptionDto,
    @Req() req: Request,
  ) {
    return this.prescriptions.create(actor, dto, getRequestContext(req));
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Patch(':id')
  update(
    @CurrentUser() actor: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrescriptionDto,
    @Req() req: Request,
  ) {
    return this.prescriptions.update(actor, id, dto, getRequestContext(req));
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Delete(':id')
  remove(
    @CurrentUser() actor: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.prescriptions.remove(actor, id, getRequestContext(req));
  }
}
