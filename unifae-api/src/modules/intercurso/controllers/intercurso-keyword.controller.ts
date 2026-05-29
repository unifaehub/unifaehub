import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Post, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { INTERCURSO_ADMIN_ROLES } from '../../../common/guards/intercurso-roles';
import { IntercursoKeywordService } from '../services/intercurso-keyword.service';
import { CreateIntercursoKeywordDto } from '../dto/create-intercurso-keyword.dto';

@ApiTags('Intercurso — Palavras-chave')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('intercurso/keywords')
export class IntercursoKeywordController {
  constructor(private readonly service: IntercursoKeywordService) {}

  @Get()
  @Roles(...INTERCURSO_ADMIN_ROLES)
  list() {
    return this.service.list();
  }

  @Post()
  @Roles(...INTERCURSO_ADMIN_ROLES)
  create(@Body() dto: CreateIntercursoKeywordDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @Roles(...INTERCURSO_ADMIN_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
