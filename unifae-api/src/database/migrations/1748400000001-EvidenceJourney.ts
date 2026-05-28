import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from 'typeorm';

export class EvidenceJourney1748400000001 implements MigrationInterface {
  name = 'EvidenceJourney1748400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Colunas novas em users ──────────────────────────────────────────────
    if (!(await queryRunner.hasColumn('users', 'ra'))) {
      await queryRunner.query(`ALTER TABLE \`users\` ADD COLUMN \`ra\` VARCHAR(50) NULL`);
      await queryRunner.query(`ALTER TABLE \`users\` ADD UNIQUE INDEX \`UQ_users_ra\` (\`ra\`)`);
    }
    if (!(await queryRunner.hasColumn('users', 'registro_funcional'))) {
      await queryRunner.query(`ALTER TABLE \`users\` ADD COLUMN \`registro_funcional\` VARCHAR(10) NULL`);
      await queryRunner.query(`ALTER TABLE \`users\` ADD UNIQUE INDEX \`UQ_users_registro_funcional\` (\`registro_funcional\`)`);
    }
    if (!(await queryRunner.hasColumn('users', 'curso_base'))) {
      await queryRunner.query(`ALTER TABLE \`users\` ADD COLUMN \`curso_base\` VARCHAR(200) NULL`);
    }

    // ── professor_availabilities ───────────────────────────────────────────
    if (!(await queryRunner.hasTable('professor_availabilities'))) {
      await queryRunner.createTable(
        new Table({
          name: 'professor_availabilities',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'professor_id', type: 'int', isNullable: false },
            { name: 'data_evento', type: 'date', isNullable: false },
            { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', isNullable: false },
          ],
          uniques: [new TableUnique({ columnNames: ['professor_id', 'data_evento'] })],
          indices: [new TableIndex({ columnNames: ['data_evento'] })],
          foreignKeys: [
            new TableForeignKey({ columnNames: ['professor_id'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
          ],
        }),
        true,
      );
    }

    // ── evidence_works ─────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('evidence_works'))) {
      await queryRunner.createTable(
        new Table({
          name: 'evidence_works',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'titulo', type: 'varchar', length: '500', isNullable: false },
            { name: 'curso_trabalho', type: 'varchar', length: '200', isNullable: false },
            { name: 'arquivo_url', type: 'varchar', length: '1024', isNullable: true },
            { name: 'status', type: 'enum', enum: ['Pendente', 'Aprovado', 'Reprovado', 'Inativo'], default: "'Pendente'", isNullable: false },
            { name: 'data_submissao', type: 'datetime', isNullable: false },
            { name: 'aluno_id', type: 'int', isNullable: false },
            { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', isNullable: false },
            { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)', isNullable: false },
            { name: 'deleted_at', type: 'datetime', isNullable: true },
          ],
          indices: [
            new TableIndex({ columnNames: ['status'] }),
            new TableIndex({ columnNames: ['aluno_id'] }),
          ],
          foreignKeys: [
            new TableForeignKey({ columnNames: ['aluno_id'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'RESTRICT' }),
          ],
        }),
        true,
      );
    }

    // ── work_groups ────────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('work_groups'))) {
      await queryRunner.createTable(
        new Table({
          name: 'work_groups',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'aluno_id', type: 'int', isNullable: false },
            { name: 'trabalho_id', type: 'int', isNullable: false },
            { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', isNullable: false },
          ],
          indices: [
            new TableIndex({ columnNames: ['aluno_id'] }),
            new TableIndex({ columnNames: ['trabalho_id'] }),
          ],
          foreignKeys: [
            new TableForeignKey({ columnNames: ['aluno_id'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
            new TableForeignKey({ columnNames: ['trabalho_id'], referencedTableName: 'evidence_works', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
          ],
        }),
        true,
      );
    }

    // ── dynamic_questions (antes de presentation_rooms para FK) ───────────
    if (!(await queryRunner.hasTable('dynamic_questions'))) {
      await queryRunner.createTable(
        new Table({
          name: 'dynamic_questions',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'texto_pergunta', type: 'text', isNullable: false },
            { name: 'tipo', type: 'enum', enum: ['Resumo', 'Apresentação'], isNullable: false },
            { name: 'ordem', type: 'int', default: 0, isNullable: false },
            { name: 'ativo', type: 'tinyint', width: 1, default: 1, isNullable: false },
            { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', isNullable: false },
            { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)', isNullable: false },
          ],
          indices: [new TableIndex({ columnNames: ['tipo', 'ativo'] })],
        }),
        true,
      );
    }

    // ── presentation_rooms ─────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('presentation_rooms'))) {
      await queryRunner.createTable(
        new Table({
          name: 'presentation_rooms',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'data_evento', type: 'date', isNullable: false },
            { name: 'trabalho_id', type: 'int', isNullable: false },
            { name: 'professor_lider_id', type: 'int', isNullable: false },
            { name: 'fechada', type: 'tinyint', width: 1, default: 0, isNullable: false },
            { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', isNullable: false },
            { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)', isNullable: false },
          ],
          indices: [
            new TableIndex({ columnNames: ['data_evento'] }),
            new TableIndex({ columnNames: ['professor_lider_id'] }),
          ],
          foreignKeys: [
            new TableForeignKey({ columnNames: ['trabalho_id'], referencedTableName: 'evidence_works', referencedColumnNames: ['id'], onDelete: 'RESTRICT' }),
            new TableForeignKey({ columnNames: ['professor_lider_id'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'RESTRICT' }),
          ],
        }),
        true,
      );
    }

    // ── room_professors ────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('room_professors'))) {
      await queryRunner.createTable(
        new Table({
          name: 'room_professors',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'sala_id', type: 'int', isNullable: false },
            { name: 'professor_id', type: 'int', isNullable: false },
            { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', isNullable: false },
          ],
          uniques: [new TableUnique({ columnNames: ['sala_id', 'professor_id'] })],
          indices: [new TableIndex({ columnNames: ['professor_id'] })],
          foreignKeys: [
            new TableForeignKey({ columnNames: ['sala_id'], referencedTableName: 'presentation_rooms', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
            new TableForeignKey({ columnNames: ['professor_id'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'RESTRICT' }),
          ],
        }),
        true,
      );
    }

    // ── room_best_works ────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('room_best_works'))) {
      await queryRunner.createTable(
        new Table({
          name: 'room_best_works',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'sala_id', type: 'int', isNullable: false },
            { name: 'trabalho_id', type: 'int', isNullable: false },
            { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', isNullable: false },
          ],
          uniques: [new TableUnique({ columnNames: ['sala_id'] })],
          foreignKeys: [
            new TableForeignKey({ columnNames: ['sala_id'], referencedTableName: 'presentation_rooms', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
            new TableForeignKey({ columnNames: ['trabalho_id'], referencedTableName: 'evidence_works', referencedColumnNames: ['id'], onDelete: 'RESTRICT' }),
          ],
        }),
        true,
      );
    }

    // ── evaluations ────────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('evaluations'))) {
      await queryRunner.createTable(
        new Table({
          name: 'evaluations',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'trabalho_id', type: 'int', isNullable: false },
            { name: 'professor_id', type: 'int', isNullable: false },
            { name: 'pergunta_id', type: 'int', isNullable: true },
            { name: 'nota', type: 'tinyint', unsigned: true, isNullable: true },
            { name: 'comentario', type: 'text', isNullable: true },
            { name: 'status_apresentacao', type: 'enum', enum: ['Presente', 'Ausente', 'Indeferido'], default: "'Presente'", isNullable: false },
            { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', isNullable: false },
          ],
          indices: [
            new TableIndex({ columnNames: ['trabalho_id', 'professor_id'] }),
            new TableIndex({ columnNames: ['professor_id'] }),
          ],
          foreignKeys: [
            new TableForeignKey({ columnNames: ['trabalho_id'], referencedTableName: 'evidence_works', referencedColumnNames: ['id'], onDelete: 'RESTRICT' }),
            new TableForeignKey({ columnNames: ['professor_id'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'RESTRICT' }),
            new TableForeignKey({ columnNames: ['pergunta_id'], referencedTableName: 'dynamic_questions', referencedColumnNames: ['id'], onDelete: 'SET NULL' }),
          ],
        }),
        true,
      );
    }

    // ── keywords ───────────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('keywords'))) {
      await queryRunner.createTable(
        new Table({
          name: 'keywords',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'palavra', type: 'varchar', length: '500', isNullable: false },
            { name: 'data_agendamento', type: 'date', isNullable: false },
            { name: 'hora_inicio', type: 'time', isNullable: false },
            { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', isNullable: false },
            { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)', isNullable: false },
          ],
          indices: [new TableIndex({ columnNames: ['data_agendamento'] })],
        }),
        true,
      );
    }

    // ── View de ranking ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_evidence_ranking AS
      SELECT
        e.trabalho_id,
        COALESCE((SELECT 5 FROM room_best_works rbw WHERE rbw.trabalho_id = e.trabalho_id LIMIT 1), 0) +
        COALESCE(AVG(CASE WHEN dq.tipo = 'Apresentação' THEN e.nota END), 0) * 2 +
        COALESCE(AVG(CASE WHEN dq.tipo = 'Resumo' THEN e.nota END), 0) * 1 AS score
      FROM evaluations e
      JOIN dynamic_questions dq ON e.pergunta_id = dq.id
      WHERE e.status_apresentacao = 'Presente' AND e.nota IS NOT NULL
      GROUP BY e.trabalho_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS vw_evidence_ranking`);
    await queryRunner.dropTable('evaluations', true);
    await queryRunner.dropTable('room_best_works', true);
    await queryRunner.dropTable('room_professors', true);
    await queryRunner.dropTable('presentation_rooms', true);
    await queryRunner.dropTable('work_groups', true);
    await queryRunner.dropTable('dynamic_questions', true);
    await queryRunner.dropTable('evidence_works', true);
    await queryRunner.dropTable('professor_availabilities', true);
    await queryRunner.dropTable('keywords', true);

    if (await queryRunner.hasColumn('users', 'curso_base')) {
      await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`curso_base\``);
    }
    if (await queryRunner.hasColumn('users', 'registro_funcional')) {
      await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`UQ_users_registro_funcional\``);
      await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`registro_funcional\``);
    }
    if (await queryRunner.hasColumn('users', 'ra')) {
      await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`UQ_users_ra\``);
      await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`ra\``);
    }
  }
}
