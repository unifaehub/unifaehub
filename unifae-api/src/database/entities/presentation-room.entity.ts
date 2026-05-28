import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { EvidenceWorkEntity } from './evidence-work.entity';
import { RoomProfessorEntity } from './room-professor.entity';

@Entity('presentation_rooms')
@Index(['dataEvento'])
@Index(['professorLiderId'])
export class PresentationRoomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'data_evento', type: 'date' })
  dataEvento: string;

  @Column({ name: 'trabalho_id' })
  trabalhoId: number;

  @ManyToOne(() => EvidenceWorkEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'trabalho_id' })
  trabalho: EvidenceWorkEntity;

  @Column({ name: 'professor_lider_id' })
  professorLiderId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'professor_lider_id' })
  professorLider: UserEntity;

  @Column({ name: 'fechada', type: 'boolean', default: false })
  fechada: boolean;

  @OneToMany(() => RoomProfessorEntity, (rp) => rp.sala)
  banca: RoomProfessorEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
