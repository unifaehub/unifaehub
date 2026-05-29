import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EvidenceWorkEntity } from './evidence-work.entity';
import { PresentationRoomEntity } from './presentation-room.entity';

@Entity('room_works')
@Index(['salaId'])
@Index(['trabalhoId'])
export class RoomWorkEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sala_id' })
  salaId: number;

  @ManyToOne(() => PresentationRoomEntity, (r) => r.works, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sala_id' })
  sala: PresentationRoomEntity;

  @Column({ name: 'trabalho_id' })
  trabalhoId: number;

  @ManyToOne(() => EvidenceWorkEntity, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'trabalho_id' })
  trabalho: EvidenceWorkEntity;

  @Column({ type: 'int', default: 1 })
  ordem: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
