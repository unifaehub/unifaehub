import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PresentationSectorEntity } from './presentation-sector.entity';

@Entity('presentation_halls')
@Index(['setorId'])
export class PresentationHallEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** Número ou nome da sala (ex.: "1", "2", "Lab A"). */
  @Column({ type: 'varchar', length: 100 })
  nome: string;

  @Column({ name: 'setor_id' })
  setorId: number;

  @ManyToOne(() => PresentationSectorEntity, (s) => s.salas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'setor_id' })
  setor: PresentationSectorEntity;

  @Column({ type: 'varchar', length: 50, nullable: true })
  andar: string | null;

  @Column({ type: 'int', nullable: true })
  capacidade: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
