import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('keywords')
@Index(['dataAgendamento'])
export class KeywordEntity {
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
