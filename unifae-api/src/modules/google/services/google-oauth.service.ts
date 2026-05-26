import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { TokenCipherService } from '../../../shared/crypto/token-cipher.service';
import { UserEntity } from '../../../database/entities/user.entity';
import {
  GOOGLE_OAUTH_SCOPES,
  GoogleOAuthClientFactory,
} from '../integrations/google-oauth-client.factory';
import { GoogleOAuthTokenRepository } from '../repositories/google-oauth-token.repository';
import { GoogleOAuthStateService } from './google-oauth-state.service';

export type GoogleOAuthStatus = {
  connected: boolean;
  googleEmail: string | null;
  calendarId: string | null;
  connectedAt: string | null;
  encryptionConfigured: boolean;
};

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly clientFactory: GoogleOAuthClientFactory,
    private readonly tokenRepository: GoogleOAuthTokenRepository,
    private readonly tokenCipher: TokenCipherService,
    private readonly stateService: GoogleOAuthStateService,
  ) {}

  getStatus(): GoogleOAuthStatus {
    return {
      connected: false,
      googleEmail: null,
      calendarId: null,
      connectedAt: null,
      encryptionConfigured: this.tokenCipher.isConfigured(),
    };
  }

  async getStatusAsync(): Promise<GoogleOAuthStatus> {
    const active = await this.tokenRepository.findActive();
    return {
      connected: Boolean(active),
      googleEmail: active?.googleEmail ?? null,
      calendarId: active?.calendarId ?? null,
      connectedAt: active?.createdAt?.toISOString() ?? null,
      encryptionConfigured: this.tokenCipher.isConfigured(),
    };
  }

  buildAuthorizationUrl(actor: UserEntity): { authUrl: string; state: string } {
    this.assertOAuthConfigured();
    if (!this.tokenCipher.isConfigured()) {
      throw new BadRequestException('GOOGLE_TOKEN_ENCRYPTION_KEY must be configured.');
    }

    const client = this.clientFactory.createClient();
    const state = this.stateService.sign(actor.id);
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [...GOOGLE_OAUTH_SCOPES],
      state,
      include_granted_scopes: true,
    });

    return { authUrl, state };
  }

  async handleCallback(code: string, state: string, fallbackUserId?: number): Promise<GoogleOAuthStatus> {
    this.assertOAuthConfigured();
    if (!this.tokenCipher.isConfigured()) {
      throw new BadRequestException('GOOGLE_TOKEN_ENCRYPTION_KEY must be configured.');
    }

    const payload = this.stateService.verify(state);
    const userId = payload.userId ?? fallbackUserId;
    if (!userId) {
      throw new BadRequestException('OAuth state missing user context.');
    }

    const client = this.clientFactory.createClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      throw new BadRequestException(
        'Google did not return a refresh_token. Revoke app access and reconnect with prompt=consent.',
      );
    }

    client.setCredentials(tokens);

    const googleEmail = await this.resolveGoogleEmail(client);
    if (!googleEmail) {
      throw new BadRequestException('Unable to resolve Google account email.');
    }

    const calendarId = this.config.get<string>('googleOAuth.calendarId') ?? 'primary';
    const encryptedRefreshToken = this.tokenCipher.encrypt(tokens.refresh_token);

    await this.tokenRepository.saveCredential({
      googleEmail,
      encryptedRefreshToken,
      scopes: GOOGLE_OAUTH_SCOPES.join(' '),
      calendarId,
      connectedByUserId: userId,
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    });

    this.logger.log(`Google Calendar connected for ${googleEmail}`);
    return this.getStatusAsync();
  }

  async disconnect(): Promise<GoogleOAuthStatus> {
    await this.tokenRepository.disconnectActive();
    return this.getStatusAsync();
  }

  /**
   * Returns an OAuth2 client with a valid access token (refreshes when needed).
   */
  async getAuthorizedClient(): Promise<{ client: OAuth2Client; calendarId: string } | null> {
    const credential = await this.tokenRepository.findActive();
    if (!credential) return null;

    const refreshToken = this.tokenCipher.decrypt(credential.encryptedRefreshToken);
    const client = this.clientFactory.createClient();
    client.setCredentials({ refresh_token: refreshToken });

    const access = await client.getAccessToken();
    if (!access.token) {
      throw new BadRequestException('Failed to refresh Google access token.');
    }

    client.setCredentials({
      refresh_token: refreshToken,
      access_token: access.token,
    });

    return { client, calendarId: credential.calendarId };
  }

  private async resolveGoogleEmail(client: OAuth2Client): Promise<string | null> {
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const profile = await oauth2.userinfo.get();
      return profile.data.email ?? null;
    } catch (err) {
      this.logger.warn(`userinfo.get failed: ${String(err)}`);
      return null;
    }
  }

  private assertOAuthConfigured(): void {
    if (!this.clientFactory.isConfigured()) {
      throw new BadRequestException(
        'Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET and GOOGLE_OAUTH_REDIRECT_URI.',
      );
    }
  }
}
