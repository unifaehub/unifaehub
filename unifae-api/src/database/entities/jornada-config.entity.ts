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

  @Column({ name: 'submissao_inicio', type: 'date', nullable: true })
  submissaoInicio: string | null;

  @Column({ name: 'submissao_fim', type: 'date', nullable: true })
  submissaoFim: string | null;

  @Column({ name: 'avaliacao_inicio', type: 'date', nullable: true })
  avaliacaoInicio: string | null;

  @Column({ name: 'avaliacao_fim', type: 'date', nullable: true })
  avaliacaoFim: string | null;

  /** Seções dinâmicas do resumo ordenadas por ordem. */
  @Column({ name: 'secoes_resumo', type: 'json', nullable: true })
  secoesResumo: { id: string; titulo: string; ordem: number; obrigatorio: boolean }[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
