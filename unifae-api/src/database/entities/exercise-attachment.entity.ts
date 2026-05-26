import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExerciseEntity } from './exercise.entity';

/** Vídeo enviado ao servidor vs documento (pdf, doc, txt, …). */
export type ExerciseAttachmentKind = 'VIDEO_FILE' | 'DOCUMENT';

@Entity('exercise_attachments')
@Index(['exerciseId'])
export class ExerciseAttachmentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'exercise_id' })
  exerciseId: number;

  @ManyToOne(() => ExerciseEntity, (e) => e.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exercise_id' })
  exercise: ExerciseEntity;

  @Column({ type: 'varchar', length: 20 })
  kind: ExerciseAttachmentKind;

  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename: string;

  @Column({ name: 'stored_filename', type: 'varchar', length: 255 })
  storedFilename: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 120 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'int', unsigned: true })
  sizeBytes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
