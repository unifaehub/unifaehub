import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { getRequestContext } from '../../common/http/request-context';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserEntity } from '../../database/entities/user.entity';
import { UserRole } from '../../database/entities/enums';
import { CurrentUser } from '../identity-access/decorators/current-user.decorator';
import { ConsentTermsService } from './consent-terms.service';
import { CreateConsentTermDto } from './dto/create-consent-term.dto';
import { PatchConsentTermDto } from './dto/patch-consent-term.dto';

@Controller('courses/:courseId/consent-terms')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CourseConsentTermsController {
  constructor(private readonly consentTerms: ConsentTermsService) {}

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Get()
  list(@CurrentUser() actor: UserEntity, @Param('courseId', ParseIntPipe) courseId: number) {
    return this.consentTerms.listForCourse(actor, courseId);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Get(':termId')
  get(
    @CurrentUser() actor: UserEntity,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ) {
    return this.consentTerms.getOneForAdmin(actor, courseId, termId);
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Post()
  create(
    @CurrentUser() actor: UserEntity,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: CreateConsentTermDto,
    @Req() req: Request,
  ) {
    return this.consentTerms.create(actor, courseId, dto, getRequestContext(req));
  }

  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Patch(':termId')
  patch(
    @CurrentUser() actor: UserEntity,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: PatchConsentTermDto,
    @Req() req: Request,
  ) {
    return this.consentTerms.patch(actor, courseId, termId, dto, getRequestContext(req));
  }
}
