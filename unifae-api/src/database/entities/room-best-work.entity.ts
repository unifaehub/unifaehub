import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PresentationRoomEntity } from './presentation-room.entity';
import { EvidenceWorkEntity } from './evidence-work.entity';

@Entity('room_best_works')
@Unique(['salaId'])
export class RoomBestWorkEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sala_id' })
  salaId: number;

  @ManyToOne(() => PresentationRoomEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sala_id' })
  sala: PresentationRoomEntity;

  @Column({ name: 'trabalho_id' })
  trabalhoId: number;

  @ManyToOne(() => EvidenceWorkEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'trabalho_id' })
  trabalho: EvidenceWorkEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
