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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserEntity } from '../../database/entities/user.entity';
import { UserRole } from '../../database/entities/enums';
import { CurrentUser } from '../identity-access/decorators/current-user.decorator';
import { CareLocationsService } from './care-locations.service';
import { CreateCareLocationDto } from './dto/create-care-location.dto';
import { UpdateCareLocationDto } from './dto/update-care-location.dto';

@Controller('care-locations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Locais de atendimento')
@ApiBearerAuth()
export class CareLocationsController {
  constructor(private readonly service: CareLocationsService) {}

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Get()
  list(
    @CurrentUser() actor: UserEntity,
    @Query('appId') appId: string,
    @Query('courseId') courseId?: string,
  ) {
    const cid = courseId != null && courseId !== '' ? Number(courseId) : undefined;
    return this.service.list(actor, Number(appId), Number.isFinite(cid) ? cid : undefined);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Get(':id')
  get(@CurrentUser() actor: UserEntity, @Param('id', ParseIntPipe) id: number) {
    return this.service.get(actor, id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@CurrentUser() actor: UserEntity, @Body() dto: CreateCareLocationDto) {
    return this.service.create(actor, dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @CurrentUser() actor: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCareLocationDto,
  ) {
    return this.service.update(actor, id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentUser() actor: UserEntity, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(actor, id);
  }
}
