import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { ConsentTermEntity } from './consent-term.entity';
import { CourseEntity } from './course.entity';

@Entity('user_consent_acceptances')
@Index(['userId', 'consentTermId'], { unique: true })
@Index(['userId'])
@Index(['courseId'])
export class UserConsentAcceptanceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'consent_term_id' })
  consentTermId: number;

  @ManyToOne(() => ConsentTermEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'consent_term_id' })
  consentTerm: ConsentTermEntity;

  @Column({ name: 'course_id' })
  courseId: number;

  @ManyToOne(() => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity;

  @CreateDateColumn({ name: 'accepted_at' })
  acceptedAt: Date;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'device_id', type: 'varchar', length: 64, nullable: true })
  deviceId: string | null;

  @Column({ name: 'device_name', type: 'varchar', length: 255, nullable: true })
  deviceName: string | null;

  /** SHA-256 hex do texto do termo no momento do aceite (rastreabilidade). */
  @Column({ name: 'content_hash', type: 'varchar', length: 64, nullable: true })
  contentHash: string | null;
}
