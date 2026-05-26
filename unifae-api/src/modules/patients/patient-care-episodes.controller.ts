import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserEntity } from '../../database/entities/user.entity';
import { UserRole } from '../../database/entities/enums';
import { CurrentUser } from '../identity-access/decorators/current-user.decorator';
import { CreateCareEpisodeDto } from './dto/create-care-episode.dto';
import { PatchCareEpisodeDto } from './dto/patch-care-episode.dto';
import { PatientCareEpisodesService } from './patient-care-episodes.service';

@Controller('patients/:patientId/care-episodes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PatientCareEpisodesController {
  constructor(private readonly episodes: PatientCareEpisodesService) {}

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Get()
  list(@CurrentUser() actor: UserEntity, @Param('patientId', ParseIntPipe) patientId: number) {
    return this.episodes.list(actor, patientId);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Post()
  create(
    @CurrentUser() actor: UserEntity,
    @Param('patientId', ParseIntPipe) patientId: number,
    @Body() dto: CreateCareEpisodeDto,
  ) {
    return this.episodes.create(actor, patientId, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Patch(':episodeId')
  patch(
    @CurrentUser() actor: UserEntity,
    @Param('patientId', ParseIntPipe) patientId: number,
    @Param('episodeId', ParseIntPipe) episodeId: number,
    @Body() dto: PatchCareEpisodeDto,
  ) {
    return this.episodes.patch(actor, patientId, episodeId, dto);
  }
}
