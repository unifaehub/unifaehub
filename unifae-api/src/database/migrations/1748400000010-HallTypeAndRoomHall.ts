import { MigrationInterface, QueryRunner } from 'typeorm';

export class HallTypeAndRoomHall1748400000010 implements MigrationInterface {
  name = 'HallTypeAndRoomHall1748400000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Campos tipo_sala e max_trabalhos em presentation_halls ─────────────
    const hasTipo = await queryRunner.hasColumn('presentation_halls', 'tipo_sala');
    if (!hasTipo) {
      await queryRunner.query(`
        ALTER TABLE presentation_halls
          ADD COLUMN tipo_sala ENUM('Geral','Mostra de Jogos','Desenvolvimento Prático','Artigo / TCC','Iniciação Científica')
            NULL DEFAULT NULL AFTER capacidade,
          ADD COLUMN max_trabalhos INT NULL DEFAULT NULL AFTER tipo_sala
      `);
    }

    // ── 2. FK hall_id em presentation_rooms ───────────────────────────────────
    const hasHallId = await queryRunner.hasColumn('presentation_rooms', 'hall_id');
    if (!hasHallId) {
      await queryRunner.query(`
        ALTER TABLE presentation_rooms
          ADD COLUMN hall_id INT NULL DEFAULT NULL AFTER tipo_sala,
          ADD CONSTRAINT fk_pr_hall FOREIGN KEY (hall_id) REFERENCES presentation_halls(id) ON DELETE SET NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE presentation_rooms DROP FOREIGN KEY fk_pr_hall`);
    await queryRunner.query(`ALTER TABLE presentation_rooms DROP COLUMN hall_id`);
    await queryRunner.query(`ALTER TABLE presentation_halls DROP COLUMN max_trabalhos, DROP COLUMN tipo_sala`);
  }
}
