-- Especialidades do usuário coordenador/profissional.
-- A API garante no cadastro/edição que apenas uma especialidade por usuário fique com is_primary = 1.

SET @table_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_specialties'
);

SET @sql := IF(
  @table_exists = 0,
  'CREATE TABLE user_specialties (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    is_primary TINYINT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_user_specialties_user_id (user_id),
    INDEX idx_user_specialties_user_sort (user_id, sort_order),
    CONSTRAINT fk_user_specialties_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
  )',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
