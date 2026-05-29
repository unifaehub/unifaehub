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
import { IntercursoEquipeStatus } from './enums';
import { IntercursoModalidadeEntity } from './intercurso-modalidade.entity';
import { IntercursoResultadoEntity } from './intercurso-resultado.entity';

export type IntercursoMembro = {
  nome: string;
  ra: string;
  curso: string;
  email?: string;
  /** true = responsável/capitão da equipe */
  responsavel?: boolean;
};

@Entity('intercurso_equipes')
@Index(['status'])
@Index(['modalidadeId'])
export class IntercursoEquipeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  nome: string;

  /** Curso representante da equipe. */
  @Column({ name: 'curso_representante', type: 'varchar', length: 200 })
  cursoRepresentante: string;

  @Column({ name: 'modalidade_id' })
  modalidadeId: number;

  @ManyToOne(() => IntercursoModalidadeEntity, (m) => m.equipes, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'modalidade_id' })
  modalidade: IntercursoModalidadeEntity;

  @Column({
    type: 'enum',
    enum: IntercursoEquipeStatus,
    default: IntercursoEquipeStatus.PENDENTE,
  })
  status: IntercursoEquipeStatus;

  /** Lista de membros da equipe (JSON). */
  @Column({ type: 'json', nullable: true })
  membros: IntercursoMembro[] | null;

  /** Motivo de reprovação, preenchido pela coordenação. */
  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  /** Email de contato da equipe. */
  @Column({ name: 'email_contato', type: 'varchar', length: 255, nullable: true })
  emailContato: string | null;

  @OneToMany(() => IntercursoResultadoEntity, (r) => r.equipe)
  resultados: IntercursoResultadoEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** Exclusão lógica. */
  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;
}
