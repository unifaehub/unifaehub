import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserRole } from '../../../database/entities/enums';
import { RankingService } from '../services/ranking.service';

@ApiTags('Jornada — Ranking')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('evidence-journey/ranking')
export class RankingController {
  constructor(private readonly service: RankingService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  getRanking(@Query() query: { page?: string; limit?: string }) {
    return this.service.getRanking(query);
  }
}
