import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkResumoManual1748400000014 implements MigrationInterface {
  name = 'WorkResumoManual1748400000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE evidence_works
        ADD COLUMN IF NOT EXISTS tipo_submissao    VARCHAR(10)  NULL AFTER integrantes,
        ADD COLUMN IF NOT EXISTS orientador        JSON         NULL AFTER tipo_submissao,
        ADD COLUMN IF NOT EXISTS resumo_introducao TEXT         NULL AFTER orientador,
        ADD COLUMN IF NOT EXISTS resumo_objetivos  TEXT         NULL AFTER resumo_introducao,
        ADD COLUMN IF NOT EXISTS resumo_metodo     TEXT         NULL AFTER resumo_objetivos,
        ADD COLUMN IF NOT EXISTS resumo_resultados TEXT         NULL AFTER resumo_metodo,
        ADD COLUMN IF NOT EXISTS resumo_conclusoes TEXT         NULL AFTER resumo_resultados,
        ADD COLUMN IF NOT EXISTS palavras_chave    VARCHAR(500) NULL AFTER resumo_conclusoes,
        ADD COLUMN IF NOT EXISTS referencias       TEXT         NULL AFTER palavras_chave
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE evidence_works
        DROP COLUMN IF EXISTS tipo_submissao,
        DROP COLUMN IF EXISTS orientador,
        DROP COLUMN IF EXISTS resumo_introducao,
        DROP COLUMN IF EXISTS resumo_objetivos,
        DROP COLUMN IF EXISTS resumo_metodo,
        DROP COLUMN IF EXISTS resumo_resultados,
        DROP COLUMN IF EXISTS resumo_conclusoes,
        DROP COLUMN IF EXISTS palavras_chave,
        DROP COLUMN IF EXISTS referencias
    `);
  }
}
