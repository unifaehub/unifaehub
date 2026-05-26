import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../common/decorators/roles.decorator';
import { parsePageLimit } from '../../common/pagination';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserEntity } from '../../database/entities/user.entity';
import { UserRole } from '../../database/entities/enums';
import { CurrentUser } from '../identity-access/decorators/current-user.decorator';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { ExercisesService } from './exercises.service';

type UploadedMulterFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

const UPLOAD_INTERCEPTOR = FilesInterceptor('files', 15, {
  limits: { fileSize: 52 * 1024 * 1024 },
});

@Controller('exercises')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Get()
  list(
    @CurrentUser() user: UserEntity,
    @Query('courseId') courseId: string,
    @Query('appId') appId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    const cid = Number(courseId);
    const aid = Number(appId);
    const { page: p, limit: l } = parsePageLimit(page, limit, 20, 100);
    if (!Number.isFinite(cid) || !Number.isFinite(aid)) {
      return { data: [], total: 0, page: p, limit: l };
    }
    return this.exercises.list(
      { courseId: cid, appId: aid, q: q?.trim() || undefined, page: p, limit: l },
      user,
    );
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Post()
  create(@CurrentUser() user: UserEntity, @Body() dto: CreateExerciseDto) {
    return this.exercises.create(dto, user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Get(':id/attachments/:attachmentId/file')
  async downloadAttachment(
    @Param('id', ParseIntPipe) exerciseId: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ): Promise<StreamableFile> {
    const { stream, mimeType, dispositionName } = await this.exercises.getAttachmentReadStream(
      exerciseId,
      attachmentId,
    );
    return new StreamableFile(stream, {
      type: mimeType,
      disposition: `attachment; filename="${dispositionName}"`,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Post(':id/attachments')
  @UseInterceptors(UPLOAD_INTERCEPTOR)
  uploadAttachments(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: UploadedMulterFile[],
  ) {
    if (!files?.length) {
      throw new BadRequestException('Envie ao menos um arquivo.');
    }
    return this.exercises.addAttachments(id, files);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Delete(':id/attachments/:attachmentId')
  removeAttachment(
    @Param('id', ParseIntPipe) exerciseId: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ) {
    return this.exercises.removeAttachment(exerciseId, attachmentId);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Get(':id')
  get(@CurrentUser() user: UserEntity, @Param('id', ParseIntPipe) id: number) {
    return this.exercises.get(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExerciseDto) {
    return this.exercises.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.exercises.remove(id);
  }
}
