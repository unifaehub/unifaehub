import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JORNADA_ADMIN_ROLES } from '../../../common/guards/jornada-roles';
import { RankingService } from '../services/ranking.service';

@ApiTags('Jornada — Ranking')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('evidence-journey/ranking')
export class RankingController {
  constructor(private readonly service: RankingService) {}

  @Get()
  @Roles(...JORNADA_ADMIN_ROLES)
  getRanking(@Query() query: { page?: string; limit?: string }) {
    return this.service.getRanking(query);
  }
}
