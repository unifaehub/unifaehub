-- Quem aprovou/rejeitou prescrição e quando (timeline / histórico).
-- Execute em ambientes com synchronize=false.

SET @col1 := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prescriptions' AND COLUMN_NAME = 'decided_at'
);
SET @sql1 := IF(
  @col1 = 0,
  'ALTER TABLE `prescriptions` ADD COLUMN `decided_at` datetime(6) DEFAULT NULL AFTER `created_at`',
  'SELECT 1'
);
PREPARE s1 FROM @sql1;
EXECUTE s1;
DEALLOCATE PREPARE s1;

SET @col2 := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prescriptions' AND COLUMN_NAME = 'decided_by_id'
);
SET @sql2 := IF(
  @col2 = 0,
  'ALTER TABLE `prescriptions` ADD COLUMN `decided_by_id` int DEFAULT NULL AFTER `decided_at`',
  'SELECT 1'
);
PREPARE s2 FROM @sql2;
EXECUTE s2;
DEALLOCATE PREPARE s2;

SET @fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'prescriptions'
    AND CONSTRAINT_NAME = 'FK_prescriptions_decided_by'
);
SET @sql3 := IF(
  @fk = 0,
  'ALTER TABLE `prescriptions` ADD CONSTRAINT `FK_prescriptions_decided_by` FOREIGN KEY (`decided_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE s3 FROM @sql3;
EXECUTE s3;
DEALLOCATE PREPARE s3;
