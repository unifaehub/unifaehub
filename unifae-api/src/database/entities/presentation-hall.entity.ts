import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PresentationSectorEntity } from './presentation-sector.entity';
import { RoomType } from './enums';

// Nota: índice em setor_id é criado automaticamente pelo MySQL via FK constraint.
@Entity('presentation_halls')
export class PresentationHallEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** Número ou nome da sala (ex.: "1", "2", "Lab A", "Auditório"). */
  @Column({ type: 'varchar', length: 100 })
  nome: string;

  @Column({ name: 'setor_id' })
  setorId: number;

  @ManyToOne(() => PresentationSectorEntity, (s) => s.salas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'setor_id' })
  setor: PresentationSectorEntity;

  @Column({ type: 'varchar', length: 50, nullable: true })
  andar: string | null;

  /** Bloco do imóvel — ex.: "Bloco A", "Bloco B". */
  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  bloco: string | null;

  @Column({ type: 'int', nullable: true })
  capacidade: number | null;

  /**
   * Tipo de apresentação aceito nesta sala.
   * null / GERAL = aceita qualquer tipo (sala de uso geral).
   * MOSTRA_JOGOS = auditório/sala dedicada à Mostra de Jogos.
   * PRATICO = sala para Desenvolvimento Prático (max menor).
   * etc.
   */
  @Column({
    name: 'tipo_sala',
    type: 'enum',
    enum: RoomType,
    nullable: true,
    default: null,
  })
  tipoSala: RoomType | null;

  /**
   * Máximo de trabalhos que cabem nesta sala por dia.
   * null = usa o padrão do tipo (10 para Geral/IC, 5 para Prático).
   */
  @Column({ name: 'max_trabalhos', type: 'int', nullable: true, default: null })
  maxTrabalhos: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
