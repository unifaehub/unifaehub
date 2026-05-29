import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsDateString, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JORNADA_ADMIN_ROLES } from '../../../common/guards/jornada-roles';
import { ProfessorAvailabilityService } from '../services/professor-availability.service';

class AddAvailabilityDto {
  @IsInt()
  @IsPositive()
  professorId: number;

  @IsDateString()
  dataEvento: string;
}

class AutoRegisterDto {
  @IsDateString()
  dataEvento: string;
}

class SetScheduleDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  diasSemana?: string[] | null;
}

@ApiTags('Jornada — Professores')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('evidence-journey/professors')
export class ProfessorAvailabilityController {
  constructor(private readonly service: ProfessorAvailabilityService) {}

  @Get()
  @Roles(...JORNADA_ADMIN_ROLES)
  listProfessors() {
    return this.service.listProfessors();
  }

  /** Professores NÃO cadastrados para a data com disponibilidade semanal compatível. */
  @Get('eligible')
  @Roles(...JORNADA_ADMIN_ROLES)
  getEligible(@Query('dataEvento') dataEvento: string) {
    return this.service.getEligibleForDate(dataEvento);
  }

  @Get('availabilities')
  @Roles(...JORNADA_ADMIN_ROLES)
  getAvailabilities(@Query('dataEvento') dataEvento?: string) {
    return this.service.getAvailabilities(dataEvento);
  }

  @Post('availabilities')
  @Roles(...JORNADA_ADMIN_ROLES)
  addAvailability(@Body() dto: AddAvailabilityDto) {
    return this.service.addAvailability(dto.professorId, dto.dataEvento);
  }

  /** Registra automaticamente todos os professores elegíveis para a data. */
  @Post('availabilities/auto')
  @Roles(...JORNADA_ADMIN_ROLES)
  autoRegister(@Body() dto: AutoRegisterDto) {
    return this.service.autoRegister(dto.dataEvento);
  }

  @Delete('availabilities/:id')
  @Roles(...JORNADA_ADMIN_ROLES)
  removeAvailability(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeAvailability(id);
  }

  @Patch(':id/schedule')
  @Roles(...JORNADA_ADMIN_ROLES)
  setSchedule(@Param('id', ParseIntPipe) id: number, @Body() dto: SetScheduleDto) {
    return this.service.setSchedule(id, dto.diasSemana ?? null);
  }
}
