import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('jornada_config')
export class JornadaConfigEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'evento_nome', type: 'varchar', length: 200, nullable: true })
  eventoNome: string | null;

  @Column({ name: 'evento_local', type: 'varchar', length: 500, nullable: true })
  eventoLocal: string | null;

  /** Datas agendadas para o evento (YYYY-MM-DD), armazenado como CSV. */
  @Column({ name: 'datas_evento', type: 'simple-array', nullable: true })
  datasEvento: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
