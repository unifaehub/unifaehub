import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserEntity } from '../../database/entities/user.entity';
import { UserRole } from '../../database/entities/enums';
import { CurrentUser } from '../identity-access/decorators/current-user.decorator';
import { CreatePatientAppointmentDto } from './dto/create-patient-appointment.dto';
import { UpdatePatientAppointmentDto } from './dto/update-patient-appointment.dto';
import { PatientAppointmentsService } from './patient-appointments.service';

@Controller('appointments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Agendamentos')
@ApiBearerAuth()
export class PatientAppointmentsController {
  constructor(private readonly service: PatientAppointmentsService) {}

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Get('calendar')
  calendar(
    @CurrentUser() actor: UserEntity,
    @Query('courseId') courseId: string,
    @Query('appId') appId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('professionalUserId') professionalUserId?: string,
  ) {
    const pid =
      professionalUserId != null && professionalUserId !== ''
        ? Number(professionalUserId)
        : undefined;
    return this.service.getCalendar(actor, Number(courseId), Number(appId), {
      from,
      to,
      professionalUserId: Number.isFinite(pid) ? pid : undefined,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Get()
  list(
    @CurrentUser() actor: UserEntity,
    @Query('courseId') courseId: string,
    @Query('appId') appId: string,
    @Query('patientId') patientId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('professionalUserId') professionalUserId?: string,
  ) {
    const pid = patientId != null && patientId !== '' ? Number(patientId) : undefined;
    const profId =
      professionalUserId != null && professionalUserId !== ''
        ? Number(professionalUserId)
        : undefined;
    return this.service.listForStaff(actor, Number(courseId), Number(appId), {
      patientId: Number.isFinite(pid) ? pid : undefined,
      from,
      to,
      professionalUserId: Number.isFinite(profId) ? profId : undefined,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Post()
  create(@CurrentUser() actor: UserEntity, @Body() dto: CreatePatientAppointmentDto) {
    return this.service.create(actor, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Patch(':id')
  update(
    @CurrentUser() actor: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientAppointmentDto,
  ) {
    return this.service.update(actor, id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Post(':id/cancel')
  cancel(@CurrentUser() actor: UserEntity, @Param('id', ParseIntPipe) id: number) {
    return this.service.cancel(actor, id);
  }
}
