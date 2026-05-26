import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('google_oauth_credentials')
export class GoogleOAuthCredentialEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** Google account email used for Calendar / Meet. */
  @Column({ name: 'google_email', type: 'varchar', length: 255 })
  googleEmail: string;

  @Column({ name: 'encrypted_refresh_token', type: 'text' })
  encryptedRefreshToken: string;

  @Column({ type: 'varchar', length: 512, default: 'https://www.googleapis.com/auth/calendar' })
  scopes: string;

  @Column({ name: 'calendar_id', type: 'varchar', length: 255, default: 'primary' })
  calendarId: string;

  @Column({ name: 'connected_by_user_id' })
  connectedByUserId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'connected_by_user_id' })
  connectedBy: UserEntity;

  @Column({ name: 'token_expires_at', type: 'datetime', nullable: true })
  tokenExpiresAt: Date | null;

  @Column({ name: 'is_active', type: 'tinyint', default: 1 })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
