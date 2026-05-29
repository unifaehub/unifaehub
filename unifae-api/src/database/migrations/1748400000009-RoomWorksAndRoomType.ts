import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoomWorksAndRoomType1748400000009 implements MigrationInterface {
  name = 'RoomWorksAndRoomType1748400000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Adicionar tipo_sala em presentation_rooms ──────────────────────────
    const hasTipo = await queryRunner.hasColumn('presentation_rooms', 'tipo_sala');
    if (!hasTipo) {
      await queryRunner.query(`
        ALTER TABLE presentation_rooms
          ADD COLUMN tipo_sala ENUM('Geral','Mostra de Jogos','Desenvolvimento Prático','Artigo / TCC','Iniciação Científica')
            NULL DEFAULT 'Geral' AFTER data_evento
      `);
    }

    // ── 2. Criar tabela room_works ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS room_works (
        id           INT          NOT NULL AUTO_INCREMENT,
        sala_id      INT          NOT NULL,
        trabalho_id  INT          NOT NULL,
        ordem        INT          NOT NULL DEFAULT 1,
        created_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_room_work (sala_id, trabalho_id),
        INDEX idx_rw_sala (sala_id),
        INDEX idx_rw_trabalho (trabalho_id),
        CONSTRAINT fk_rw_sala    FOREIGN KEY (sala_id)     REFERENCES presentation_rooms(id) ON DELETE CASCADE,
        CONSTRAINT fk_rw_trab    FOREIGN KEY (trabalho_id) REFERENCES evidence_works(id)     ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 3. Migrar dados existentes: criar room_works a partir de trabalho_id ──
    await queryRunner.query(`
      INSERT IGNORE INTO room_works (sala_id, trabalho_id, ordem)
      SELECT id, trabalho_id, 1
        FROM presentation_rooms
       WHERE trabalho_id IS NOT NULL
    `);

    // ── 4. Tornar trabalho_id nullable (coluna legada — room_works é autoritativo) ──
    const hasTrabId = await queryRunner.hasColumn('presentation_rooms', 'trabalho_id');
    if (hasTrabId) {
      await queryRunner.query(`
        ALTER TABLE presentation_rooms
          MODIFY COLUMN trabalho_id INT NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS room_works`);
    await queryRunner.query(`
      ALTER TABLE presentation_rooms
        DROP COLUMN IF EXISTS tipo_sala,
        MODIFY COLUMN trabalho_id INT NOT NULL
    `);
  }
}
