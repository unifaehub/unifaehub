-- Episódios de cuidado do paciente + vínculo em prescrições.
-- Execute manualmente em ambientes com synchronize=false.

CREATE TABLE IF NOT EXISTS `patient_care_episodes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `clinical_case_id` int DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `status` enum('ACTIVE','RESOLVED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `started_at` date NOT NULL,
  `ended_at` date DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_patient_care_episodes_patient_id` (`patient_id`),
  KEY `FK_pce_clinical_case` (`clinical_case_id`),
  CONSTRAINT `FK_pce_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_pce_clinical_case` FOREIGN KEY (`clinical_case_id`) REFERENCES `clinical_cases` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Coluna em prescrições (idempotente se já existir)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prescriptions' AND COLUMN_NAME = 'care_episode_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `prescriptions` ADD COLUMN `care_episode_id` int DEFAULT NULL AFTER `app_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'prescriptions'
    AND CONSTRAINT_NAME = 'FK_prescriptions_care_episode'
);
SET @sql2 := IF(
  @fk_exists = 0,
  'ALTER TABLE `prescriptions` ADD CONSTRAINT `FK_prescriptions_care_episode` FOREIGN KEY (`care_episode_id`) REFERENCES `patient_care_episodes` (`id`) ON DELETE RESTRICT',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

SET @ix_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prescriptions' AND INDEX_NAME = 'IDX_prescriptions_care_episode_id'
);
SET @sql3 := IF(
  @ix_exists = 0,
  'CREATE INDEX `IDX_prescriptions_care_episode_id` ON `prescriptions` (`care_episode_id`)',
  'SELECT 1'
);
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- Episódio legado por paciente sem linha
INSERT INTO `patient_care_episodes` (`patient_id`, `title`, `status`, `started_at`, `created_at`, `updated_at`)
SELECT p.`id`, 'Acompanhamento geral', 'ACTIVE', CURDATE(), NOW(6), NOW(6)
FROM `patients` p
WHERE NOT EXISTS (SELECT 1 FROM `patient_care_episodes` e WHERE e.`patient_id` = p.`id`);

-- Associar prescrições antigas ao primeiro episódio do paciente
UPDATE `prescriptions` rx
INNER JOIN (
  SELECT `patient_id`, MIN(`id`) AS `ep_id` FROM `patient_care_episodes` GROUP BY `patient_id`
) t ON t.`patient_id` = rx.`patient_id`
SET rx.`care_episode_id` = t.`ep_id`
WHERE rx.`care_episode_id` IS NULL;
