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
import { KeywordService } from '../services/keyword.service';
import { CreateKeywordDto } from '../dto/create-keyword.dto';

@ApiTags('Jornada — Palavra-Chave')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('evidence-journey/keywords')
export class KeywordController {
  constructor(private readonly service: KeywordService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  list() {
    return this.service.list();
  }

  @Get('current')
  @Roles(UserRole.PROFESSOR, UserRole.ADMIN, UserRole.COORDINATOR)
  getCurrent() {
    return this.service.getCurrentKeyword();
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  create(@Body() dto: CreateKeywordDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
