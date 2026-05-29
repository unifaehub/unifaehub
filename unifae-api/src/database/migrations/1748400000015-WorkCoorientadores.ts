import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkCoorientadores1748400000015 implements MigrationInterface {
  name = 'WorkCoorientadores1748400000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasColumn('evidence_works', 'coorientadores');
    if (!exists) {
      await queryRunner.query(
        `ALTER TABLE evidence_works ADD COLUMN coorientadores JSON NULL AFTER orientador`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasColumn('evidence_works', 'coorientadores');
    if (exists) {
      await queryRunner.query(`ALTER TABLE evidence_works DROP COLUMN coorientadores`);
    }
  }
}
