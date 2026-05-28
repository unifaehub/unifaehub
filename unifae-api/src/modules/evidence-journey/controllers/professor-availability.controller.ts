import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsInt, IsPositive } from 'class-validator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserRole } from '../../../database/entities/enums';
import { ProfessorAvailabilityService } from '../services/professor-availability.service';

class AddAvailabilityDto {
  @IsInt()
  @IsPositive()
  professorId: number;

  @IsDateString()
  dataEvento: string;
}

@ApiTags('Jornada — Professores')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('evidence-journey/professors')
export class ProfessorAvailabilityController {
  constructor(private readonly service: ProfessorAvailabilityService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  listProfessors() {
    return this.service.listProfessors();
  }

  @Get('availabilities')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  getAvailabilities(@Query('dataEvento') dataEvento?: string) {
    return this.service.getAvailabilities(dataEvento);
  }

  @Post('availabilities')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  addAvailability(@Body() dto: AddAvailabilityDto) {
    return this.service.addAvailability(dto.professorId, dto.dataEvento);
  }

  @Delete('availabilities/:id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  removeAvailability(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeAvailability(id);
  }
}
