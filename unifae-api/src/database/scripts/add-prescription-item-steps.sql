-- Etapas estruturadas do passo a passo por item de prescrição (1 a N).

SET @table_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'prescription_item_steps'
);

SET @sql := IF(
  @table_exists = 0,
  'CREATE TABLE prescription_item_steps (
    id INT NOT NULL AUTO_INCREMENT,
    prescription_item_id INT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_prescription_item_steps_item_sort (prescription_item_id, sort_order),
    CONSTRAINT fk_prescription_item_steps_item
      FOREIGN KEY (prescription_item_id) REFERENCES prescription_items(id)
      ON DELETE CASCADE
  )',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
