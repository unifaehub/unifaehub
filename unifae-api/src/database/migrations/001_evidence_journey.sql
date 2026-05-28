-- Migração: Jornada de Evidências
-- Executar uma vez no banco de dados unifae_management

-- 1. Campos adicionados ao users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ra VARCHAR(50) NULL UNIQUE,
  ADD COLUMN IF NOT EXISTS registro_funcional VARCHAR(10) NULL UNIQUE,
  ADD COLUMN IF NOT EXISTS curso_base VARCHAR(200) NULL;

-- 2. Disponibilidade dos professores
CREATE TABLE IF NOT EXISTS professor_availabilities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  professor_id INT NOT NULL,
  data_evento DATE NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_prof_data (professor_id, data_evento),
  INDEX idx_data_evento (data_evento),
  FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Trabalhos (resumos)
CREATE TABLE IF NOT EXISTS evidence_works (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(500) NOT NULL,
  curso_trabalho VARCHAR(200) NOT NULL,
  arquivo_url VARCHAR(1024) NULL,
  status ENUM('Pendente','Aprovado','Reprovado','Inativo') NOT NULL DEFAULT 'Pendente',
  data_submissao DATETIME NOT NULL,
  aluno_id INT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deleted_at DATETIME NULL,
  INDEX idx_status (status),
  INDEX idx_aluno (aluno_id),
  FOREIGN KEY (aluno_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 4. Grupos (aluno <-> trabalho)
CREATE TABLE IF NOT EXISTS work_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id INT NOT NULL,
  trabalho_id INT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_aluno (aluno_id),
  INDEX idx_trabalho (trabalho_id),
  FOREIGN KEY (aluno_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (trabalho_id) REFERENCES evidence_works(id) ON DELETE CASCADE
);

-- 5. Salas de apresentação
CREATE TABLE IF NOT EXISTS presentation_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data_evento DATE NOT NULL,
  trabalho_id INT NOT NULL,
  professor_lider_id INT NOT NULL,
  fechada TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_data (data_evento),
  INDEX idx_lider (professor_lider_id),
  FOREIGN KEY (trabalho_id) REFERENCES evidence_works(id) ON DELETE RESTRICT,
  FOREIGN KEY (professor_lider_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 6. Professores da banca
CREATE TABLE IF NOT EXISTS room_professors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sala_id INT NOT NULL,
  professor_id INT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_sala_prof (sala_id, professor_id),
  INDEX idx_professor (professor_id),
  FOREIGN KEY (sala_id) REFERENCES presentation_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 7. Melhor trabalho da sala
CREATE TABLE IF NOT EXISTS room_best_works (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sala_id INT NOT NULL,
  trabalho_id INT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_sala (sala_id),
  FOREIGN KEY (sala_id) REFERENCES presentation_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (trabalho_id) REFERENCES evidence_works(id) ON DELETE RESTRICT
);

-- 8. Perguntas dinâmicas
CREATE TABLE IF NOT EXISTS dynamic_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  texto_pergunta TEXT NOT NULL,
  tipo ENUM('Resumo','Apresentação') NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_tipo_ativo (tipo, ativo)
);

-- 9. Avaliações
CREATE TABLE IF NOT EXISTS evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trabalho_id INT NOT NULL,
  professor_id INT NOT NULL,
  pergunta_id INT NULL,
  nota TINYINT UNSIGNED NULL,
  comentario TEXT NULL,
  status_apresentacao ENUM('Presente','Ausente','Indeferido') NOT NULL DEFAULT 'Presente',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_trabalho_prof (trabalho_id, professor_id),
  INDEX idx_professor (professor_id),
  FOREIGN KEY (trabalho_id) REFERENCES evidence_works(id) ON DELETE RESTRICT,
  FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (pergunta_id) REFERENCES dynamic_questions(id) ON DELETE SET NULL
);

-- 10. Palavras-chave
CREATE TABLE IF NOT EXISTS keywords (
  id INT AUTO_INCREMENT PRIMARY KEY,
  palavra VARCHAR(500) NOT NULL,
  data_agendamento DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_data (data_agendamento)
);

-- 11. View de ranking
CREATE OR REPLACE VIEW vw_evidence_ranking AS
SELECT
  e.trabalho_id,
  COALESCE((SELECT 5 FROM room_best_works rbw WHERE rbw.trabalho_id = e.trabalho_id LIMIT 1), 0) +
  COALESCE(AVG(CASE WHEN dq.tipo = 'Apresentação' THEN e.nota END), 0) * 2 +
  COALESCE(AVG(CASE WHEN dq.tipo = 'Resumo' THEN e.nota END), 0) * 1 AS score
FROM evaluations e
JOIN dynamic_questions dq ON e.pergunta_id = dq.id
WHERE e.status_apresentacao = 'Presente' AND e.nota IS NOT NULL
GROUP BY e.trabalho_id;
