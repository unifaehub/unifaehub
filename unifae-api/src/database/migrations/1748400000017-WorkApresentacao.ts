import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkApresentacao1748400000017 implements MigrationInterface {
  name = 'WorkApresentacao1748400000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasColumn('evidence_works', 'apresentacao_url');
    if (!exists) {
      await queryRunner.query(
        `ALTER TABLE evidence_works ADD COLUMN apresentacao_url VARCHAR(1024) NULL AFTER arquivo_url`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasColumn('evidence_works', 'apresentacao_url');
    if (exists) {
      await queryRunner.query(`ALTER TABLE evidence_works DROP COLUMN apresentacao_url`);
    }
  }
}
