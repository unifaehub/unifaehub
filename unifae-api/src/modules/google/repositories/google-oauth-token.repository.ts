import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleOAuthCredentialEntity } from '../../../database/entities/google-oauth-credential.entity';

export type SaveOAuthCredentialInput = {
  googleEmail: string;
  encryptedRefreshToken: string;
  scopes: string;
  calendarId: string;
  connectedByUserId: number;
  tokenExpiresAt: Date | null;
};

@Injectable()
export class GoogleOAuthTokenRepository {
  constructor(
    @InjectRepository(GoogleOAuthCredentialEntity)
    private readonly repo: Repository<GoogleOAuthCredentialEntity>,
  ) {}

  async findActive(): Promise<GoogleOAuthCredentialEntity | null> {
    return this.repo.findOne({
      where: { isActive: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async deactivateAll(): Promise<void> {
    await this.repo.update({ isActive: true }, { isActive: false });
  }

  async saveCredential(input: SaveOAuthCredentialInput): Promise<GoogleOAuthCredentialEntity> {
    await this.deactivateAll();
    const row = this.repo.create({
      googleEmail: input.googleEmail,
      encryptedRefreshToken: input.encryptedRefreshToken,
      scopes: input.scopes,
      calendarId: input.calendarId,
      connectedByUserId: input.connectedByUserId,
      tokenExpiresAt: input.tokenExpiresAt,
      isActive: true,
    });
    return this.repo.save(row);
  }

  async disconnectActive(): Promise<void> {
    await this.deactivateAll();
  }
}
