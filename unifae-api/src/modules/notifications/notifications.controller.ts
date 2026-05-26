import { Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { UserEntity } from '../../database/entities/user.entity';
import { CurrentUser } from '../identity-access/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() actor: UserEntity,
    @Query() query: { page?: string; limit?: string; unreadOnly?: string },
  ) {
    return this.notifications.list(actor, query);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() actor: UserEntity) {
    return this.notifications.unreadCount(actor);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() actor: UserEntity, @Param('id', ParseIntPipe) id: number) {
    return this.notifications.markRead(actor, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() actor: UserEntity) {
    return this.notifications.markAllRead(actor);
  }
}
