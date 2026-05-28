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
import { PresentationRoomEntity } from './presentation-room.entity';

@Entity('room_professors')
@Unique(['salaId', 'professorId'])
@Index(['professorId'])
export class RoomProfessorEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sala_id' })
  salaId: number;

  @ManyToOne(() => PresentationRoomEntity, (r) => r.banca, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sala_id' })
  sala: PresentationRoomEntity;

  @Column({ name: 'professor_id' })
  professorId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'professor_id' })
  professor: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
