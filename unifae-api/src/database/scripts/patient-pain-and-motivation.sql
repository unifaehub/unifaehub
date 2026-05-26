-- Registro diário de dor + mensagens motivacionais (Home do app).
-- Execute manualmente em ambientes com synchronize=false.

CREATE TABLE IF NOT EXISTS `patient_pain_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `day` date NOT NULL,
  `reported_at` datetime NOT NULL,
  `level` enum('NONE','MILD','SEVERE') NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_patient_pain_logs_patient_day` (`patient_id`, `day`),
  KEY `IDX_patient_pain_logs_day` (`day`),
  CONSTRAINT `FK_pain_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `motivational_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message` text NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_motivational_messages_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed opcional (idempotente): insere algumas mensagens se a tabela estiver vazia.
INSERT INTO `motivational_messages` (`message`, `active`)
SELECT * FROM (
  SELECT 'Um passo de cada vez: hoje já é progresso.' AS message, 1 AS active UNION ALL
  SELECT 'Seu esforço de hoje é a sua melhora de amanhã.', 1 UNION ALL
  SELECT 'Respire. Ajuste a postura. Continue.', 1 UNION ALL
  SELECT 'Consistência vale mais do que intensidade.', 1
) t
WHERE (SELECT COUNT(*) FROM `motivational_messages`) = 0;

