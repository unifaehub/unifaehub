import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Encrypts sensitive tokens (e.g. Google refresh_token) at rest.
 * Requires GOOGLE_TOKEN_ENCRYPTION_KEY (min 16 chars) in production.
 */
@Injectable()
export class TokenCipherService {
  private readonly key: Buffer | null;

  constructor(private readonly config: ConfigService) {
    const secret = this.config.get<string>('googleOAuth.tokenEncryptionKey')?.trim() ?? '';
    if (!secret) {
      this.key = null;
      return;
    }
    this.key = scryptSync(secret, 'unifae-google-oauth', KEY_LENGTH);
  }

  encrypt(plainText: string): string {
    if (!this.key) {
      throw new InternalServerErrorException(
        'GOOGLE_TOKEN_ENCRYPTION_KEY is required to store OAuth credentials.',
      );
    }
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(cipherText: string): string {
    if (!this.key) {
      throw new InternalServerErrorException(
        'GOOGLE_TOKEN_ENCRYPTION_KEY is required to read OAuth credentials.',
      );
    }
    const payload = Buffer.from(cipherText, 'base64');
    if (payload.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      throw new InternalServerErrorException('Invalid encrypted token payload.');
    }
    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  isConfigured(): boolean {
    return this.key !== null;
  }
}
