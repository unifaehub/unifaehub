import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('professor_availabilities')
@Unique(['professorId', 'dataEvento'])
@Index(['dataEvento'])
export class ProfessorAvailabilityEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'professor_id' })
  professorId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'professor_id' })
  professor: UserEntity;

  @Column({ name: 'data_evento', type: 'date' })
  dataEvento: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
