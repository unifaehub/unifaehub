import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Catálogo global de itens de menu (raiz ou submenu). Vários cursos podem referenciar o mesmo nó via `course_menu_nodes`.
 */
@Entity('menu_nodes')
@Index(['key'], { unique: true })
export class MenuNodeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'parent_id', nullable: true })
  parentId: number | null;

  @ManyToOne(() => MenuNodeEntity, (n) => n.children, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: MenuNodeEntity | null;

  @OneToMany(() => MenuNodeEntity, (n) => n.parent)
  children: MenuNodeEntity[];

  /** Identificador estável (ex.: overview, patients, exercises, demo-teste). */
  @Column({ type: 'varchar', length: 80 })
  key: string;

  @Column({ type: 'varchar', length: 160 })
  label: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  icon: string | null;

  /**
   * Só a visão geral usa rota fixa (`course-hub`). Demais chaves padrão usam null = `/curso/:id/n/:menuNodeId`.
   */
  @Column({ name: 'route_name', type: 'varchar', length: 80, nullable: true })
  routeName: string | null;

  /** Se entra no menu ao criar um curso novo (submenus específicos costumam ser false). */
  @Column({ name: 'include_in_new_courses', type: 'boolean', default: true })
  includeInNewCourses: boolean;
}
