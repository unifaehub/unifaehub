import { MigrationInterface, QueryRunner } from 'typeorm';

export class HallBloco1748400000012 implements MigrationInterface {
  name = 'HallBloco1748400000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasBloco = await queryRunner.hasColumn('presentation_halls', 'bloco');
    if (!hasBloco) {
      await queryRunner.query(`
        ALTER TABLE presentation_halls
          ADD COLUMN bloco VARCHAR(50) NULL DEFAULT NULL AFTER andar
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE presentation_halls DROP COLUMN IF EXISTS bloco`);
  }
}
