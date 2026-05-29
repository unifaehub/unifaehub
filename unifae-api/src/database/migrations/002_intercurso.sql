-- ============================================================
-- Migration 002 — Módulo Intercurso
-- Executar manualmente no banco antes de iniciar a API.
-- ============================================================

-- 1. Configuração do evento
CREATE TABLE IF NOT EXISTS `intercurso_config` (
  `id`                INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `evento_nome`       VARCHAR(200)  NULL,
  `evento_local`      VARCHAR(500)  NULL,
  `edicao`            VARCHAR(100)  NULL,
  `descricao`         TEXT          NULL,
  `datas_evento`      TEXT          NULL COMMENT 'CSV de datas YYYY-MM-DD',
  `inscricao_inicio`  DATE          NULL,
  `inscricao_fim`     DATE          NULL,
  `certificado_url`   VARCHAR(1024) NULL,
  `created_at`        DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`        DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Garante registro único de configuração
INSERT IGNORE INTO `intercurso_config` (`id`) VALUES (1);

-- 2. Modalidades
CREATE TABLE IF NOT EXISTS `intercurso_modalidades` (
  `id`          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `nome`        VARCHAR(200) NOT NULL,
  `descricao`   TEXT         NULL,
  `max_equipes` INT          NULL,
  `max_membros` INT          NOT NULL DEFAULT 5,
  `ativo`       TINYINT(1)   NOT NULL DEFAULT 1,
  `ordem`       INT          NOT NULL DEFAULT 0,
  `created_at`  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Equipes
CREATE TABLE IF NOT EXISTS `intercurso_equipes` (
  `id`                  INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `nome`                VARCHAR(200)  NOT NULL,
  `curso_representante` VARCHAR(200)  NOT NULL,
  `modalidade_id`       INT           NOT NULL,
  `status`              ENUM('Pendente','Aprovada','Reprovada','Inativa') NOT NULL DEFAULT 'Pendente',
  `membros`             JSON          NULL,
  `motivo`              TEXT          NULL,
  `email_contato`       VARCHAR(255)  NULL,
  `created_at`          DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`          DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at`          DATETIME      NULL,
  CONSTRAINT `fk_equipe_modalidade` FOREIGN KEY (`modalidade_id`) REFERENCES `intercurso_modalidades` (`id`) ON DELETE RESTRICT,
  INDEX `idx_equipe_status` (`status`),
  INDEX `idx_equipe_modalidade` (`modalidade_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Resultados
CREATE TABLE IF NOT EXISTS `intercurso_resultados` (
  `id`            INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `equipe_id`     INT           NOT NULL,
  `modalidade_id` INT           NOT NULL,
  `posicao`       INT           NULL,
  `pontuacao`     DECIMAL(6,2)  NULL,
  `observacao`    TEXT          NULL,
  `created_at`    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT `fk_resultado_equipe`     FOREIGN KEY (`equipe_id`)     REFERENCES `intercurso_equipes`     (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_resultado_modalidade` FOREIGN KEY (`modalidade_id`) REFERENCES `intercurso_modalidades` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_resultado_equipe_modalidade` (`equipe_id`, `modalidade_id`),
  INDEX `idx_resultado_modalidade` (`modalidade_id`),
  INDEX `idx_resultado_equipe`     (`equipe_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Palavras-chave (mesma estrutura da tabela keywords da Jornada)
CREATE TABLE IF NOT EXISTS `intercurso_keywords` (
  `id`               INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `palavra`          VARCHAR(500) NOT NULL,
  `data_agendamento` DATE         NOT NULL,
  `hora_inicio`      TIME         NOT NULL,
  `created_at`       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX `idx_kw_data` (`data_agendamento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
