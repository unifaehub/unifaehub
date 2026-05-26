import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CourseEntity } from './course.entity';

/**
 * Tipos de classificação por curso (ex.: eixo, problema, objetivo, nível).
 * Compartilhados por todos os contextos (casos) do mesmo curso; cada categoria referencia um tipo.
 */
@Entity('category_type_definitions')
@Index(['courseId', 'key'], { unique: true })
export class CategoryTypeDefinitionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'course_id' })
  courseId: number;

  @ManyToOne(() => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity;

  /** Identificador estável (slug), único dentro do curso. */
  @Column({ type: 'varchar', length: 80 })
  key: string;

  @Column({ type: 'varchar', length: 160 })
  label: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
