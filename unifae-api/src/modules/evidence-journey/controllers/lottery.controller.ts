import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../identity-access/decorators/current-user.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JORNADA_ADMIN_ROLES } from '../../../common/guards/jornada-roles';
import { UserEntity } from '../../../database/entities/user.entity';
import { LotteryService } from '../services/lottery.service';
import { RunLotteryDto } from '../dto/run-lottery.dto';
import { getRequestContext } from '../../../common/http/request-context';
import { Req } from '@nestjs/common';
import type { Request } from 'express';

@ApiTags('Jornada — Sorteio')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('evidence-journey/lottery')
export class LotteryController {
  constructor(private readonly service: LotteryService) {}

  @Post('run')
  @Roles(...JORNADA_ADMIN_ROLES)
  run(
    @Body() dto: RunLotteryDto,
    @CurrentUser() user: UserEntity,
    @Req() req: Request,
  ) {
    const ctx = getRequestContext(req);
    return this.service.runLottery(dto.dataEvento, user.id, ctx);
  }

  @Get('rooms')
  @Roles(...JORNADA_ADMIN_ROLES)
  getRooms(@Query('dataEvento') dataEvento: string) {
    return this.service.getRooms(dataEvento);
  }

  @Get('rooms/status')
  @Roles(...JORNADA_ADMIN_ROLES)
  getRoomsWithStatus(@Query('dataEvento') dataEvento: string) {
    return this.service.getRoomsWithStatus(dataEvento);
  }
}
