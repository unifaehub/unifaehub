import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { INTERCURSO_ADMIN_ROLES } from '../../../common/guards/intercurso-roles';
import { IntercursoConfigService } from '../services/intercurso-config.service';
import { UpdateIntercursoConfigDto } from '../dto/update-intercurso-config.dto';

@ApiTags('Intercurso — Configuração')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('intercurso/config')
export class IntercursoConfigController {
  constructor(private readonly service: IntercursoConfigService) {}

  @Get()
  @Roles(...INTERCURSO_ADMIN_ROLES)
  get() {
    return this.service.get();
  }

  @Put()
  @Roles(...INTERCURSO_ADMIN_ROLES)
  update(@Body() dto: UpdateIntercursoConfigDto) {
    return this.service.update(dto);
  }
}
