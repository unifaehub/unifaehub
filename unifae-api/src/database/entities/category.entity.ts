import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CategoryTypeDefinitionEntity } from './category-type-definition.entity';
import { ClinicalCaseEntity } from './clinical-case.entity';
import { CourseEntity } from './course.entity';
import { AppEntity } from './app.entity';

@Entity('categories')
@Index(['courseId', 'appId'])
@Index(['clinicalCaseId', 'parentId'])
export class CategoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'category_type_definition_id' })
  categoryTypeDefinitionId: number;

  @ManyToOne(() => CategoryTypeDefinitionEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_type_definition_id' })
  categoryTypeDefinition: CategoryTypeDefinitionEntity;

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

  /** Caso clínico ao qual a categoria pertence (árvore de subcategorias fica sob o mesmo caso). */
  @Column({ name: 'clinical_case_id', nullable: true })
  clinicalCaseId: number | null;

  @ManyToOne(() => ClinicalCaseEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'clinical_case_id' })
  clinicalCase: ClinicalCaseEntity | null;

  @Column({ name: 'parent_id', nullable: true })
  parentId: number | null;

  @ManyToOne(() => CategoryEntity, (c) => c.children, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: CategoryEntity | null;

  @OneToMany(() => CategoryEntity, (c) => c.parent)
  children: CategoryEntity[];

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  /**
   * Se true, este nó é o fim da árvore de classificação; abaixo dele não há subcategorias
   * e é onde se associam exercícios/atividades ao paciente.
   */
  @Column({ name: 'is_leaf_level', type: 'boolean', default: false })
  isLeafLevel: boolean;
}
