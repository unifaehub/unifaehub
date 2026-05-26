import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { CurrentUser } from '../identity-access/decorators/current-user.decorator';
import type { UserEntity } from '../../database/entities/user.entity';
import { AdminNotesService } from './admin-notes.service';
import { CreateAdminNoteDto } from './dto/create-admin-note.dto';
import { ListAdminNotesQueryDto } from './dto/list-admin-notes.query.dto';
import { UpdateAdminNoteDto } from './dto/update-admin-note.dto';

@Controller('admin-notes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN, UserRole.COORDINATOR)
export class AdminNotesController {
  constructor(private readonly notes: AdminNotesService) {}

  @Get()
  list(@CurrentUser() user: UserEntity, @Query() q: ListAdminNotesQueryDto) {
    return this.notes.list(user, q);
  }

  @Get('requesters')
  requesters() {
    return this.notes.requesters();
  }

  @Post()
  create(@CurrentUser() user: UserEntity, @Body() dto: CreateAdminNoteDto) {
    return this.notes.create({
      description: dto.description,
      requestedBy: dto.requestedBy ?? null,
      observations: dto.observations ?? null,
      status: dto.status,
      createdByUserId: user.id,
    });
  }

  @Patch(':id')
  update(@CurrentUser() user: UserEntity, @Param('id') id: string, @Body() dto: UpdateAdminNoteDto) {
    return this.notes.update(Number(id), {
      description: dto.description,
      requestedBy: dto.requestedBy,
      observations: dto.observations,
      status: dto.status,
      active: dto.active,
      rejectionReason: dto.rejectionReason,
      finishedAt: dto.finishedAt,
      updatedByUserId: user.id,
      actor: user,
    });
  }

  @Patch(':id/deactivate')
  deactivate(@CurrentUser() user: UserEntity, @Param('id') id: string) {
    return this.notes.deactivate(Number(id), user);
  }
}

