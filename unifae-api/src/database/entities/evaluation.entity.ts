import {
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PresentationStatus } from './enums';
import { UserEntity } from './user.entity';
import { EvidenceWorkEntity } from './evidence-work.entity';
import { DynamicQuestionEntity } from './dynamic-question.entity';
import { ForbiddenException } from '@nestjs/common';

@Entity('evaluations')
@Index(['trabalhoId', 'professorId'])
@Index(['professorId'])
export class EvaluationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'trabalho_id' })
  trabalhoId: number;

  @ManyToOne(() => EvidenceWorkEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'trabalho_id' })
  trabalho: EvidenceWorkEntity;

  @Column({ name: 'professor_id' })
  professorId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'professor_id' })
  professor: UserEntity;

  @Column({ name: 'pergunta_id', nullable: true })
  perguntaId: number | null;

  @ManyToOne(() => DynamicQuestionEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pergunta_id' })
  pergunta: DynamicQuestionEntity | null;

  /** Nota de 1 a 10. Null quando status for Ausente ou Indeferido. */
  @Column({ type: 'tinyint', unsigned: true, nullable: true })
  nota: number | null;

  @Column({ type: 'text', nullable: true })
  comentario: string | null;

  @Column({
    name: 'status_apresentacao',
    type: 'enum',
    enum: PresentationStatus,
    default: PresentationStatus.PRESENTE,
  })
  statusApresentacao: PresentationStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @BeforeUpdate()
  preventEdit() {
    throw new ForbiddenException('Avaliações enviadas não podem ser alteradas.');
  }
}
