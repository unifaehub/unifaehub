import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EventAttendanceStatus } from './enums';
import { EventEntity } from './event.entity';
import { UserEntity } from './user.entity';

@Entity('event_attendances')
@Index(['eventId'])
@Index(['userId'])
export class EventAttendanceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'event_id' })
  eventId: number;

  @ManyToOne(() => EventEntity, (e) => e.attendances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: EventEntity;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'enum', enum: EventAttendanceStatus })
  status: EventAttendanceStatus;

  @Column({ name: 'qr_token', type: 'varchar', length: 128, nullable: true, unique: true })
  qrToken: string | null;

  @Column({ name: 'confirmed_at', type: 'datetime', nullable: true })
  confirmedAt: Date | null;
}
