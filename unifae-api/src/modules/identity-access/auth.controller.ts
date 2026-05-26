import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AcceptConsentDto } from '../consent-terms/dto/accept-consent.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { UserEntity } from '../../database/entities/user.entity';
import { CurrentUser } from './decorators/current-user.decorator';
import type { Request } from 'express';
import { getRequestContext } from '../../common/http/request-context';

@Controller('auth')
@ApiTags('Autenticação')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Lista apps ativos para o seletor da tela de login (público). */
  @Get('apps')
  @ApiOperation({ summary: 'Lista apps ativos para o seletor de login.' })
  @ApiOkResponse({
    description: 'Apps disponíveis.',
    schema: { example: [{ id: 1, name: 'Unifae Care - Fisioterapia' }] },
  })
  appsForLogin() {
    return this.auth.listAppsForLogin();
  }

  @Post('login')
  @ApiOperation({ summary: 'Autentica usuário e retorna JWT.' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Login realizado.',
    schema: {
      example: {
        access_token: 'jwt...',
        user: {
          id: 5,
          name: 'Maria Aparecida Souza',
          email: 'paciente1@unifae.local',
          role: 'PATIENT',
          appId: 1,
          courseId: 1,
          nextVisitDate: '2026-05-15T13:00:00.000Z',
        },
        consentRequired: null,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas, usuário inativo ou app incorreto.' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, getRequestContext(req));
  }

  /** Verifica e-mail; se existir, envia código de 8 caracteres. */
  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicita código de redefinição de senha.' })
  @ApiOkResponse({
    description: 'Resposta neutra para evitar enumeração de e-mails.',
    schema: { example: { ok: true, message: 'Se o e-mail existir, enviaremos as instruções.' } },
  })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.auth.requestPasswordReset(dto.email, getRequestContext(req));
  }

  /** Confirma com e-mail + código do e-mail + nova senha e confirmação. */
  @Post('reset-password')
  @ApiOperation({ summary: 'Redefine senha usando código recebido por e-mail.' })
  @ApiOkResponse({ description: 'Senha redefinida.', schema: { example: { ok: true } } })
  @ApiBadRequestResponse({ description: 'Código inválido, expirado ou senha fora das regras.' })
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.auth.resetPassword(
      dto.email,
      dto.code,
      dto.password,
      dto.confirmPassword,
      getRequestContext(req),
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('consent/accept')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aceita termo de consentimento pendente.' })
  acceptConsent(@Body() dto: AcceptConsentDto, @CurrentUser() user: UserEntity, @Req() req: Request) {
    return this.auth.acceptConsent(user, dto.consentTermId, getRequestContext(req));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna usuário autenticado e consentimento pendente.' })
  @ApiOkResponse({
    description: 'Sessão atual.',
    schema: {
      example: {
        id: 5,
        name: 'Maria Aparecida Souza',
        email: 'paciente1@unifae.local',
        role: 'PATIENT',
        appId: 1,
        courseId: 1,
        nextVisitDate: '2026-05-15T13:00:00.000Z',
        lastLoginAt: '2026-05-12T13:00:00.000Z',
        consentRequired: null,
      },
    },
  })
  async me(@CurrentUser() user: UserEntity) {
    const base = await this.auth.buildSessionUser(user);
    const consentRequired = await this.auth.pendingConsent(user);
    return {
      ...base,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      consentRequired,
    };
  }
}
