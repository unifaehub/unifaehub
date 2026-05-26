-- Itens de menu: Locais de atendimento e Agenda (idempotente).

INSERT INTO menu_nodes (parent_id, `key`, label, icon, route_name, include_in_new_courses)
SELECT NULL, 'care-locations', 'Locais de atendimento', 'location_on', NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM menu_nodes WHERE `key` = 'care-locations');

INSERT INTO menu_nodes (parent_id, `key`, label, icon, route_name, include_in_new_courses)
SELECT NULL, 'appointments', 'Agenda', 'event', NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM menu_nodes WHERE `key` = 'appointments');

INSERT INTO course_menu_nodes (course_id, menu_node_id, enabled, sort_order)
SELECT c.id, mn.id, 1, 45
FROM courses c
JOIN menu_nodes mn ON mn.`key` = 'care-locations'
WHERE c.name LIKE '%Fisioterapia%'
  AND NOT EXISTS (
    SELECT 1 FROM course_menu_nodes cm
    WHERE cm.course_id = c.id AND cm.menu_node_id = mn.id
  );

INSERT INTO course_menu_nodes (course_id, menu_node_id, enabled, sort_order)
SELECT c.id, mn.id, 1, 46
FROM courses c
JOIN menu_nodes mn ON mn.`key` = 'appointments'
WHERE c.name LIKE '%Fisioterapia%'
  AND NOT EXISTS (
    SELECT 1 FROM course_menu_nodes cm
    WHERE cm.course_id = c.id AND cm.menu_node_id = mn.id
  );
