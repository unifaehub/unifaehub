import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IntercursoEquipeEntity } from './intercurso-equipe.entity';
import { IntercursoResultadoEntity } from './intercurso-resultado.entity';

@Entity('intercurso_modalidades')
export class IntercursoModalidadeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao: string | null;

  /** Número máximo de equipes aceitas nesta modalidade. */
  @Column({ name: 'max_equipes', type: 'int', nullable: true })
  maxEquipes: number | null;

  /** Número máximo de membros por equipe nesta modalidade. */
  @Column({ name: 'max_membros', type: 'int', default: 5 })
  maxMembros: number;

  @Column({ name: 'ativo', type: 'boolean', default: true })
  ativo: boolean;

  /** Ordem de exibição no app público. */
  @Column({ name: 'ordem', type: 'int', default: 0 })
  ordem: number;

  @OneToMany(() => IntercursoEquipeEntity, (e) => e.modalidade)
  equipes: IntercursoEquipeEntity[];

  @OneToMany(() => IntercursoResultadoEntity, (r) => r.modalidade)
  resultados: IntercursoResultadoEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
