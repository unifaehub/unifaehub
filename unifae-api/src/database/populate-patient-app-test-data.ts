/**
 * Executa a população de dados mínimos para testes do app do paciente.
 *
 *   npm run populate:app-test-data
 */
import 'dotenv/config';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { DataSource } from 'typeorm';

function stripSqlComments(sql: string): string {
  return sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

function splitStatements(sql: string): string[] {
  return stripSqlComments(sql)
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function printResult(statement: string, result: unknown) {
  const firstLine = statement.split(/\r?\n/).find((line) => line.trim())?.trim() ?? statement;
  const title = firstLine.length > 100 ? `${firstLine.slice(0, 97)}...` : firstLine;

  if (Array.isArray(result)) {
    if (result.length > 0) {
      console.log(`\n> ${title}`);
      console.table(result);
    }
    return;
  }

  if (result && typeof result === 'object') {
    const packet = result as { affectedRows?: number; changedRows?: number; warningStatus?: number };
    if (packet.affectedRows !== undefined || packet.changedRows !== undefined || packet.warningStatus) {
      console.log(
        `> ${title} | affected=${packet.affectedRows ?? 0} changed=${packet.changedRows ?? 0} warnings=${packet.warningStatus ?? 0}`,
      );
    }
  }
}

async function main() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'unifae_management',
  });

  const scriptPaths = [
    join(__dirname, 'scripts', 'add-prescription-item-steps.sql'),
    join(__dirname, 'scripts', 'add-care-appointments.sql'),
    join(__dirname, 'scripts', 'populate-patient-app-test-data.sql'),
    join(__dirname, 'scripts', 'populate-care-appointments-sample.sql'),
    join(__dirname, 'scripts', 'add-menu-care-appointments.sql'),
  ];

  console.log(`Conectando em ${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '3306'} / ${process.env.DB_NAME ?? 'unifae_management'}`);
  await ds.initialize();

  try {
    for (const sqlPath of scriptPaths) {
      const sql = await readFile(sqlPath, 'utf8');
      const statements = splitStatements(sql);
      console.log(`\nExecutando ${sqlPath.split(/[/\\]/).pop()} (${statements.length} comandos)…`);
      for (const statement of statements) {
        const result = await ds.query(statement);
        printResult(statement, result);
      }
    }
    console.log('\nPopulação de dados do app concluída.');
  } finally {
    await ds.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('Falha ao popular dados de teste do app.');
  console.error(error);
  process.exit(1);
});
