import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleOAuthCredentialEntity } from '../../database/entities/google-oauth-credential.entity';
import { TokenCipherService } from '../../shared/crypto/token-cipher.service';
import { GoogleOAuthController } from './controllers/google-oauth.controller';
import { GoogleCalendarIntegration } from './integrations/google-calendar.integration';
import { GoogleOAuthClientFactory } from './integrations/google-oauth-client.factory';
import { GoogleOAuthTokenRepository } from './repositories/google-oauth-token.repository';
import { GoogleCalendarMeetService } from './services/google-calendar-meet.service';
import { GoogleOAuthService } from './services/google-oauth.service';
import { GoogleOAuthStateService } from './services/google-oauth-state.service';

@Module({
  imports: [TypeOrmModule.forFeature([GoogleOAuthCredentialEntity])],
  controllers: [GoogleOAuthController],
  providers: [
    TokenCipherService,
    GoogleOAuthClientFactory,
    GoogleCalendarIntegration,
    GoogleOAuthTokenRepository,
    GoogleOAuthStateService,
    GoogleOAuthService,
    GoogleCalendarMeetService,
  ],
  exports: [GoogleOAuthService, GoogleCalendarMeetService, GoogleCalendarIntegration],
})
export class GoogleModule {}
