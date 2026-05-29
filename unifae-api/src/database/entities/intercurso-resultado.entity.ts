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
import { IntercursoEquipeEntity } from './intercurso-equipe.entity';
import { IntercursoModalidadeEntity } from './intercurso-modalidade.entity';

@Entity('intercurso_resultados')
@Index(['modalidadeId'])
@Index(['equipeId'])
export class IntercursoResultadoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'equipe_id' })
  equipeId: number;

  @ManyToOne(() => IntercursoEquipeEntity, (e) => e.resultados, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipe_id' })
  equipe: IntercursoEquipeEntity;

  @Column({ name: 'modalidade_id' })
  modalidadeId: number;

  @ManyToOne(() => IntercursoModalidadeEntity, (m) => m.resultados, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'modalidade_id' })
  modalidade: IntercursoModalidadeEntity;

  /** Posição no ranking da modalidade (1 = 1º lugar). */
  @Column({ name: 'posicao', type: 'int', nullable: true })
  posicao: number | null;

  /** Pontuação obtida (opcional — pode usar só posição). */
  @Column({ name: 'pontuacao', type: 'decimal', precision: 6, scale: 2, nullable: true })
  pontuacao: string | null;

  @Column({ name: 'observacao', type: 'text', nullable: true })
  observacao: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
