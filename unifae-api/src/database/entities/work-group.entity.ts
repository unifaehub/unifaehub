import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { EvidenceWorkEntity } from './evidence-work.entity';

@Entity('work_groups')
@Index(['alunoId'])
@Index(['trabalhoId'])
export class WorkGroupEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'aluno_id' })
  alunoId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aluno_id' })
  aluno: UserEntity;

  @Column({ name: 'trabalho_id' })
  trabalhoId: number;

  @ManyToOne(() => EvidenceWorkEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trabalho_id' })
  trabalho: EvidenceWorkEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
