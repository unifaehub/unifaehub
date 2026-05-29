import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { INTERCURSO_ADMIN_ROLES } from '../../../common/guards/intercurso-roles';
import { EquipesService } from '../services/equipes.service';
import { CreateEquipeDto } from '../dto/create-equipe.dto';
import { ModerateEquipesDto } from '../dto/moderate-equipes.dto';

@ApiTags('Intercurso — Equipes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('intercurso/equipes')
export class EquipesController {
  constructor(private readonly service: EquipesService) {}

  @Get('stats')
  @Roles(...INTERCURSO_ADMIN_ROLES)
  stats() {
    return this.service.getStats();
  }

  @Get()
  @Roles(...INTERCURSO_ADMIN_ROLES)
  list(
    @Query() query: {
      status?: string;
      modalidadeId?: string;
      q?: string;
      page?: string;
      limit?: string;
    },
  ) {
    return this.service.list(query);
  }

  @Get(':id')
  @Roles(...INTERCURSO_ADMIN_ROLES)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(...INTERCURSO_ADMIN_ROLES)
  create(@Body() dto: CreateEquipeDto) {
    return this.service.create(dto);
  }

  @Patch('moderate')
  @Roles(...INTERCURSO_ADMIN_ROLES)
  moderate(@Body() dto: ModerateEquipesDto) {
    return this.service.moderate(dto);
  }

  @Delete(':id')
  @Roles(...INTERCURSO_ADMIN_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.softDelete(id);
  }
}
