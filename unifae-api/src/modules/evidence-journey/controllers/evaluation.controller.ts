import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserRole } from '../../../database/entities/enums';
import { UserEntity } from '../../../database/entities/user.entity';
import { EvaluationService } from '../services/evaluation.service';
import { SubmitEvaluationDto } from '../dto/submit-evaluation.dto';
import { CloseRoomDto } from '../dto/close-room.dto';

@ApiTags('Jornada — Avaliação')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('evidence-journey')
export class EvaluationController {
  constructor(private readonly service: EvaluationService) {}

  @Get('my-rooms')
  @Roles(UserRole.PROFESSOR)
  getMyRooms(@CurrentUser() user: UserEntity) {
    return this.service.getMyRooms(user.id);
  }

  @Get('questions')
  @Roles(UserRole.PROFESSOR)
  getQuestions() {
    return this.service.getQuestions();
  }

  @Post('rooms/:salaId/works/:trabalhoId/evaluate')
  @Roles(UserRole.PROFESSOR)
  submitEvaluation(
    @Param('salaId', ParseIntPipe) salaId: number,
    @Param('trabalhoId', ParseIntPipe) trabalhoId: number,
    @CurrentUser() user: UserEntity,
    @Body() dto: SubmitEvaluationDto,
  ) {
    return this.service.submitEvaluation(salaId, trabalhoId, user.id, dto);
  }

  @Post('rooms/:salaId/close')
  @Roles(UserRole.PROFESSOR)
  closeRoom(
    @Param('salaId', ParseIntPipe) salaId: number,
    @CurrentUser() user: UserEntity,
    @Body() dto: CloseRoomDto,
  ) {
    return this.service.closeRoom(salaId, user.id, dto);
  }
}
