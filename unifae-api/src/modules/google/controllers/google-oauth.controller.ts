import { Controller, Delete, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserRole } from '../../../database/entities/enums';
import { UserEntity } from '../../../database/entities/user.entity';
import { CurrentUser } from '../../identity-access/decorators/current-user.decorator';
import { GoogleOAuthCallbackQueryDto } from '../dto/google-oauth-callback-query.dto';
import { GoogleOAuthService } from '../services/google-oauth.service';

@Controller('google/oauth')
@ApiTags('Google OAuth')
export class GoogleOAuthController {
  constructor(
    private readonly oauthService: GoogleOAuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  status() {
    return this.oauthService.getStatusAsync();
  }

  @Get('connect')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  connect(@CurrentUser() actor: UserEntity) {
    return this.oauthService.buildAuthorizationUrl(actor);
  }

  /** Public callback — Google redirects the browser here with ?code=&state= */
  @Get('callback')
  async callback(@Query() query: GoogleOAuthCallbackQueryDto, @Res() res: Response) {
    const status = await this.oauthService.handleCallback(query.code, query.state);
    const redirect = this.config.get<string>('googleOAuth.successRedirectUrl');
    if (redirect) {
      const url = new URL(redirect);
      url.searchParams.set('googleConnected', status.connected ? '1' : '0');
      return res.redirect(url.toString());
    }
    return res.json({
      message: 'Google Calendar connected successfully.',
      status,
    });
  }

  @Delete('disconnect')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  disconnect() {
    return this.oauthService.disconnect();
  }
}
