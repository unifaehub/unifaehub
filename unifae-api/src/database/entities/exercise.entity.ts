import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AppEntity } from './app.entity';
import { CourseEntity } from './course.entity';
import { UserEntity } from './user.entity';
import { ExerciseAttachmentEntity } from './exercise-attachment.entity';
import { ExerciseCategoryEntity } from './exercise-category.entity';

@Entity('exercises')
@Index(['courseId', 'appId'])
@Index(['createdById'])
@Index(['active'])
export class ExerciseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  instructions: string | null;

  /** URL de vídeo demonstrativo (ex.: YouTube); o app e o painel web podem exibir em embed. */
  @Column({ name: 'video_url', type: 'varchar', length: 2048, nullable: true })
  videoUrl: string | null;

  @Column({ name: 'created_by' })
  createdById: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdBy: UserEntity;

  @Column({ name: 'course_id' })
  courseId: number;

  @ManyToOne(() => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity;

  @Column({ name: 'app_id' })
  appId: number;

  @ManyToOne(() => AppEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'app_id' })
  app: AppEntity;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ExerciseCategoryEntity, (ec) => ec.exercise)
  exerciseCategories: ExerciseCategoryEntity[];

  @OneToMany(() => ExerciseAttachmentEntity, (a) => a.exercise)
  attachments: ExerciseAttachmentEntity[];
}
