-- Métricas de dor/esforço pós-exercício e momento do envio do feedback (app paciente).
-- Execute no MySQL após deploy da API que usa estas colunas.

ALTER TABLE patient_executions
  ADD COLUMN post_exercise_score SMALLINT NULL COMMENT 'Escala 0,2,5,8,10 após execução'
    AFTER feedback,
  ADD COLUMN feedback_recorded_at DATETIME NULL COMMENT 'Quando o paciente enviou o feedback'
    AFTER post_exercise_score;
