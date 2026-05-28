import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserRole } from '../../../database/entities/enums';
import { UserEntity } from '../../../database/entities/user.entity';
import { LotteryService } from '../services/lottery.service';
import { RunLotteryDto } from '../dto/run-lottery.dto';
import { getRequestContext } from '../../../common/http/request-context';
import { Req } from '@nestjs/common';
import { Request } from 'express';

@ApiTags('Jornada — Sorteio')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('evidence-journey/lottery')
export class LotteryController {
  constructor(private readonly service: LotteryService) {}

  @Post('run')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  run(
    @Body() dto: RunLotteryDto,
    @CurrentUser() user: UserEntity,
    @Req() req: Request,
  ) {
    const ctx = getRequestContext(req);
    return this.service.runLottery(dto.dataEvento, user.id, ctx);
  }

  @Get('rooms')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  getRooms(@Query('dataEvento') dataEvento: string) {
    return this.service.getRooms(dataEvento);
  }
}
