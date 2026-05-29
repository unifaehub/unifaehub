import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from 'typeorm';

export class Intercurso1748400000018 implements MigrationInterface {
  name = 'Intercurso1748400000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── intercurso_config ─────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('intercurso_config'))) {
      await queryRunner.createTable(
        new Table({
          name: 'intercurso_config',
          columns: [
            { name: 'id',               type: 'int',          isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'evento_nome',       type: 'varchar',      length: '200',  isNullable: true },
            { name: 'evento_local',      type: 'varchar',      length: '500',  isNullable: true },
            { name: 'edicao',            type: 'varchar',      length: '100',  isNullable: true },
            { name: 'descricao',         type: 'text',                         isNullable: true },
            { name: 'datas_evento',      type: 'text',                         isNullable: true, comment: 'CSV de datas YYYY-MM-DD' },
            { name: 'inscricao_inicio',  type: 'date',                         isNullable: true },
            { name: 'inscricao_fim',     type: 'date',                         isNullable: true },
            { name: 'certificado_url',   type: 'varchar',      length: '1024', isNullable: true },
            { name: 'created_at',        type: 'datetime',     precision: 6,   isNullable: false, default: 'CURRENT_TIMESTAMP(6)' },
            { name: 'updated_at',        type: 'datetime',     precision: 6,   isNullable: false, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
          ],
        }),
        true,
      );
      // Garante registro singleton (id = 1)
      await queryRunner.query(`INSERT IGNORE INTO \`intercurso_config\` (\`id\`) VALUES (1)`);
    }

    // ── intercurso_modalidades ────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('intercurso_modalidades'))) {
      await queryRunner.createTable(
        new Table({
          name: 'intercurso_modalidades',
          columns: [
            { name: 'id',          type: 'int',       isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'nome',        type: 'varchar',   length: '200',  isNullable: false },
            { name: 'descricao',   type: 'text',                       isNullable: true },
            { name: 'max_equipes', type: 'int',                        isNullable: true },
            { name: 'max_membros', type: 'int',                        isNullable: false, default: 5 },
            { name: 'ativo',       type: 'tinyint',   width: 1,        isNullable: false, default: 1 },
            { name: 'ordem',       type: 'int',                        isNullable: false, default: 0 },
            { name: 'created_at',  type: 'datetime',  precision: 6,    isNullable: false, default: 'CURRENT_TIMESTAMP(6)' },
            { name: 'updated_at',  type: 'datetime',  precision: 6,    isNullable: false, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
          ],
        }),
        true,
      );
    }

    // ── intercurso_equipes ────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('intercurso_equipes'))) {
      await queryRunner.createTable(
        new Table({
          name: 'intercurso_equipes',
          columns: [
            { name: 'id',                   type: 'int',     isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'nome',                 type: 'varchar', length: '200',  isNullable: false },
            { name: 'curso_representante',  type: 'varchar', length: '200',  isNullable: false },
            { name: 'modalidade_id',        type: 'int',                     isNullable: false },
            { name: 'status',               type: 'enum',    enum: ['Pendente', 'Aprovada', 'Reprovada', 'Inativa'], default: "'Pendente'", isNullable: false },
            { name: 'membros',              type: 'json',                    isNullable: true },
            { name: 'motivo',               type: 'text',                    isNullable: true },
            { name: 'email_contato',        type: 'varchar', length: '255',  isNullable: true },
            { name: 'created_at',           type: 'datetime', precision: 6,  isNullable: false, default: 'CURRENT_TIMESTAMP(6)' },
            { name: 'updated_at',           type: 'datetime', precision: 6,  isNullable: false, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
            { name: 'deleted_at',           type: 'datetime',                isNullable: true },
          ],
          indices: [
            new TableIndex({ columnNames: ['status'] }),
            new TableIndex({ columnNames: ['modalidade_id'] }),
          ],
          foreignKeys: [
            new TableForeignKey({
              columnNames: ['modalidade_id'],
              referencedTableName: 'intercurso_modalidades',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            }),
          ],
        }),
        true,
      );
    }

    // ── intercurso_resultados ─────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('intercurso_resultados'))) {
      await queryRunner.createTable(
        new Table({
          name: 'intercurso_resultados',
          columns: [
            { name: 'id',            type: 'int',      isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'equipe_id',     type: 'int',                       isNullable: false },
            { name: 'modalidade_id', type: 'int',                       isNullable: false },
            { name: 'posicao',       type: 'int',                       isNullable: true },
            { name: 'pontuacao',     type: 'decimal',  precision: 6, scale: 2, isNullable: true },
            { name: 'observacao',    type: 'text',                      isNullable: true },
            { name: 'created_at',    type: 'datetime', precision: 6,    isNullable: false, default: 'CURRENT_TIMESTAMP(6)' },
            { name: 'updated_at',    type: 'datetime', precision: 6,    isNullable: false, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
          ],
          uniques: [
            new TableUnique({ columnNames: ['equipe_id', 'modalidade_id'] }),
          ],
          indices: [
            new TableIndex({ columnNames: ['modalidade_id'] }),
            new TableIndex({ columnNames: ['equipe_id'] }),
          ],
          foreignKeys: [
            new TableForeignKey({
              columnNames: ['equipe_id'],
              referencedTableName: 'intercurso_equipes',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            }),
            new TableForeignKey({
              columnNames: ['modalidade_id'],
              referencedTableName: 'intercurso_modalidades',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            }),
          ],
        }),
        true,
      );
    }

    // ── intercurso_keywords ───────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('intercurso_keywords'))) {
      await queryRunner.createTable(
        new Table({
          name: 'intercurso_keywords',
          columns: [
            { name: 'id',               type: 'int',      isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'palavra',           type: 'varchar',  length: '500',   isNullable: false },
            { name: 'data_agendamento',  type: 'date',                      isNullable: false },
            { name: 'hora_inicio',       type: 'time',                      isNullable: false },
            { name: 'created_at',        type: 'datetime', precision: 6,    isNullable: false, default: 'CURRENT_TIMESTAMP(6)' },
            { name: 'updated_at',        type: 'datetime', precision: 6,    isNullable: false, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
          ],
          indices: [
            new TableIndex({ columnNames: ['data_agendamento'] }),
          ],
        }),
        true,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('intercurso_resultados', true);
    await queryRunner.dropTable('intercurso_equipes',    true);
    await queryRunner.dropTable('intercurso_modalidades', true);
    await queryRunner.dropTable('intercurso_config',     true);
    await queryRunner.dropTable('intercurso_keywords',   true);
  }
}
