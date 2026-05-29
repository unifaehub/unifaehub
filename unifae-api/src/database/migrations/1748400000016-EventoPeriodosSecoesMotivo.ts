import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventoPeriodosSecoesMotivo1748400000016 implements MigrationInterface {
  name = 'EventoPeriodosSecoesMotivo1748400000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // jornada_config
    const configCols: { name: string; def: string }[] = [
      { name: 'submissao_inicio', def: 'DATE NULL AFTER datas_evento' },
      { name: 'submissao_fim',    def: 'DATE NULL AFTER submissao_inicio' },
      { name: 'avaliacao_inicio', def: 'DATE NULL AFTER submissao_fim' },
      { name: 'avaliacao_fim',    def: 'DATE NULL AFTER avaliacao_inicio' },
      { name: 'secoes_resumo',    def: 'JSON NULL AFTER avaliacao_fim' },
    ];
    for (const col of configCols) {
      const exists = await queryRunner.hasColumn('jornada_config', col.name);
      if (!exists) await queryRunner.query(`ALTER TABLE jornada_config ADD COLUMN ${col.name} ${col.def}`);
    }

    // evidence_works
    const workCols: { name: string; def: string }[] = [
      { name: 'motivo',        def: 'TEXT NULL AFTER referencias' },
      { name: 'resumo_secoes', def: 'JSON NULL AFTER motivo' },
    ];
    for (const col of workCols) {
      const exists = await queryRunner.hasColumn('evidence_works', col.name);
      if (!exists) await queryRunner.query(`ALTER TABLE evidence_works ADD COLUMN ${col.name} ${col.def}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const configCols = ['submissao_inicio','submissao_fim','avaliacao_inicio','avaliacao_fim','secoes_resumo'];
    for (const col of configCols) {
      if (await queryRunner.hasColumn('jornada_config', col)) {
        await queryRunner.query(`ALTER TABLE jornada_config DROP COLUMN ${col}`);
      }
    }
    const workCols = ['motivo','resumo_secoes'];
    for (const col of workCols) {
      if (await queryRunner.hasColumn('evidence_works', col)) {
        await queryRunner.query(`ALTER TABLE evidence_works DROP COLUMN ${col}`);
      }
    }
  }
}
