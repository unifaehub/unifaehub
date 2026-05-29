import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('intercurso_config')
export class IntercursoConfigEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'evento_nome', type: 'varchar', length: 200, nullable: true })
  eventoNome: string | null;

  @Column({ name: 'evento_local', type: 'varchar', length: 500, nullable: true })
  eventoLocal: string | null;

  /** Edição do evento (ex.: "5ª Edição"). */
  @Column({ name: 'edicao', type: 'varchar', length: 100, nullable: true })
  edicao: string | null;

  /** Descrição/apresentação pública do evento. */
  @Column({ name: 'descricao', type: 'text', nullable: true })
  descricao: string | null;

  /** Datas do evento (YYYY-MM-DD), armazenado como CSV. */
  @Column({ name: 'datas_evento', type: 'simple-array', nullable: true })
  datasEvento: string[] | null;

  @Column({ name: 'inscricao_inicio', type: 'date', nullable: true })
  inscricaoInicio: string | null;

  @Column({ name: 'inscricao_fim', type: 'date', nullable: true })
  inscricaoFim: string | null;

  /** URL para redirecionamento de certificados (mesma lógica da Jornada). */
  @Column({ name: 'certificado_url', type: 'varchar', length: 1024, nullable: true })
  certificadoUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
