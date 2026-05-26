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
import { AppEntity } from './app.entity';

@Entity('courses')
@Index(['appId'])
@Index(['appId', 'active'])
export class CourseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  /**
   * Rótulo na UI para o agrupamento `clinical_cases` deste curso (ex.: "Caso clínico", "Cenário jurídico").
   * Se null, o front pode usar um padrão genérico.
   */
  @Column({ name: 'case_context_label', type: 'varchar', length: 120, nullable: true })
  caseContextLabel: string | null;

  @Column({ name: 'app_id', nullable: true })
  appId: number | null;

  @ManyToOne(() => AppEntity, (a) => a.courses, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'app_id' })
  app: AppEntity | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Itens de menu do curso (visão geral + módulos). Se null, o front aplica padrão pelo nome do curso.
   * @see CourseNavItemDto no módulo catalog
   */
  @Column({ name: 'navigation_json', type: 'json', nullable: true })
  navigationJson: unknown | null;
}
