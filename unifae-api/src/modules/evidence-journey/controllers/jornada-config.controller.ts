import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JORNADA_READ_ROLES, JORNADA_WRITE_ROLES } from '../../../common/guards/jornada-roles';
import { JornadaConfigService } from '../services/jornada-config.service';

@ApiTags('Jornada — Configurações')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('evidence-journey/config')
export class JornadaConfigController {
  constructor(private readonly service: JornadaConfigService) {}

  // ── Config ────────────────────────────────────────────────────────────────

  @Get()
  @Roles(...JORNADA_READ_ROLES)
  getConfig() {
    return this.service.getConfig();
  }

  @Patch()
  @Roles(...JORNADA_WRITE_ROLES)
  updateConfig(@Body() body: { eventoNome?: string; eventoLocal?: string; datasEvento?: string[] }) {
    return this.service.updateConfig(body);
  }

  // ── Sectors ───────────────────────────────────────────────────────────────

  @Get('sectors')
  @Roles(...JORNADA_READ_ROLES)
  listSectors() {
    return this.service.listSectors();
  }

  @Post('sectors')
  @Roles(...JORNADA_WRITE_ROLES)
  createSector(@Body() body: { nome: string; descricao?: string }) {
    return this.service.createSector(body);
  }

  @Patch('sectors/:id')
  @Roles(...JORNADA_WRITE_ROLES)
  updateSector(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { nome?: string; descricao?: string },
  ) {
    return this.service.updateSector(id, body);
  }

  @Delete('sectors/:id')
  @Roles(...JORNADA_WRITE_ROLES)
  deleteSector(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteSector(id);
  }

  // ── Halls ─────────────────────────────────────────────────────────────────

  @Get('sectors/:setorId/halls')
  @Roles(...JORNADA_READ_ROLES)
  listHalls(@Param('setorId', ParseIntPipe) setorId: number) {
    return this.service.listHalls(setorId);
  }

  @Post('sectors/:setorId/halls')
  @Roles(...JORNADA_WRITE_ROLES)
  createHall(
    @Param('setorId', ParseIntPipe) setorId: number,
    @Body() body: { nome: string; andar?: string; capacidade?: number },
  ) {
    return this.service.createHall(setorId, body);
  }

  @Patch('halls/:id')
  @Roles(...JORNADA_WRITE_ROLES)
  updateHall(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { nome?: string; andar?: string; capacidade?: number },
  ) {
    return this.service.updateHall(id, body);
  }

  @Delete('halls/:id')
  @Roles(...JORNADA_WRITE_ROLES)
  deleteHall(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteHall(id);
  }
}
