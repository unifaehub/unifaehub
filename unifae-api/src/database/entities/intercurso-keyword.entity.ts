import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Palavra-chave agendada para o Intercurso — mesma estrutura da KeywordEntity da Jornada. */
@Entity('intercurso_keywords')
@Index(['dataAgendamento'])
export class IntercursoKeywordEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500 })
  palavra: string;

  @Column({ name: 'data_agendamento', type: 'date' })
  dataAgendamento: string;

  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
