-- Locais e agendas de exemplo para testes do app (idempotente).

INSERT INTO care_locations (app_id, name, address, notes, active)
SELECT 1, 'Clínica UNIFAE — Bloco B', 'Campus UNIFAE, Av. Exemplo, 100 — Sala 12, São José dos Campos/SP', 'Recepção no térreo.', 1
WHERE NOT EXISTS (
  SELECT 1 FROM care_locations WHERE app_id = 1 AND name = 'Clínica UNIFAE — Bloco B'
);

INSERT INTO course_care_locations (course_id, care_location_id)
SELECT c.id, cl.id
FROM courses c
JOIN care_locations cl ON cl.app_id = c.app_id AND cl.name = 'Clínica UNIFAE — Bloco B'
WHERE c.name LIKE '%Fisioterapia%'
  AND NOT EXISTS (
    SELECT 1 FROM course_care_locations x
    WHERE x.course_id = c.id AND x.care_location_id = cl.id
  );

INSERT INTO patient_appointments (
  patient_id,
  app_id,
  course_id,
  professional_user_id,
  created_by_user_id,
  scheduled_at,
  duration_minutes,
  modality,
  care_location_id,
  meet_url,
  status,
  notes
)
SELECT
  p.id,
  p.app_id,
  p.course_id,
  COALESCE(p.professor_id, p.student_id),
  COALESCE(p.professor_id, p.student_id),
  DATE_ADD(NOW(), INTERVAL 3 DAY),
  50,
  'IN_PERSON',
  cl.id,
  NULL,
  'SCHEDULED',
  'Consulta presencial de exemplo.'
FROM patients p
JOIN users u ON u.id = p.user_id AND u.deleted_at IS NULL
JOIN care_locations cl ON cl.app_id = p.app_id AND cl.active = 1
WHERE u.email = 'paciente1@unifae.local'
  AND NOT EXISTS (
    SELECT 1 FROM patient_appointments a
    WHERE a.patient_id = p.id
      AND a.modality = 'IN_PERSON'
      AND a.status = 'SCHEDULED'
      AND a.scheduled_at > NOW()
  )
LIMIT 1;

INSERT INTO patient_appointments (
  patient_id,
  app_id,
  course_id,
  professional_user_id,
  created_by_user_id,
  scheduled_at,
  duration_minutes,
  modality,
  care_location_id,
  meet_url,
  status,
  notes
)
SELECT
  p.id,
  p.app_id,
  p.course_id,
  COALESCE(p.professor_id, p.student_id),
  COALESCE(p.professor_id, p.student_id),
  DATE_ADD(NOW(), INTERVAL 5 DAY),
  50,
  'ONLINE',
  NULL,
  'https://meet.google.com/demo-unifae-care',
  'SCHEDULED',
  'Teleconsulta de exemplo (substitua por Meet real via integração Google).'
FROM patients p
JOIN users u ON u.id = p.user_id AND u.deleted_at IS NULL
WHERE u.email = 'paciente1@unifae.local'
  AND NOT EXISTS (
    SELECT 1 FROM patient_appointments a
    WHERE a.patient_id = p.id
      AND a.modality = 'ONLINE'
      AND a.status = 'SCHEDULED'
      AND a.scheduled_at > NOW()
  )
LIMIT 1;
