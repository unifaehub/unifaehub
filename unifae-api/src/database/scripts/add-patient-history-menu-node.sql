-- Nó global «patient-history» + vínculo ao curso cujo nome contém «Fisioterapia».
-- Use se a base já existir e você não for rodar seed:full.
-- Ajuste o filtro do curso se o nome for diferente.

INSERT INTO `menu_nodes` (`parent_id`, `key`, `label`, `icon`, `route_name`, `include_in_new_courses`)
SELECT NULL, 'patient-history', 'História do paciente', 'auto_stories', NULL, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `menu_nodes` n WHERE n.`key` = 'patient-history');

INSERT INTO `course_menu_nodes` (`course_id`, `menu_node_id`, `enabled`, `sort_order`)
SELECT c.`id`, n.`id`, 1, 27
FROM `courses` c
CROSS JOIN `menu_nodes` n
WHERE n.`key` = 'patient-history'
  AND c.`name` LIKE '%Fisioterapia%'
  AND NOT EXISTS (
    SELECT 1 FROM `course_menu_nodes` z
    WHERE z.`course_id` = c.`id` AND z.`menu_node_id` = n.`id`
  );
