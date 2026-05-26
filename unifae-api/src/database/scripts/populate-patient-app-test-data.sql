-- Popula dados mínimos para testar o app do paciente.
-- Objetivo:
-- 1) Garantir que usuários PATIENT tenham linha em patients (quando houver aluno responsável no mesmo contexto).
-- 2) Garantir episódio ativo de cuidado.
-- 3) Garantir exercícios ativos no contexto app/curso.
-- 4) Garantir prescrição APPROVED e itens de exercício para todos os pacientes.

-- Diagnóstico antes
SELECT
  'PATIENT_USERS_WITHOUT_PATIENT_ROW' AS check_name,
  COUNT(*) AS total
FROM users u
LEFT JOIN patients p ON p.user_id = u.id
WHERE u.role = 'PATIENT'
  AND u.deleted_at IS NULL
  AND p.id IS NULL;

SELECT
  'PATIENTS_WITHOUT_APPROVED_PRESCRIPTION' AS check_name,
  COUNT(*) AS total
FROM patients p
JOIN users u ON u.id = p.user_id
WHERE u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM prescriptions rx
    WHERE rx.patient_id = p.id
      AND rx.status = 'APPROVED'
  );

SELECT
  'APPROVED_PRESCRIPTIONS_WITHOUT_ITEMS' AS check_name,
  COUNT(*) AS total
FROM prescriptions rx
WHERE rx.status = 'APPROVED'
  AND NOT EXISTS (
    SELECT 1
    FROM prescription_items pi
    WHERE pi.prescription_id = rx.id
  );

-- Cria linha em patients para usuários PATIENT sem cadastro clínico.
-- Só cria quando há STUDENT ativo no mesmo app/curso.
INSERT INTO patients (
  user_id,
  student_id,
  professor_id,
  course_id,
  app_id,
  latest_risk_level
)
SELECT
  u.id AS user_id,
  (
    SELECT st.id
    FROM users st
    WHERE st.role = 'STUDENT'
      AND st.active = 1
      AND st.deleted_at IS NULL
      AND st.app_id = u.app_id
      AND st.course_id = u.course_id
    ORDER BY st.id
    LIMIT 1
  ) AS student_id,
  (
    SELECT pr.id
    FROM users pr
    WHERE pr.role = 'PROFESSOR'
      AND pr.active = 1
      AND pr.deleted_at IS NULL
      AND pr.app_id = u.app_id
      AND pr.course_id = u.course_id
    ORDER BY pr.id
    LIMIT 1
  ) AS professor_id,
  u.course_id,
  u.app_id,
  'PENDING'
FROM users u
WHERE u.role = 'PATIENT'
  AND u.active = 1
  AND u.deleted_at IS NULL
  AND u.app_id IS NOT NULL
  AND u.course_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM patients p
    WHERE p.user_id = u.id
  )
  AND EXISTS (
    SELECT 1
    FROM users st
    WHERE st.role = 'STUDENT'
      AND st.active = 1
      AND st.deleted_at IS NULL
      AND st.app_id = u.app_id
      AND st.course_id = u.course_id
  );

-- Cria episódio ativo para pacientes sem episódio ACTIVE.
INSERT INTO patient_care_episodes (
  patient_id,
  clinical_case_id,
  title,
  description,
  status,
  started_at,
  ended_at,
  created_at,
  updated_at
)
SELECT
  p.id,
  NULL,
  'Acompanhamento de teste do app',
  'Episódio criado para testes do aplicativo do paciente.',
  'ACTIVE',
  CURDATE(),
  NULL,
  NOW(6),
  NOW(6)
FROM patients p
WHERE NOT EXISTS (
  SELECT 1
  FROM patient_care_episodes ep
  WHERE ep.patient_id = p.id
    AND ep.status = 'ACTIVE'
);

-- Garante três exercícios ativos por contexto app/curso dos pacientes.
INSERT INTO exercises (
  name,
  description,
  instructions,
  video_url,
  created_by,
  course_id,
  app_id,
  active,
  created_at,
  updated_at
)
SELECT
  tpl.name,
  tpl.description,
  tpl.instructions,
  tpl.video_url,
  ctx.created_by,
  ctx.course_id,
  ctx.app_id,
  1,
  NOW(6),
  NOW(6)
FROM (
  SELECT
    p.course_id,
    p.app_id,
    COALESCE(MIN(p.professor_id), MIN(p.student_id)) AS created_by
  FROM patients p
  GROUP BY p.course_id, p.app_id
) ctx
JOIN (
  SELECT
    'Teste app - Mobilidade cervical' AS name,
    'Exercício de mobilidade leve para testes do app.' AS description,
    'Realize movimentos lentos, sem ultrapassar o limite de conforto.' AS instructions,
    'https://www.youtube.com/watch?v=ysz5S6PUM-U' AS video_url
  UNION ALL
  SELECT
    'Teste app - Ponte de glúteos',
    'Fortalecimento leve de cadeia posterior para testes do app.',
    'Eleve o quadril mantendo respiração controlada.',
    'https://www.youtube.com/watch?v=ysz5S6PUM-U'
  UNION ALL
  SELECT
    'Teste app - Alongamento posterior',
    'Alongamento leve para testes do app.',
    'Mantenha a posição por alguns segundos sem dor intensa.',
    'https://www.youtube.com/watch?v=ysz5S6PUM-U'
) tpl
WHERE ctx.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM exercises e
    WHERE e.course_id = ctx.course_id
      AND e.app_id = ctx.app_id
      AND e.name = tpl.name
  );

-- Se houver árvore de categorias com folha, vincula exercícios de teste à primeira folha do contexto.
INSERT INTO exercise_categories (exercise_id, category_id)
SELECT
  e.id,
  (
    SELECT c.id
    FROM categories c
    WHERE c.course_id = e.course_id
      AND c.app_id = e.app_id
      AND c.is_leaf_level = 1
    ORDER BY c.sort_order, c.id
    LIMIT 1
  ) AS category_id
FROM exercises e
WHERE e.name IN (
    'Teste app - Mobilidade cervical',
    'Teste app - Ponte de glúteos',
    'Teste app - Alongamento posterior'
  )
  AND EXISTS (
    SELECT 1
    FROM categories c
    WHERE c.course_id = e.course_id
      AND c.app_id = e.app_id
      AND c.is_leaf_level = 1
  )
  AND NOT EXISTS (
    SELECT 1
    FROM exercise_categories ec
    WHERE ec.exercise_id = e.id
  );

-- Cria prescrição aprovada para pacientes sem nenhuma APPROVED.
INSERT INTO prescriptions (
  patient_id,
  student_id,
  professor_id,
  status,
  justification,
  next_visit_date,
  app_id,
  care_episode_id,
  created_at,
  decided_at,
  decided_by_id
)
SELECT
  p.id,
  p.student_id,
  p.professor_id,
  'APPROVED',
  'Prescrição criada para testes do app do paciente.',
  DATE_ADD(NOW(), INTERVAL 7 DAY),
  p.app_id,
  (
    SELECT ep.id
    FROM patient_care_episodes ep
    WHERE ep.patient_id = p.id
      AND ep.status = 'ACTIVE'
    ORDER BY ep.started_at DESC, ep.id DESC
    LIMIT 1
  ) AS care_episode_id,
  NOW(6),
  NOW(),
  COALESCE(p.professor_id, p.student_id)
FROM patients p
JOIN users u ON u.id = p.user_id
WHERE u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM prescriptions rx
    WHERE rx.patient_id = p.id
      AND rx.status = 'APPROVED'
  );

DROP TEMPORARY TABLE IF EXISTS tmp_latest_approved_prescriptions;
DROP TEMPORARY TABLE IF EXISTS tmp_prescription_item_counts;

CREATE TEMPORARY TABLE tmp_latest_approved_prescriptions AS
SELECT prescription_id, patient_id
FROM (
  SELECT
    rx.id AS prescription_id,
    rx.patient_id,
    ROW_NUMBER() OVER (
      PARTITION BY rx.patient_id
      ORDER BY rx.decided_at DESC, rx.created_at DESC, rx.id DESC
    ) AS rn
  FROM prescriptions rx
  WHERE rx.status = 'APPROVED'
) ranked
WHERE rn = 1;

CREATE TEMPORARY TABLE tmp_prescription_item_counts AS
SELECT
  lap.prescription_id,
  COUNT(pi.id) AS item_count
FROM tmp_latest_approved_prescriptions lap
LEFT JOIN prescription_items pi ON pi.prescription_id = lap.prescription_id
GROUP BY lap.prescription_id;

-- Completa a prescrição aprovada atual até ter pelo menos três exercícios.
-- Não duplica exercício já presente na mesma prescrição.
INSERT INTO prescription_items (
  prescription_id,
  exercise_id,
  instructions,
  repetitions,
  notes
)
SELECT
  x.prescription_id,
  x.exercise_id,
  CASE x.target_position
    WHEN 1 THEN 'Realizar conforme demonstrado no vídeo, respeitando o limite de dor.'
    WHEN 2 THEN 'Manter respiração controlada durante toda a execução.'
    ELSE 'Executar devagar e interromper em caso de dor intensa.'
  END AS instructions,
  CASE x.target_position
    WHEN 1 THEN '3x10'
    WHEN 2 THEN '3x20'
    ELSE '2x30s'
  END AS repetitions,
  CASE x.target_position
    WHEN 1 THEN 'Teste inicial do app.'
    WHEN 2 THEN 'Observar qualidade do movimento.'
    ELSE 'Alongamento leve para fechamento da sessão.'
  END AS notes
FROM (
  SELECT
    lap.prescription_id,
    e.id AS exercise_id,
    existing.item_count,
    ROW_NUMBER() OVER (
      PARTITION BY lap.prescription_id
      ORDER BY
        CASE WHEN e.name LIKE 'Teste app - %' THEN 0 ELSE 1 END,
        e.id
    ) AS rn,
    existing.item_count + ROW_NUMBER() OVER (
      PARTITION BY lap.prescription_id
      ORDER BY
        CASE WHEN e.name LIKE 'Teste app - %' THEN 0 ELSE 1 END,
        e.id
    ) AS target_position
  FROM tmp_latest_approved_prescriptions lap
  JOIN patients p ON p.id = lap.patient_id
  JOIN tmp_prescription_item_counts existing ON existing.prescription_id = lap.prescription_id
  JOIN exercises e ON e.course_id = p.course_id
    AND e.app_id = p.app_id
    AND e.active = 1
  WHERE existing.item_count < 3
    AND NOT EXISTS (
    SELECT 1
    FROM prescription_items pi
    WHERE pi.prescription_id = lap.prescription_id
      AND pi.exercise_id = e.id
  )
) x
WHERE x.rn <= (3 - x.item_count);

DROP TEMPORARY TABLE IF EXISTS tmp_latest_approved_prescriptions;
DROP TEMPORARY TABLE IF EXISTS tmp_prescription_item_counts;

-- Etapas estruturadas (passo a passo) para itens de prescrições aprovadas sem etapas.
INSERT INTO prescription_item_steps (prescription_item_id, sort_order, description)
SELECT pi.id, s.sort_order, s.description
FROM prescription_items pi
INNER JOIN prescriptions rx ON rx.id = pi.prescription_id AND rx.status = 'APPROVED'
CROSS JOIN (
  SELECT 1 AS sort_order, 'Assista ao vídeo e memorize a posição inicial.' AS description
  UNION ALL
  SELECT 2, 'Execute o movimento com controle, sem compensar com outras articulações.'
  UNION ALL
  SELECT 3, 'Mantenha a respiração ritmada e interrompa se sentir dor forte.'
) s
WHERE NOT EXISTS (
  SELECT 1
  FROM prescription_item_steps pis
  WHERE pis.prescription_item_id = pi.id
);

UPDATE prescription_items pi
INNER JOIN prescriptions rx ON rx.id = pi.prescription_id AND rx.status = 'APPROVED'
SET pi.instructions = CONCAT(
  '1. Assista ao vídeo e memorize a posição inicial.\n',
  '2. Execute o movimento com controle, sem compensar com outras articulações.\n',
  '3. Mantenha a respiração ritmada e interrompa se sentir dor forte.'
)
WHERE EXISTS (
  SELECT 1
  FROM prescription_item_steps pis
  WHERE pis.prescription_item_id = pi.id
)
AND (
  pi.instructions IS NULL
  OR TRIM(pi.instructions) = ''
  OR pi.instructions NOT LIKE '1.%'
);

-- Garante mensagens motivacionais caso a base esteja vazia.
INSERT INTO motivational_messages (message, active)
SELECT 'Um passo de cada vez: hoje já é progresso.', 1
WHERE NOT EXISTS (SELECT 1 FROM motivational_messages);

-- Diagnóstico depois
SELECT
  u.id AS user_id,
  u.name AS patient_name,
  p.id AS patient_id,
  rx.id AS approved_prescription_id,
  COUNT(pi.id) AS exercise_items
FROM users u
LEFT JOIN patients p ON p.user_id = u.id
LEFT JOIN prescriptions rx ON rx.patient_id = p.id
  AND rx.status = 'APPROVED'
  AND rx.id = (
    SELECT rx2.id
    FROM prescriptions rx2
    WHERE rx2.patient_id = p.id
      AND rx2.status = 'APPROVED'
    ORDER BY rx2.decided_at DESC, rx2.created_at DESC, rx2.id DESC
    LIMIT 1
  )
LEFT JOIN prescription_items pi ON pi.prescription_id = rx.id
WHERE u.role = 'PATIENT'
  AND u.deleted_at IS NULL
GROUP BY u.id, u.name, p.id, rx.id
ORDER BY u.id;

-- Pacientes que ainda exigem atenção manual, normalmente por falta de STUDENT no mesmo app/curso.
SELECT
  u.id,
  u.name,
  u.email,
  u.app_id,
  u.course_id
FROM users u
LEFT JOIN patients p ON p.user_id = u.id
WHERE u.role = 'PATIENT'
  AND u.deleted_at IS NULL
  AND p.id IS NULL;
