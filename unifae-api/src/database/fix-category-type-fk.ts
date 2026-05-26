/**
 * Corrige referências inválidas em `categories.category_type_definition_id` antes do
 * TypeORM aplicar a FK para `category_type_definitions`.
 *
 * Tipos são por `course_id`. Este script insere tipos padrão por curso e remapeia IDs órfãos.
 *
 *   npm run fix:category-types
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';

const DEFAULT_TYPES: Array<{ key: string; label: string; sortOrder: number }> = [
  { key: 'eixo', label: 'Eixo', sortOrder: 0 },
  { key: 'problema', label: 'Problema / quadro clínico', sortOrder: 10 },
  { key: 'objetivo', label: 'Objetivo terapêutico', sortOrder: 20 },
  { key: 'nivel', label: 'Nível / progressão', sortOrder: 30 },
];

async function main() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'unifae_management',
  });
  await ds.initialize();

  const db = process.env.DB_NAME ?? 'unifae_management';

  const [{ cnt: catCnt }] = await ds.query<{ cnt: string }[]>(
    `SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'categories'`,
    [db],
  );
  if (Number(catCnt) === 0) {
    console.log('Tabela categories não existe; nada a fazer.');
    await ds.destroy();
    return;
  }
  const [{ cnt: defCnt }] = await ds.query<{ cnt: string }[]>(
    `SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'category_type_definitions'`,
    [db],
  );
  if (Number(defCnt) === 0) {
    console.error(
      'A tabela category_type_definitions ainda não existe. Crie o schema (ex.: suba a API uma vez com synchronize) e rode este script de novo.',
    );
    await ds.destroy();
    process.exit(1);
  }

  const courseRows = await ds.query<{ course_id: number }[]>(
    `SELECT DISTINCT course_id FROM categories WHERE course_id IS NOT NULL`,
  );
  for (const { course_id } of courseRows) {
    for (const t of DEFAULT_TYPES) {
      await ds.query(
        `INSERT IGNORE INTO category_type_definitions (course_id, \`key\`, label, description, sort_order)
         VALUES (?, ?, ?, NULL, ?)`,
        [course_id, t.key, t.label, t.sortOrder],
      );
    }
  }

  const orphans = await ds.query<
    { id: number; course_id: number; category_type_definition_id: number }[]
  >(
    `SELECT c.id, c.course_id, c.category_type_definition_id
     FROM categories c
     LEFT JOIN category_type_definitions d ON d.id = c.category_type_definition_id
     WHERE d.id IS NULL`,
  );

  if (orphans.length === 0) {
    console.log('Nenhuma categoria com category_type_definition_id órfão. OK.');
    await ds.destroy();
    return;
  }

  console.log(`Encontradas ${orphans.length} categorias com FK inválida; corrigindo…`);

  const defsByCourse = new Map<number, { id: number; sort_order: number }[]>();
  async function loadDefs(courseId: number) {
    if (defsByCourse.has(courseId)) return defsByCourse.get(courseId)!;
    const rows = await ds.query<{ id: number; sort_order: number }[]>(
      `SELECT id, sort_order FROM category_type_definitions WHERE course_id = ? ORDER BY sort_order ASC, id ASC`,
      [courseId],
    );
    defsByCourse.set(courseId, rows);
    return rows;
  }

  let fixed = 0;
  for (const row of orphans) {
    const courseId = row.course_id;
    if (!courseId) {
      console.warn(`Categoria id=${row.id}: sem course_id; ignorada.`);
      continue;
    }
    for (const t of DEFAULT_TYPES) {
      await ds.query(
        `INSERT IGNORE INTO category_type_definitions (course_id, \`key\`, label, description, sort_order)
         VALUES (?, ?, ?, NULL, ?)`,
        [courseId, t.key, t.label, t.sortOrder],
      );
    }
    defsByCourse.delete(courseId);

    const defs = await loadDefs(courseId);
    if (defs.length === 0) {
      console.warn(`Categoria id=${row.id}: curso ${courseId} sem tipos; ignorada.`);
      continue;
    }

    const raw = row.category_type_definition_id;
    let idx = 0;
    if (raw >= 1 && raw <= 4) idx = raw - 1;
    else if (raw >= 0 && raw < defs.length) idx = raw;
    if (idx >= defs.length) idx = 0;

    const newId = defs[idx]!.id;
    await ds.query(`UPDATE categories SET category_type_definition_id = ? WHERE id = ?`, [newId, row.id]);
    fixed++;
  }

  console.log(`Atualizadas ${fixed} categorias. Você pode subir a API com synchronize novamente.`);
  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
