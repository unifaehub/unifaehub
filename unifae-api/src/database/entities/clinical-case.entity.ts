import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AppEntity } from './app.entity';
import { CourseEntity } from './course.entity';

/**
 * Agrupa categorias em um contexto por curso (ex.: Ortopedia em fisioterapia, peça jurídica em direito).
 * O rótulo na UI vem de `CourseEntity.caseContextLabel`.
 */
@Entity('clinical_cases')
export class ClinicalCaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

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
}
