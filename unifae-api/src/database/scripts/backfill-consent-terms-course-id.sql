-- Rodar uma vez no MySQL se `consent_terms` já existia antes do vínculo com `courses`
-- (evita FK inválida: course_id 0, NULL sem backfill, etc.).
--
-- Se a coluna `course_id` ainda não existir, ignore o passo 1 e suba a API (sync) antes do passo 2.
--
-- 1) Remove referências inválidas (ex.: 0 após sync parcial)
UPDATE consent_terms
SET course_id = NULL
WHERE course_id IS NOT NULL
  AND course_id NOT IN (SELECT id FROM courses);

-- 2) Preenche pelo primeiro curso ativo do mesmo app (ajuste se um app tiver vários cursos)
UPDATE consent_terms ct
INNER JOIN (
  SELECT app_id, MIN(id) AS cid
  FROM courses
  WHERE active = 1
  GROUP BY app_id
) x ON x.app_id = ct.app_id
SET ct.course_id = x.cid
WHERE ct.course_id IS NULL;
