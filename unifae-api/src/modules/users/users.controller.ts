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
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { parsePageLimit } from '../../common/pagination';
import { getRequestContext } from '../../common/http/request-context';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import type { UserEntity } from '../../database/entities/user.entity';
import { CurrentUser } from '../identity-access/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ImportUsersDto } from './dto/import-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

type UploadedMulterFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Usuários')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Get('stats')
  stats(@CurrentUser() actor: UserEntity) {
    return this.users.stats(actor);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Get()
  list(
    @CurrentUser() actor: UserEntity,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('courseId') courseId?: string,
    @Query('appId') appId?: string,
    @Query('active') active?: string,
  ) {
    const { page: p, limit: l } = parsePageLimit(page, limit, 20, 100);
    return this.users.list(
      {
        q: q?.trim() || undefined,
        role: role?.trim() || undefined,
        courseId: courseId ? Number(courseId) : undefined,
        appId: appId ? Number(appId) : undefined,
        active: active === undefined ? undefined : active === 'true' || active === '1',
        page: p,
        limit: l,
      },
      actor,
    );
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Patch(':id')
  update(
    @CurrentUser() actor: UserEntity,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    return this.users.update(Number(id), dto, actor, getRequestContext(req));
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentUser() actor: UserEntity, @Param('id') id: string, @Req() req: Request) {
    return this.users.softDelete(Number(id), actor, getRequestContext(req));
  }

  @Roles(UserRole.ADMIN)
  @Post('import')
  importCsvLike(@Body() dto: ImportUsersDto) {
    return this.users.importMany(dto.users);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Post(':id/profile/photo')
  @ApiOperation({ summary: 'Atualiza foto de perfil pelo painel web.' })
  @ApiParam({ name: 'id', example: 2 })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOkResponse({
    schema: {
      example: { message: 'Foto de perfil atualizada com sucesso.', photoUrl: '/api/v1/users/2/profile/photo' },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  uploadPhoto(
    @CurrentUser() actor: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: UploadedMulterFile,
  ) {
    if (!file) throw new BadRequestException('Envie o arquivo no campo "file".');
    return this.users.uploadProfilePhoto(id, actor, file);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
  @Get(':id/profile/photo')
  @ApiOperation({ summary: 'Lê foto de perfil para o painel web.' })
  @ApiParam({ name: 'id', example: 2 })
  @ApiOkResponse({ description: 'Stream de imagem JPEG, PNG ou WEBP.' })
  async readPhoto(
    @CurrentUser() actor: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StreamableFile> {
    const { stream, mimeType, filename } = await this.users.readProfilePhoto(actor, id);
    return new StreamableFile(stream, {
      type: mimeType,
      disposition: `inline; filename="${filename}"`,
    });
  }
}
