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
import { AppEntity } from './app.entity';
import { CourseEntity } from './course.entity';

@Entity('consent_terms')
@Index(['appId', 'active'])
@Index(['courseId', 'active'])
export class ConsentTermEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** Título curto para listagem administrativa (opcional). */
  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string | null;

  @Column({ type: 'longtext' })
  content: string;

  @Column({ type: 'varchar', length: 32 })
  version: string;

  @Column({ default: false })
  active: boolean;

  @Column({ name: 'created_by' })
  createdById: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdBy: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'updated_by', nullable: true })
  updatedById: number | null;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: UserEntity | null;

  @Column({ name: 'updated_at', type: 'datetime', precision: 3, nullable: true })
  updatedAt: Date | null;

  /**
   * Nullable para migração/sync em bases que já tinham termos só com `app_id`.
   * Novos termos sempre recebem curso; use o script SQL de backfill em `database/scripts/`.
   */
  @Column({ name: 'course_id', nullable: true })
  courseId: number | null;

  @ManyToOne(() => CourseEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity | null;

  @Column({ name: 'app_id' })
  appId: number;

  @ManyToOne(() => AppEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'app_id' })
  app: AppEntity;
}
