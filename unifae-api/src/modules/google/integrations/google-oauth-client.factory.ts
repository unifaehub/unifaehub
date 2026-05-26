import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';

@Injectable()
export class GoogleOAuthClientFactory {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const clientId = this.config.get<string>('googleOAuth.clientId') ?? '';
    const clientSecret = this.config.get<string>('googleOAuth.clientSecret') ?? '';
    const redirectUri = this.config.get<string>('googleOAuth.redirectUri') ?? '';
    return Boolean(clientId && clientSecret && redirectUri);
  }

  createClient(): OAuth2Client {
    const clientId = this.config.get<string>('googleOAuth.clientId') ?? '';
    const clientSecret = this.config.get<string>('googleOAuth.clientSecret') ?? '';
    const redirectUri = this.config.get<string>('googleOAuth.redirectUri') ?? '';

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google OAuth client is not configured.');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }
}
