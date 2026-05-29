import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkIntegrantes1748400000013 implements MigrationInterface {
  name = 'WorkIntegrantes1748400000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasCol = await queryRunner.hasColumn('evidence_works', 'integrantes');
    if (!hasCol) {
      await queryRunner.query(`
        ALTER TABLE evidence_works
          ADD COLUMN integrantes JSON NULL DEFAULT NULL AFTER aluno_id
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE evidence_works DROP COLUMN IF EXISTS integrantes`);
  }
}
