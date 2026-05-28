import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserRole } from '../../../database/entities/enums';
import { JORNADA_ADMIN_ROLES, JORNADA_READ_ROLES, JORNADA_WRITE_ROLES } from '../../../common/guards/jornada-roles';
import { KeywordService } from '../services/keyword.service';
import { CreateKeywordDto } from '../dto/create-keyword.dto';

@ApiTags('Jornada — Palavra-Chave')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('evidence-journey/keywords')
export class KeywordController {
  constructor(private readonly service: KeywordService) {}

  @Get()
  @Roles(...JORNADA_ADMIN_ROLES)
  list() {
    return this.service.list();
  }

  @Get('current')
  @Roles(...JORNADA_READ_ROLES)
  getCurrent() {
    return this.service.getCurrentKeyword();
  }

  @Post()
  @Roles(...JORNADA_ADMIN_ROLES)
  create(@Body() dto: CreateKeywordDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @Roles(...JORNADA_WRITE_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
