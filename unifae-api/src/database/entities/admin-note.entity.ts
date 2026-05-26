import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum AdminNoteStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  DONE = 'DONE',
  REJECTED = 'REJECTED',
}

@Entity('admin_notes')
@Index(['status', 'createdAt'])
@Index(['createdByUserId', 'createdAt'])
@Index(['active', 'createdAt'])
@Index(['requestedBy', 'active'])
export class AdminNoteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  description: string;

  /** Quem solicitou (texto livre para registrar origem: coordenação, professor, aluno, etc). */
  @Column({ name: 'requested_by', type: 'varchar', length: 120, nullable: true })
  requestedBy: string | null;

  @Column({ type: 'enum', enum: AdminNoteStatus, default: AdminNoteStatus.OPEN })
  status: AdminNoteStatus;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'approved_by_user_id', nullable: true })
  approvedByUserId: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_user_id' })
  approvedByUser: UserEntity | null;

  @Column({ name: 'approved_at', type: 'datetime', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'rejected_by_user_id', nullable: true })
  rejectedByUserId: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rejected_by_user_id' })
  rejectedByUser: UserEntity | null;

  @Column({ name: 'rejected_at', type: 'datetime', nullable: true })
  rejectedAt: Date | null;

  @Column({ name: 'created_by_user_id' })
  createdByUserId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: UserEntity;

  @Column({ name: 'updated_by_user_id', nullable: true })
  updatedByUserId: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by_user_id' })
  updatedByUser: UserEntity | null;

  @Column({ name: 'finished_at', type: 'datetime', nullable: true })
  finishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

