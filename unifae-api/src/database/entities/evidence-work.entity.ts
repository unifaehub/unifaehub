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
import { EvidenceWorkStatus, WorkCategory, WorkType } from './enums';
import { UserEntity } from './user.entity';

@Entity('evidence_works')
@Index(['status'])
@Index(['alunoId'])
export class EvidenceWorkEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500 })
  titulo: string;

  @Column({ name: 'curso_trabalho', type: 'varchar', length: 200 })
  cursoTrabalho: string;

  /** Categoria: Jornada de Evidências ou Mostra de Jogos. */
  @Column({
    type: 'enum',
    enum: WorkCategory,
    default: WorkCategory.JORNADA_EVIDENCIAS,
  })
  categoria: WorkCategory;

  /** Tipo do trabalho — apenas para Jornada de Evidências. */
  @Column({
    name: 'tipo_trabalho',
    type: 'enum',
    enum: WorkType,
    nullable: true,
  })
  tipoTrabalho: WorkType | null;

  @Column({ name: 'arquivo_url', type: 'varchar', length: 1024, nullable: true })
  arquivoUrl: string | null;

  @Column({ type: 'enum', enum: EvidenceWorkStatus, default: EvidenceWorkStatus.PENDENTE })
  status: EvidenceWorkStatus;

  @Column({ name: 'data_submissao', type: 'datetime' })
  dataSubmissao: Date;

  @Column({ name: 'aluno_id' })
  alunoId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'aluno_id' })
  aluno: UserEntity;

  /** Integrantes adicionais do grupo (além do aluno principal). */
  @Column({ type: 'json', nullable: true })
  integrantes: { ra: string; nome: string }[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** Exclusão lógica — status Inativo + este campo marcado. */
  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;
}
