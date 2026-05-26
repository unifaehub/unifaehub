import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CourseEntity } from './course.entity';
import { MenuNodeEntity } from './menu-node.entity';

/**
 * Relaciona um curso a um nó de menu (N cursos podem compartilhar o mesmo nó).
 */
@Entity('course_menu_nodes')
@Index(['courseId', 'menuNodeId'], { unique: true })
export class CourseMenuNodeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'course_id' })
  courseId: number;

  @ManyToOne(() => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity;

  @Column({ name: 'menu_node_id' })
  menuNodeId: number;

  @ManyToOne(() => MenuNodeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_node_id' })
  menuNode: MenuNodeEntity;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  /** Ordem de exibição no curso (lista plana / árvore). */
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
