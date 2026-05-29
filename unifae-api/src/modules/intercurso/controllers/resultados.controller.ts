import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Post, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { INTERCURSO_ADMIN_ROLES } from '../../../common/guards/intercurso-roles';
import { ResultadosService } from '../services/resultados.service';
import { CreateResultadoDto } from '../dto/create-resultado.dto';

@ApiTags('Intercurso — Resultados')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('intercurso/resultados')
export class ResultadosController {
  constructor(private readonly service: ResultadosService) {}

  @Get()
  @Roles(...INTERCURSO_ADMIN_ROLES)
  listAll() {
    return this.service.listAll();
  }

  @Get('modalidade/:modalidadeId')
  @Roles(...INTERCURSO_ADMIN_ROLES)
  listByModalidade(@Param('modalidadeId', ParseIntPipe) modalidadeId: number) {
    return this.service.listByModalidade(modalidadeId);
  }

  @Post()
  @Roles(...INTERCURSO_ADMIN_ROLES)
  upsert(@Body() dto: CreateResultadoDto) {
    return this.service.upsert(dto);
  }

  @Delete(':id')
  @Roles(...INTERCURSO_ADMIN_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
