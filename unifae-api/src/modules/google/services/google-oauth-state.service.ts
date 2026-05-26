import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

type OAuthStatePayload = {
  userId: number;
  exp: number;
};

@Injectable()
export class GoogleOAuthStateService {
  constructor(private readonly config: ConfigService) {}

  sign(userId: number): string {
    const ttlSeconds = this.config.get<number>('googleOAuth.stateTtlSeconds') ?? 600;
    const payload: OAuthStatePayload = {
      userId,
      exp: Date.now() + ttlSeconds * 1000,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = this.signBody(body);
    return `${body}.${signature}`;
  }

  verify(state: string): OAuthStatePayload {
    const [body, signature] = state.split('.');
    if (!body || !signature) {
      throw new BadRequestException('Invalid OAuth state.');
    }
    const expected = this.signBody(body);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new BadRequestException('Invalid OAuth state signature.');
    }
    let payload: OAuthStatePayload;
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthStatePayload;
    } catch {
      throw new BadRequestException('Invalid OAuth state payload.');
    }
    if (!payload.userId || !payload.exp || Date.now() > payload.exp) {
      throw new BadRequestException('OAuth state expired.');
    }
    return payload;
  }

  private signBody(body: string): string {
    const secret = this.config.get<string>('jwt.secret') ?? 'change-me';
    return createHmac('sha256', secret).update(body).digest('base64url');
  }
}
