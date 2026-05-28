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
import { EvidenceWorkStatus } from './enums';
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** Exclusão lógica — status Inativo + este campo marcado. */
  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;
}
