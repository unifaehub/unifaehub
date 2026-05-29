import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Patch, Post, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { INTERCURSO_ADMIN_ROLES } from '../../../common/guards/intercurso-roles';
import { ModalidadesService } from '../services/modalidades.service';
import { CreateModalidadeDto } from '../dto/create-modalidade.dto';

@ApiTags('Intercurso — Modalidades')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('intercurso/modalidades')
export class ModalidadesController {
  constructor(private readonly service: ModalidadesService) {}

  @Get()
  @Roles(...INTERCURSO_ADMIN_ROLES)
  list() {
    return this.service.list();
  }

  @Get(':id')
  @Roles(...INTERCURSO_ADMIN_ROLES)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(...INTERCURSO_ADMIN_ROLES)
  create(@Body() dto: CreateModalidadeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(...INTERCURSO_ADMIN_ROLES)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateModalidadeDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(...INTERCURSO_ADMIN_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
