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
import { QuestionsService } from '../services/questions.service';
import { CreateQuestionDto } from '../dto/create-question.dto';

@ApiTags('Jornada — Perguntas')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('evidence-journey/questions')
export class QuestionsController {
  constructor(private readonly service: QuestionsService) {}

  @Get()
  @Roles(...JORNADA_READ_ROLES)
  list() {
    return this.service.list();
  }

  @Post()
  @Roles(...JORNADA_WRITE_ROLES)
  create(@Body() dto: CreateQuestionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(...JORNADA_WRITE_ROLES)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateQuestionDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(...JORNADA_WRITE_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
