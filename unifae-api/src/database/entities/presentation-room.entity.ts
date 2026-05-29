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
import { RoomProfessorEntity } from './room-professor.entity';
import { RoomWorkEntity } from './room-work.entity';
import { PresentationHallEntity } from './presentation-hall.entity';
import { RoomType } from './enums';

@Entity('presentation_rooms')
@Index(['dataEvento'])
@Index(['professorLiderId'])
export class PresentationRoomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'data_evento', type: 'date' })
  dataEvento: string;

  /** Tipo da sala — define max de trabalhos e quais categorias aceita. */
  @Column({
    name: 'tipo_sala',
    type: 'enum',
    enum: RoomType,
    nullable: true,
    default: RoomType.GERAL,
  })
  tipoSala: RoomType | null;

  /** Sala física vinculada (opcional — para rastreabilidade no relatório). */
  @Column({ name: 'hall_id', type: 'int', nullable: true, default: null })
  hallId: number | null;

  @ManyToOne(() => PresentationHallEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'hall_id' })
  hall: PresentationHallEntity | null;

  @Column({ name: 'professor_lider_id' })
  professorLiderId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'professor_lider_id' })
  professorLider: UserEntity;

  @Column({ name: 'fechada', type: 'boolean', default: false })
  fechada: boolean;

  @OneToMany(() => RoomProfessorEntity, (rp) => rp.sala)
  banca: RoomProfessorEntity[];

  /** Trabalhos atribuídos a esta sala (via room_works). */
  @OneToMany(() => RoomWorkEntity, (rw) => rw.sala)
  works: RoomWorkEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
