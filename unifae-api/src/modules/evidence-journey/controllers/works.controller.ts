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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../identity-access/decorators/current-user.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserRole } from '../../../database/entities/enums';
import { UserEntity } from '../../../database/entities/user.entity';
import { WorksService } from '../services/works.service';
import { CreateWorkDto } from '../dto/create-work.dto';
import { ModerateWorksDto } from '../dto/moderate-works.dto';

type UploadedMulterFile = { buffer: Buffer; mimetype: string; originalname: string; size: number };

@ApiTags('Jornada — Trabalhos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('evidence-journey/works')
export class WorksController {
  constructor(private readonly service: WorksService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  list(@Query() query: { page?: string; limit?: string; status?: string; q?: string }) {
    return this.service.list(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.STUDENT)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 20 * 1024 * 1024 } }))
  create(
    @Body() dto: CreateWorkDto,
    @CurrentUser() user: UserEntity,
    @UploadedFile() file?: UploadedMulterFile,
  ) {
    return this.service.create(dto, user, file);
  }

  @Post('resubmit')
  @Roles(UserRole.STUDENT)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 20 * 1024 * 1024 } }))
  resubmit(
    @Body() dto: CreateWorkDto,
    @CurrentUser() user: UserEntity,
    @UploadedFile() file?: UploadedMulterFile,
  ) {
    return this.service.resubmit(user.id, dto, file);
  }

  @Patch('moderate')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  moderate(@Body() dto: ModerateWorksDto) {
    return this.service.moderate(dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.softDelete(id);
  }
}
