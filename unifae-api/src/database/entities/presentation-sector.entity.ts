import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PresentationHallEntity } from './presentation-hall.entity';

@Entity('presentation_sectors')
export class PresentationSectorEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nome: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  descricao: string | null;

  @OneToMany(() => PresentationHallEntity, (h) => h.setor)
  salas: PresentationHallEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
