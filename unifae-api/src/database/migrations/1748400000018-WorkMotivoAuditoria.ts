import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkMotivoAuditoria1748400000018 implements MigrationInterface {
  name = 'WorkMotivoAuditoria1748400000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cols: { name: string; def: string }[] = [
      { name: 'motivo_at',      def: 'DATETIME     NULL AFTER motivo' },
      { name: 'motivo_by_id',   def: 'INT          NULL AFTER motivo_at' },
      { name: 'motivo_by_nome', def: 'VARCHAR(200) NULL AFTER motivo_by_id' },
    ];
    for (const col of cols) {
      const exists = await queryRunner.hasColumn('evidence_works', col.name);
      if (!exists) {
        await queryRunner.query(`ALTER TABLE evidence_works ADD COLUMN ${col.name} ${col.def}`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of ['motivo_at', 'motivo_by_id', 'motivo_by_nome']) {
      if (await queryRunner.hasColumn('evidence_works', col)) {
        await queryRunner.query(`ALTER TABLE evidence_works DROP COLUMN ${col}`);
      }
    }
  }
}
